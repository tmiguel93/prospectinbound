import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { audit } from '../audit/audit.service.js';
import { activitySchema, leadSchema, moveSchema } from './leads.schemas.js';

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
  const current = await prisma.lead.findUniqueOrThrow({ where: { id: request.params.id } });
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

leadsRouter.post('/:id/activities', async (request, response) => {
  const input = activitySchema.parse(request.body);
  const activity = await prisma.leadActivity.create({
    data: { leadId: request.params.id, ...input }
  });
  await prisma.lead.update({
    where: { id: request.params.id },
    data: { lastContactAt: new Date() }
  });
  await audit(response, 'ACTIVITY', 'Lead', activity.leadId, { type: activity.type });
  response.status(201).json({ activity });
});
