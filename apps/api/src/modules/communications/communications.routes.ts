import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { audit } from '../audit/audit.service.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { internalMessageSchema } from './communications.schemas.js';

export const communicationsRouter = Router();
communicationsRouter.use(requireAuth);

communicationsRouter.get('/leads', async (request, response) => {
  const search = typeof request.query.search === 'string' ? request.query.search.trim() : '';
  const leads = await prisma.lead.findMany({
    where: {
      status: 'ACTIVE',
      ...(search
        ? {
            OR: [
              { establishmentName: { contains: search } },
              { contactName: { contains: search } },
              { whatsapp: { contains: search } },
              { phone: { contains: search } }
            ]
          }
        : {})
    },
    select: {
      id: true,
      establishmentName: true,
      contactName: true,
      phone: true,
      whatsapp: true,
      product: { select: { name: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { content: true, createdAt: true }
      }
    },
    orderBy: { updatedAt: 'desc' },
    take: 100
  });
  response.json({ leads });
});

communicationsRouter.get('/leads/:leadId/messages', async (request, response) => {
  await prisma.lead.findUniqueOrThrow({ where: { id: request.params.leadId } });
  const messages = await prisma.communicationMessage.findMany({
    where: { leadId: request.params.leadId },
    include: { sender: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
    take: 200
  });
  response.json({ messages });
});

communicationsRouter.post('/leads/:leadId/messages', async (request, response) => {
  const input = internalMessageSchema.parse(request.body);
  await prisma.lead.findUniqueOrThrow({ where: { id: request.params.leadId } });
  const message = await prisma.communicationMessage.create({
    data: {
      leadId: request.params.leadId,
      senderId: response.locals.user.id,
      channel: 'INTERNAL',
      direction: 'OUTBOUND',
      content: input.content,
      status: 'SENT'
    },
    include: { sender: { select: { id: true, name: true } } }
  });
  await audit(response, 'SEND', 'InternalMessage', message.id, { leadId: request.params.leadId });
  response.status(201).json({ message });
});
