import { randomUUID } from 'node:crypto';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { Router, type Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { audit } from '../audit/audit.service.js';
import { requireAdmin, requireAuth } from '../auth/auth.middleware.js';

const photoDirectory = resolve(process.cwd(), 'data', 'service-photos');
const stages = ['SCHEDULED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'COMPLETED'] as const;
const contractStatuses = ['ACTIVE', 'SUSPENDED', 'FINISHED', 'CANCELED'] as const;
const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const;

const serviceSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  unit: z.string().trim().min(1).max(40).default('unidade'),
  defaultPriceCents: z.number().int().min(0).default(0),
  active: z.boolean().default(true)
});
const clientSchema = z.object({
  name: z.string().trim().min(2).max(160),
  taxId: z.string().trim().max(32).optional(),
  contactName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(32).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  address: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(3000).optional()
});
const contractSchema = z.object({
  clientId: z.string().cuid(),
  number: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(160),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  valueCents: z.number().int().min(0).default(0),
  status: z.enum(contractStatuses).default('ACTIVE'),
  notes: z.string().trim().max(3000).optional()
});
const jobSchema = z.object({
  contractId: z.string().cuid(),
  serviceId: z.string().cuid(),
  assigneeId: z.string().cuid().nullable().optional(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(3000).optional(),
  scheduledAt: z.string().datetime().optional(),
  stage: z.enum(stages).default('SCHEDULED'),
  priority: z.enum(priorities).default('NORMAL')
});
const moveSchema = z.object({ stage: z.enum(stages) });
const photoSchema = z.object({
  dataUrl: z.string().min(32).max(6_000_000),
  filename: z.string().trim().min(1).max(200),
  kind: z.enum(['BEFORE', 'AFTER', 'EVIDENCE']).default('EVIDENCE')
});

const jobInclude = {
  service: true,
  contract: { include: { client: true } },
  assignee: { select: { id: true, name: true } },
  photos: { orderBy: { createdAt: 'desc' as const } }
};

function jobScope(response: Response) {
  return response.locals.user.role === 'ADMIN' ? {} : { assigneeId: response.locals.user.id };
}

function contractScope(response: Response) {
  return response.locals.user.role === 'ADMIN'
    ? {}
    : { jobs: { some: { assigneeId: response.locals.user.id } } };
}

function clientScope(response: Response) {
  return response.locals.user.role === 'ADMIN'
    ? {}
    : { contracts: { some: { jobs: { some: { assigneeId: response.locals.user.id } } } } };
}

function dateAtNoon(value: string) {
  return new Date(value);
}

function toSafeFileName(filename: string, mimeType: string) {
  const suffix = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const base = filename
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .slice(0, 80)
    .replace(/\.[^.]+$/, '');
  return `${randomUUID()}-${base || 'evidencia'}.${suffix}`;
}

function readImageDataUrl(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error('Envie uma imagem JPG, PNG ou WEBP válida.');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > 3_500_000)
    throw new Error('A imagem deve ter no máximo 3,5 MB.');
  return { mimeType: match[1], buffer };
}

export const operationsRouter = Router();
operationsRouter.use(requireAuth);

operationsRouter.get('/dashboard', async (_request, response) => {
  const now = new Date();
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  const scope = jobScope(response);
  const [activeContracts, scheduled, inProgress, pendingApproval, completed, upcoming] =
    await Promise.all([
      prisma.serviceContract.count({ where: { ...contractScope(response), status: 'ACTIVE' } }),
      prisma.serviceJob.count({ where: { ...scope, stage: 'SCHEDULED' } }),
      prisma.serviceJob.count({ where: { ...scope, stage: 'IN_PROGRESS' } }),
      prisma.serviceJob.count({ where: { ...scope, stage: 'PENDING_APPROVAL' } }),
      prisma.serviceJob.count({ where: { ...scope, stage: 'COMPLETED' } }),
      prisma.serviceJob.findMany({
        where: { ...scope, scheduledAt: { gte: now, lte: nextWeek }, stage: { not: 'COMPLETED' } },
        include: jobInclude,
        orderBy: { scheduledAt: 'asc' },
        take: 8
      })
    ]);
  response.json({ activeContracts, scheduled, inProgress, pendingApproval, completed, upcoming });
});

operationsRouter.get('/services', async (_request, response) => {
  response.json({
    services: await prisma.serviceCatalogItem.findMany({ orderBy: { name: 'asc' } })
  });
});

operationsRouter.post('/services', requireAdmin, async (request, response) => {
  const service = await prisma.serviceCatalogItem.create({
    data: serviceSchema.parse(request.body)
  });
  await audit(response, 'CREATE', 'ServiceCatalogItem', service.id, { name: service.name });
  response.status(201).json({ service });
});

