import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAdmin, requireAuth } from '../auth/auth.middleware.js';
export const auditRouter = Router();
auditRouter.use(requireAuth, requireAdmin);
auditRouter.get('/', async (request, response) => {
  const action = typeof request.query.action === 'string' ? request.query.action : undefined;
  const entity = typeof request.query.entity === 'string' ? request.query.entity : undefined;
  const page = Math.max(1, Number(request.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(request.query.pageSize) || 50));
  const where = { ...(action ? { action } : {}), ...(entity ? { entity } : {}) };
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.auditLog.count({ where })
  ]);
  response.json({ logs, total, page, pageSize });
});
