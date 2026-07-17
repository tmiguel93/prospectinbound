import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../auth/auth.middleware.js';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', requireAuth, async (_request, response) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [
    newLeads,
    contactsInProgress,
    qualifiedLeads,
    scheduledMeetings,
    completedMeetings,
    monthlySales,
    activeCustomers,
    projected,
    available,
    recurring,
    overdueActivities
  ] = await Promise.all([
    prisma.lead.count({ where: { status: 'ACTIVE', createdAt: { gte: monthStart } } }),
    prisma.lead.count({ where: { status: 'ACTIVE', stage: { name: { contains: 'contato' } } } }),
    prisma.lead.count({ where: { status: 'ACTIVE', score: { gte: 60 } } }),
    prisma.meeting.count({ where: { status: 'SCHEDULED', startsAt: { gte: now } } }),
    prisma.meeting.count({ where: { status: 'COMPLETED' } }),
    prisma.sale.count({ where: { soldAt: { gte: monthStart }, status: { not: 'CANCELED' } } }),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.commissionEntry.aggregate({
      _sum: { amountCents: true },
      where: { status: { in: ['CONFIRMED', 'PAID'] } }
    }),
    prisma.commissionEntry.aggregate({
      _sum: { amountCents: true },
      where: { status: 'CONFIRMED' }
    }),
    prisma.subscription.aggregate({ _sum: { currentCents: true }, where: { status: 'ACTIVE' } }),
    prisma.lead.count({ where: { status: 'ACTIVE', nextActionAt: { lt: now } } })
  ]);
  response.json({
    newLeads,
    contactsInProgress,
    qualifiedLeads,
    scheduledMeetings,
    completedMeetings,
    monthlySales,
    activeCustomers,
    projectedCommissionCents: projected._sum.amountCents ?? 0,
    availableCommissionCents: available._sum.amountCents ?? 0,
    partnerRecurringRevenueCents: recurring._sum.currentCents ?? 0,
    overdueActivities
  });
});

dashboardRouter.get('/report', requireAuth, async (request, response) => {
  const from =
    typeof request.query.from === 'string' && !Number.isNaN(Date.parse(request.query.from))
      ? new Date(`${request.query.from}T00:00:00`)
      : undefined;
  const to =
    typeof request.query.to === 'string' && !Number.isNaN(Date.parse(request.query.to))
      ? new Date(`${request.query.to}T23:59:59.999`)
      : undefined;
  if (from && to && from > to)
    return response.status(400).json({ message: 'O período informado é inválido.' });
  const period =
    from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined;
  const [sales, commissions, subscriptions, leadsByStage] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { amountCents: true },
      _count: true,
      where: { status: { not: 'CANCELED' }, ...(period ? { soldAt: period } : {}) }
    }),
    prisma.commissionEntry.aggregate({
      _sum: { amountCents: true },
      ...(period ? { where: { createdAt: period } } : {})
    }),
    prisma.subscription.groupBy({ by: ['status'], _count: true, _sum: { currentCents: true } }),
    prisma.pipelineStage.findMany({
      select: { name: true, _count: { select: { leads: { where: { status: 'ACTIVE' } } } } },
      orderBy: { position: 'asc' }
    })
  ]);
  response.json({
    sales,
    commissions: commissions._sum.amountCents ?? 0,
    subscriptions,
    period: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
    leadsByStage: leadsByStage.map((stage) => ({ name: stage.name, count: stage._count.leads }))
  });
});