operationsRouter.patch('/services/:id', requireAdmin, async (request, response) => {
  const service = await prisma.serviceCatalogItem.update({
    where: { id: request.params.id as string },
    data: serviceSchema.partial().parse(request.body)
  });
  await audit(response, 'UPDATE', 'ServiceCatalogItem', service.id, { name: service.name });
  response.json({ service });
});

operationsRouter.get('/clients', async (request, response) => {
  const search = typeof request.query.search === 'string' ? request.query.search.trim() : '';
  const clients = await prisma.serviceClient.findMany({
    where: {
      ...clientScope(response),
      ...(search ? { OR: [{ name: { contains: search } }, { taxId: { contains: search } }] } : {})
    },
    include: { _count: { select: { contracts: true } } },
    orderBy: { name: 'asc' },
    take: 200
  });
  response.json({ clients });
});

operationsRouter.post('/clients', requireAdmin, async (request, response) => {
  const input = clientSchema.parse(request.body);
  const client = await prisma.serviceClient.create({
    data: { ...input, email: input.email || null }
  });
  await audit(response, 'CREATE', 'ServiceClient', client.id, { name: client.name });
  response.status(201).json({ client });
});

operationsRouter.patch('/clients/:id', requireAdmin, async (request, response) => {
  const input = clientSchema.partial().parse(request.body);
  const client = await prisma.serviceClient.update({
    where: { id: request.params.id as string },
    data: { ...input, ...(input.email === '' ? { email: null } : {}) }
  });
  await audit(response, 'UPDATE', 'ServiceClient', client.id, { name: client.name });
  response.json({ client });
});

operationsRouter.get('/contracts', async (request, response) => {
  const status = typeof request.query.status === 'string' ? request.query.status : undefined;
  const contracts = await prisma.serviceContract.findMany({
    where: { ...contractScope(response), ...(status ? { status } : {}) },
    include: { client: true, _count: { select: { jobs: true } } },
    orderBy: [{ status: 'asc' }, { startsAt: 'desc' }],
    take: 200
  });
  response.json({ contracts });
});

operationsRouter.post('/contracts', requireAdmin, async (request, response) => {
  const input = contractSchema.parse(request.body);
  const client = await prisma.serviceClient.findUnique({
    where: { id: input.clientId },
    select: { id: true }
  });
  if (!client) return response.status(400).json({ message: 'Cliente inválido.' });
  const startsAt = dateAtNoon(input.startsAt);
  const endsAt = input.endsAt ? dateAtNoon(input.endsAt) : null;
  if (endsAt && endsAt < startsAt)
    return response.status(400).json({ message: 'A vigência final é inválida.' });
  const contract = await prisma.serviceContract.create({
    data: { ...input, startsAt, endsAt },
    include: { client: true }
  });
  await audit(response, 'CREATE', 'ServiceContract', contract.id, { number: contract.number });
  response.status(201).json({ contract });
});

operationsRouter.patch('/contracts/:id', requireAdmin, async (request, response) => {
  const input = contractSchema.omit({ clientId: true, number: true }).partial().parse(request.body);
  const existing = await prisma.serviceContract.findUnique({
    where: { id: request.params.id as string }
  });
  if (!existing) return response.status(404).json({ message: 'Contrato não encontrado.' });
  const startsAt = input.startsAt ? dateAtNoon(input.startsAt) : existing.startsAt;
  const endsAt = input.endsAt ? dateAtNoon(input.endsAt) : existing.endsAt;
  if (endsAt && endsAt < startsAt)
    return response.status(400).json({ message: 'A vigência final é inválida.' });
  const contract = await prisma.serviceContract.update({
    where: { id: existing.id },
    data: { ...input, startsAt, endsAt },
    include: { client: true }
  });
  await audit(response, 'UPDATE', 'ServiceContract', contract.id, { status: contract.status });
  response.json({ contract });
});

operationsRouter.get('/jobs', async (request, response) => {
  const stage = typeof request.query.stage === 'string' ? request.query.stage : undefined;
  const contractId =
    typeof request.query.contractId === 'string' ? request.query.contractId : undefined;
  const jobs = await prisma.serviceJob.findMany({
    where: {
      ...jobScope(response),
      ...(stage ? { stage } : {}),
      ...(contractId ? { contractId } : {})
    },
    include: jobInclude,
    orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
    take: 300
  });
  response.json({ jobs });
});

operationsRouter.get('/agenda', async (request, response) => {
  const from = typeof request.query.from === 'string' ? new Date(request.query.from) : new Date();
  const to =
    typeof request.query.to === 'string'
      ? new Date(request.query.to)
      : new Date(Date.now() + 30 * 86400000);
  const jobs = await prisma.serviceJob.findMany({
    where: { ...jobScope(response), scheduledAt: { gte: from, lte: to } },
    include: jobInclude,
    orderBy: { scheduledAt: 'asc' }
  });
  response.json({ jobs });
});

