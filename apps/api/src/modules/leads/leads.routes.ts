import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { leadScope } from '../auth/auth.access.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { audit } from '../audit/audit.service.js';
import {
  activitySchema,
  assignmentSchema,
  leadSchema,
  moveSchema,
  outcomeSchema
} from './leads.schemas.js';

const includeLead = {
  product: true,
  pipeline: true,
  stage: true,
  owner: { select: { id: true, name: true } },
  activities: { orderBy: { createdAt: 'desc' as const }, take: 10 },
  stageHistory: { orderBy: { createdAt: 'desc' as const }, take: 20 }
};
export const leadsRouter = Router();
leadsRouter.use(requireAuth);

leadsRouter.get('/', async (request, response) => {
  const query = request.query as {
    pipelineId?: string;
    productId?: string;
    search?: string;
    status?: string;
  };
  const where: Prisma.LeadWhereInput = {
    ...leadScope(response),
    ...(query.pipelineId ? { pipelineId: query.pipelineId } : {}),
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.status ? { status: query.status } : { status: 'ACTIVE' }),
    ...(query.search
      ? {
          OR: [
            { establishmentName: { contains: query.search } },
            { contactName: { contains: query.search } },
            { email: { contains: query.search } }
          ]
        }
      : {})
  };
  const leads = await prisma.lead.findMany({
    where,
    include: includeLead,
    orderBy: { updatedAt: 'desc' },
    take: 200
  });
  response.json({ leads });
});

leadsRouter.post('/duplicates', async (request, response) => {
  const body = leadSchema
    .pick({ establishmentName: true, phone: true, email: true, productId: true })
    .parse(request.body);
  const matches = await prisma.lead.findMany({
    where: {
      ...leadScope(response),
      productId: body.productId,
      OR: [
        { establishmentName: body.establishmentName },
        ...(body.phone ? [{ phone: body.phone }] : []),
        ...(body.email ? [{ email: body.email }] : [])
      ]
    },
    select: { id: true, establishmentName: true, phone: true, email: true, status: true },
    take: 10
  });
  response.json({ matches });
});

leadsRouter.post('/', async (request, response) => {
  const input = leadSchema.parse(request.body);
  const stage = await prisma.pipelineStage.findFirst({
    where: { id: input.stageId, pipelineId: input.pipelineId }
  });
  if (!stage)
    return response.status(400).json({ message: 'A etapa não pertence ao pipeline selecionado.' });
  const duplicates = await prisma.lead.findMany({
    where: {
      ...leadScope(response),
      productId: input.productId,
      OR: [
        { establishmentName: input.establishmentName },
        ...(input.phone ? [{ phone: input.phone }] : []),
        ...(input.email ? [{ email: input.email }] : [])
      ]
    },
    select: { id: true, establishmentName: true },
    take: 5
  });
  if (duplicates.length && !input.allowDuplicate)
    return response.status(409).json({ message: 'Possível duplicidade encontrada.', duplicates });
  const { allowDuplicate, nextActionAt, ...data } = input;
  void allowDuplicate;
  const lead = await prisma.lead.create({
    data: {
      ...data,
      email: data.email || null,
      nextActionAt: nextActionAt ? new Date(nextActionAt) : null,
      expectedCloseAt: data.expectedCloseAt ? new Date(data.expectedCloseAt) : null,
      consentCapturedAt: data.consentCapturedAt ? new Date(data.consentCapturedAt) : null,
      ownerId: response.locals.user.id,
      stageHistory: { create: { userId: response.locals.user.id, nextId: input.stageId } }
    },
    include: includeLead
  });
  await audit(response, 'CREATE', 'Lead', lead.id, { establishmentName: lead.establishmentName });
  response.status(201).json({ lead, duplicates });
});

