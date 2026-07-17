import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAdmin, requireAuth } from '../auth/auth.middleware.js';
export const auditRouter = Router();
auditRouter.use(requireAuth, requireAdmin);
auditRouter.get('/', async (_q, res) =>
  res.json({
    logs: await prisma.auditLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500
    })
  })
);