operationsRouter.post('/jobs', requireAdmin, async (request, response) => {
  const input = jobSchema.parse(request.body);
  const [contract, service, assignee] = await Promise.all([
    prisma.serviceContract.findUnique({
      where: { id: input.contractId },
      select: { id: true, status: true }
    }),
    prisma.serviceCatalogItem.findUnique({
      where: { id: input.serviceId, active: true },
      select: { id: true }
    }),
    input.assigneeId
      ? prisma.user.findFirst({ where: { id: input.assigneeId, active: true } })
      : null
  ]);
  if (!contract || contract.status !== 'ACTIVE')
    return response.status(400).json({ message: 'Contrato ativo inválido.' });
  if (!service) return response.status(400).json({ message: 'Serviço inválido ou inativo.' });
  if (input.assigneeId && !assignee)
    return response.status(400).json({ message: 'Responsável inválido ou inativo.' });
  const job = await prisma.serviceJob.create({
    data: {
      ...input,
      assigneeId: input.assigneeId || null,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      completedAt: input.stage === 'COMPLETED' ? new Date() : null
    },
    include: jobInclude
  });
  await audit(response, 'CREATE', 'ServiceJob', job.id, {
    contractId: job.contractId,
    stage: job.stage
  });
  response.status(201).json({ job });
});

operationsRouter.patch('/jobs/:id', async (request, response) => {
  const input = jobSchema.omit({ contractId: true, serviceId: true }).partial().parse(request.body);
  const existing = await prisma.serviceJob.findFirst({
    where: { id: request.params.id as string, ...jobScope(response) }
  });
  if (!existing) return response.status(404).json({ message: 'Ordem de serviço não encontrada.' });
  if (response.locals.user.role !== 'ADMIN' && Object.keys(input).some((key) => key !== 'stage'))
    return response
      .status(403)
      .json({ message: 'Você só pode atualizar a etapa de sua própria ordem.' });
  const job = await prisma.serviceJob.update({
    where: { id: existing.id },
    data: {
      ...input,
      ...(input.scheduledAt ? { scheduledAt: new Date(input.scheduledAt) } : {}),
      ...(input.stage ? { completedAt: input.stage === 'COMPLETED' ? new Date() : null } : {})
    },
    include: jobInclude
  });
  await audit(response, 'UPDATE', 'ServiceJob', job.id, { stage: job.stage });
  response.json({ job });
});

operationsRouter.patch('/jobs/:id/move', async (request, response) => {
  const { stage } = moveSchema.parse(request.body);
  const existing = await prisma.serviceJob.findFirst({
    where: { id: request.params.id as string, ...jobScope(response) }
  });
  if (!existing) return response.status(404).json({ message: 'Ordem de serviço não encontrada.' });
  const job = await prisma.serviceJob.update({
    where: { id: existing.id },
    data: { stage, completedAt: stage === 'COMPLETED' ? new Date() : null },
    include: jobInclude
  });
  await audit(response, 'MOVE', 'ServiceJob', job.id, { stage });
  response.json({ job });
});

operationsRouter.post('/jobs/:id/photos', async (request, response) => {
  const job = await prisma.serviceJob.findFirst({
    where: { id: request.params.id as string, ...jobScope(response) }
  });
  if (!job) return response.status(404).json({ message: 'Ordem de serviço não encontrada.' });
  const input = photoSchema.parse(request.body);
  const { buffer, mimeType } = readImageDataUrl(input.dataUrl);
  const filename = toSafeFileName(input.filename, mimeType);
  await mkdir(photoDirectory, { recursive: true });
  await writeFile(resolve(photoDirectory, filename), buffer, { flag: 'wx' });
  try {
    const photo = await prisma.servicePhoto.create({
      data: {
        jobId: job.id,
        uploadedById: response.locals.user.id,
        filename,
        originalName: input.filename,
        mimeType,
        size: buffer.length,
        kind: input.kind
      }
    });
    await audit(response, 'UPLOAD', 'ServicePhoto', photo.id, { jobId: job.id, kind: photo.kind });
    response.status(201).json({ photo });
  } catch (error) {
    await unlink(resolve(photoDirectory, filename)).catch(() => undefined);
    throw error;
  }
});

operationsRouter.get('/photos/:id', async (request, response) => {
  const photo = await prisma.servicePhoto.findFirst({
    where: { id: request.params.id as string, job: { is: jobScope(response) } },
    select: { filename: true, mimeType: true }
  });
  if (!photo) return response.status(404).json({ message: 'Foto não encontrada.' });
  const file = resolve(photoDirectory, photo.filename);
  try {
    await access(file, constants.R_OK);
  } catch {
    return response.status(404).json({ message: 'Arquivo não encontrado.' });
  }
  response.type(photo.mimeType).sendFile(file);
});