leadsRouter.patch('/:id/move', async (request, response) => {
  const { stageId } = moveSchema.parse(request.body);
  const current = await prisma.lead.findFirst({
    where: { id: request.params.id, ...leadScope(response) }
  });
  if (!current) return response.status(404).json({ message: 'Lead não encontrado.' });
  const stage = await prisma.pipelineStage.findFirst({
    where: { id: stageId, pipelineId: current.pipelineId }
  });
  if (!stage)
    return response.status(400).json({ message: 'Movimentação inválida para este pipeline.' });
  const lead = await prisma.$transaction(async (tx) => {
    await tx.leadStageHistory.create({
      data: {
        leadId: current.id,
        userId: response.locals.user.id,
        previousId: current.stageId,
        nextId: stageId
      }
    });
    return tx.lead.update({ where: { id: current.id }, data: { stageId }, include: includeLead });
  });
  await audit(response, 'MOVE', 'Lead', lead.id, { stageId });
  response.json({ lead });
});

leadsRouter.patch('/:id/outcome', async (request, response) => {
  const { status, lossReason } = outcomeSchema.parse(request.body);
  if (status === 'LOST' && !lossReason)
    return response.status(400).json({ message: 'Informe o motivo da perda.' });
  const lead = await prisma.lead.findFirst({
    where: { id: request.params.id, ...leadScope(response) }
  });
  if (!lead) return response.status(404).json({ message: 'Lead não encontrado.' });
  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status,
      lossReason: status === 'LOST' ? lossReason : null,
      outcomeAt: status === 'ACTIVE' ? null : new Date()
    },
    include: includeLead
  });
  await audit(response, 'OUTCOME', 'Lead', updated.id, { status });
  response.json({ lead: updated });
});

leadsRouter.patch('/:id/owner', async (request, response) => {
  if (response.locals.user.role !== 'ADMIN')
    return response.status(403).json({ message: 'Atribuição restrita a administradores.' });
  const { ownerId } = assignmentSchema.parse(request.body);
  if (ownerId) {
    const owner = await prisma.user.findFirst({ where: { id: ownerId, active: true } });
    if (!owner) return response.status(400).json({ message: 'Responsável inválido ou inativo.' });
  }
  const lead = await prisma.lead.update({ where: { id: request.params.id }, data: { ownerId } });
  await audit(response, 'ASSIGN', 'Lead', lead.id, { ownerId });
  response.json({ lead });
});

leadsRouter.get('/:id/privacy-export', async (request, response) => {
  const lead = await prisma.lead.findFirst({
    where: { id: request.params.id, ...leadScope(response) },
    include: { activities: true, meetings: true, messages: true, sales: true }
  });
  if (!lead) return response.status(404).json({ message: 'Lead não encontrado.' });
  await audit(response, 'PRIVACY_EXPORT', 'Lead', lead.id, {});
  response.json({ lead });
});

leadsRouter.post('/:id/anonymize', async (request, response) => {
  if (response.locals.user.role !== 'ADMIN')
    return response.status(403).json({ message: 'Anonimização restrita a administradores.' });
  const lead = await prisma.lead.update({
    where: { id: request.params.id },
    data: {
      establishmentName: 'Titular anonimizado',
      contactName: null,
      phone: null,
      whatsapp: null,
      email: null,
      city: null,
      state: null,
      notes: null,
      consentCapturedAt: null,
      consentSource: null,
      legalBasis: null,
      anonymizedAt: new Date()
    }
  });
  await audit(response, 'ANONYMIZE', 'Lead', lead.id, {});
  response.json({ lead });
});

leadsRouter.post('/:id/activities', async (request, response) => {
  const input = activitySchema.parse(request.body);
  const lead = await prisma.lead.findFirst({
    where: { id: request.params.id, ...leadScope(response) },
    select: { id: true }
  });
  if (!lead) return response.status(404).json({ message: 'Lead não encontrado.' });
  const activity = await prisma.leadActivity.create({
    data: { leadId: lead.id, ...input }
  });
  await prisma.lead.update({
    where: { id: lead.id },
    data: { lastContactAt: new Date() }
  });
  await audit(response, 'ACTIVITY', 'Lead', activity.leadId, { type: activity.type });
  response.status(201).json({ activity });
});
