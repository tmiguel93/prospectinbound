import { Router } from 'express';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { audit } from '../audit/audit.service.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { sendWhatsappMessageSchema } from './whatsapp.schemas.js';
import {
  normalizeWhatsappNumber,
  sendWhatsappText,
  verifyWebhookSignature,
  whatsappConfiguration
} from './whatsapp.service.js';

export const whatsappRouter = Router();

whatsappRouter.get('/webhook', (request, response) => {
  const mode = request.query['hub.mode'];
  const token = request.query['hub.verify_token'];
  const challenge = request.query['hub.challenge'];
  if (mode === 'subscribe' && token === env.whatsapp.verifyToken && typeof challenge === 'string') {
    response.status(200).send(challenge);
    return;
  }
  response.status(403).json({ message: 'Verificação de webhook recusada.' });
});

whatsappRouter.post('/webhook', async (request, response) => {
  const signature = request.header('x-hub-signature-256');
  if (!verifyWebhookSignature(request.rawBody, signature)) {
    response.status(401).json({ message: 'Assinatura de webhook inválida.' });
    return;
  }

  const entries = Array.isArray(request.body?.entry) ? request.body.entry : [];
  for (const entry of entries) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      const value = change?.value;
      for (const incoming of Array.isArray(value?.messages) ? value.messages : []) {
        const contact = normalizeWhatsappNumber(String(incoming.from ?? ''));
        const content = String(
          incoming.text?.body ?? `Mensagem recebida (${incoming.type ?? 'desconhecida'}).`
        ).slice(0, 4096);
        const lead = contact
          ? await prisma.lead.findFirst({
              where: { OR: [{ whatsapp: contact }, { phone: contact }] }
            })
          : null;
        await prisma.communicationMessage.upsert({
          where: { externalId: String(incoming.id) },
          update: {},
          create: {
            leadId: lead?.id,
            channel: 'WHATSAPP',
            direction: 'INBOUND',
            contact: contact || null,
            content,
            status: 'RECEIVED',
            externalId: String(incoming.id),
            metadata: JSON.stringify({ type: incoming.type, timestamp: incoming.timestamp })
          }
        });
      }
      for (const status of Array.isArray(value?.statuses) ? value.statuses : []) {
        if (status?.id) {
          await prisma.communicationMessage.updateMany({
            where: { externalId: String(status.id) },
            data: { status: String(status.status ?? 'UPDATED') }
          });
        }
      }
    }
  }
  response.status(200).json({ received: true });
});

whatsappRouter.use(requireAuth);

whatsappRouter.get('/status', (_request, response) => {
  response.json(whatsappConfiguration());
});

whatsappRouter.post('/messages', async (request, response) => {
  const input = sendWhatsappMessageSchema.parse(request.body);
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: input.leadId } });
  const contact = normalizeWhatsappNumber(lead.whatsapp || lead.phone || '');
  if (!contact) {
    response.status(400).json({ message: 'O lead não possui WhatsApp ou telefone para contato.' });
    return;
  }
  try {
    const externalId = await sendWhatsappText(contact, input.content);
    const message = await prisma.communicationMessage.create({
      data: {
        leadId: lead.id,
        senderId: response.locals.user.id,
        channel: 'WHATSAPP',
        direction: 'OUTBOUND',
        contact,
        content: input.content,
        status: 'SENT',
        externalId: externalId || null
      }
    });
    await audit(response, 'SEND', 'WhatsAppMessage', message.id, { leadId: lead.id });
    response.status(201).json({ message });
  } catch (error) {
    response
      .status(502)
      .json({ message: error instanceof Error ? error.message : 'Falha ao enviar.' });
  }
});
