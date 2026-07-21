import type { Prisma } from '@prisma/client';
import type { Response } from 'express';

type CurrentUser = { id: string; role: 'ADMIN' | 'SELLER' };

function currentUser(response: Response): CurrentUser {
  return response.locals.user as CurrentUser;
}

export function isAdmin(response: Response) {
  return currentUser(response).role === 'ADMIN';
}

export function leadScope(response: Response): Prisma.LeadWhereInput {
  return isAdmin(response) ? {} : { ownerId: currentUser(response).id };
}

export function saleScope(response: Response): Prisma.SaleWhereInput {
  return isAdmin(response) ? {} : { lead: { ownerId: currentUser(response).id } };
}

export function meetingScope(response: Response): Prisma.MeetingWhereInput {
  return isAdmin(response) ? {} : { ownerId: currentUser(response).id };
}

export function commissionScope(response: Response): Prisma.CommissionEntryWhereInput {
  return isAdmin(response) ? {} : { sale: { lead: { ownerId: currentUser(response).id } } };
}

export function currentUserId(response: Response) {
  return currentUser(response).id;
}
