import type { Response } from 'express';
import { prisma } from '../../lib/prisma.js';
export function audit(
  response: Response,
  action: string,
  entity: string,
  entityId?: string,
  after?: unknown
) {
  return prisma.auditLog.create({
    data: {
      userId: response.locals.user?.id,
      action,
      entity,
      entityId,
      after: after ? JSON.stringify(after) : null,
      ipAddress: response.req.ip
    }
  });
}
