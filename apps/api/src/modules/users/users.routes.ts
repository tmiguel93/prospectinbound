import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requireAdmin, requireAuth } from '../auth/auth.middleware.js';
const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'SELLER']).default('SELLER')
});
export const usersRouter = Router();
usersRouter.use(requireAuth, requireAdmin);
usersRouter.get('/', async (_q, res) =>
  res.json({
    users: await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { name: 'asc' }
    })
  })
);
usersRouter.post('/', async (req, res) => {
  const x = createSchema.parse(req.body);
  const user = await prisma.user.create({
    data: {
      name: x.name,
      email: x.email,
      passwordHash: await bcrypt.hash(x.password, 12),
      role: x.role
    }
  });
  await prisma.auditLog.create({
    data: {
      userId: res.locals.user.id,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      after: JSON.stringify({ email: user.email, role: user.role })
    }
  });
  res
    .status(201)
    .json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active
      }
    });
});
