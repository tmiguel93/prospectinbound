import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { commissionScope } from '../auth/auth.access.js';
import { audit } from '../audit/audit.service.js';
import { requireAdmin, requireAuth } from '../auth/auth.middleware.js';

export const commissionsRouter = Router();
commissionsRouter.use(requireAuth);
commissionsRouter.get('/', async (_request, response) => {
  const entries = await prisma.commissionEntry.findMany({
    where: commissionScope(response),
    include: { sale: { include: { lead: true, product: true } }, payment: true },
    orderBy: { createdAt: 'desc' }
  });
  const totals = entries.reduce(
    (accumulator, entry) => {
      accumulator[entry.status] = (accumulator[entry.status] ?? 0) + entry.amountCents;
      return accumulator;
    },
    {} as Record<string, number>
  );
  response.json({ entries, totals });
});
commissionsRouter.post('/:id/pay', requireAdmin, async (request, response) => {
  const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
  const current = await prisma.commissionEntry.findUnique({ where: { id } });
  if (!current)
    return response.status(404).json({ message: 'Lançamento de comissão não encontrado.' });
  if (current.status === 'PAID')
    return response.status(409).json({ message: 'Esta comissão já foi paga.' });
  if (current.type === 'REVERSAL')
    return response.status(400).json({ message: 'Estornos não podem ser marcados como pagos.' });
  const entry = await prisma.commissionEntry.update({
    where: { id: current.id },
    data: { status: 'PAID' }
  });
  await audit(response, 'PAY', 'CommissionEntry', entry.id, { amountCents: entry.amountCents });
  response.json({ entry });
});
commissionsRouter.post('/:id/reverse', requireAdmin, async (request, response) => {
  const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
  const original = await prisma.commissionEntry.findUnique({ where: { id } });
  if (!original)
    return response.status(404).json({ message: 'Lançamento de comissão não encontrado.' });
  if (original.type === 'REVERSAL')
    return response.status(400).json({ message: 'Não é possível estornar um estorno.' });
  const existingReversal = await prisma.commissionEntry.findFirst({
    where: {
      paymentId: original.paymentId,
      saleId: original.saleId,
      type: 'REVERSAL',
      amountCents: -original.amountCents
    }
  });
  if (existingReversal)
    return response.status(409).json({ message: 'Esta comissão já possui um estorno.' });
  const entry = await prisma.commissionEntry.create({
    data: {
      paymentId: original.paymentId,
      saleId: original.saleId,
      type: 'REVERSAL',
      baseCents: original.baseCents,
      percentageBps: original.percentageBps,
      amountCents: -original.amountCents,
      status: 'REVERSED'
    }
  });
  await audit(response, 'REVERSE', 'CommissionEntry', entry.id, { originalId: original.id });
  response.status(201).json({ entry });
});
