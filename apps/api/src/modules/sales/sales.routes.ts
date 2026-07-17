import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { calculateInitialCommission } from '../commissions/commission.service.js';
const saleSchema = z.object({
  leadId: z.string().cuid(),
  productId: z.string().cuid(),
  planId: z.string().cuid(),
  amountCents: z.number().int().positive(),
  notes: z.string().optional()
});
export const salesRouter = Router();
salesRouter.use(requireAuth);
salesRouter.get('/', async (_q, res) =>
  res.json({
    sales: await prisma.sale.findMany({
      include: { lead: true, product: true, plan: true, subscription: true, payments: true },
      orderBy: { soldAt: 'desc' }
    })
  })
);
salesRouter.post('/', async (req, res) => {
  const x = saleSchema.parse(req.body);
  const plan = await prisma.plan.findFirst({ where: { id: x.planId, productId: x.productId } });
  if (!plan) return res.status(400).json({ message: 'Plano inválido.' });
  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({ data: x });
    await tx.subscription.create({ data: { saleId: created.id, currentCents: x.amountCents } });
    return created;
  });
  res.status(201).json({ sale });
});
salesRouter.post('/:id/payments', async (req, res) => {
  const x = z
    .object({ amountCents: z.number().int().positive(), paidAt: z.string().datetime() })
    .parse(req.body);
  const sale = await prisma.sale.findUniqueOrThrow({
    where: { id: req.params.id },
    include: { subscription: true, payments: true }
  });
  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        saleId: sale.id,
        subscriptionId: sale.subscription?.id,
        amountCents: x.amountCents,
        paidAt: new Date(x.paidAt),
        isFirst: sale.payments.length === 0
      }
    });
    const rule = await tx.commissionRule.findUnique({ where: { productId: sale.productId } });
    if (rule) {
      const calculated = calculateInitialCommission(
        sale.payments.length === 0 ? rule.fixedActivationCents : 0,
        rule.recurringPercentageBps,
        x.amountCents
      );
      await tx.commissionEntry.create({
        data: {
          paymentId: p.id,
          saleId: sale.id,
          type: sale.payments.length === 0 ? 'ACTIVATION_AND_RECURRING' : 'RECURRING',
          baseCents: x.amountCents,
          percentageBps: rule.recurringPercentageBps,
          amountCents: calculated.totalCents
        }
      });
    }
    await tx.sale.update({ where: { id: sale.id }, data: { status: 'PAYMENT_CONFIRMED' } });
    if (sale.subscription)
      await tx.subscription.update({
        where: { id: sale.subscription.id },
        data: { status: 'ACTIVE', startedAt: sale.subscription.startedAt ?? new Date() }
      });
    return p;
  });
  res.status(201).json({ payment });
});
