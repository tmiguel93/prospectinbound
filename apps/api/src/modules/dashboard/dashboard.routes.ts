import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', requireAuth, (_request, response) => {
  response.json({
    newLeads: 0,
    contactsInProgress: 0,
    qualifiedLeads: 0,
    scheduledMeetings: 0,
    completedMeetings: 0,
    monthlySales: 0,
    activeCustomers: 0,
    projectedCommissionCents: 0,
    availableCommissionCents: 0,
    partnerRecurringRevenueCents: 0,
    overdueActivities: 0
  });
});
