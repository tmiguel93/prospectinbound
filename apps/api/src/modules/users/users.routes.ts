import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { audit } from '../audit/audit.service.js';
import { requireAdmin, requireAuth } from '../auth/auth.middleware.js';

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'SELLER']).default('SELLER'),
  monthlyGoalCents: z.number().int().min(0).default(0)
});
const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(['ADMIN', 'SELLER']).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
  monthlyGoalCents: z.number().int().min(0).optional()
});
const publicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  monthlyGoalCents: true,
  createdAt: true
};

async function ensureAdminRemains(id: string, changes: z.infer<typeof updateSchema>) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return null;
  const removingAdmin =
    target.role === 'ADMIN' &&
    target.active &&
    (changes.role === 'SELLER' || changes.active === false);
  if (removingAdmin && (await prisma.user.count({ where: { role: 'ADMIN', active: true } })) < 2)
    throw new Error('Não é possível remover ou desativar o último administrador ativo.');
  return target;
}

export const usersRouter = Router();
usersRouter.use(requireAuth, requireAdmin);

usersRouter.get('/', async (_request, response) => {
  response.json({
    users: await prisma.user.findMany({ select: publicSelect, orderBy: { name: 'asc' } })
  });
});

usersRouter.post('/', async (request, response) => {
  const input = createSchema.parse(request.body);
  if (await prisma.user.findUnique({ where: { email: input.email } }))
    return response.status(409).json({ message: 'Já existe um usuário com este e-mail.' });
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 12),
      role: input.role,
      monthlyGoalCents: input.monthlyGoalCents
    },
    select: publicSelect
  });
  await audit(response, 'CREATE', 'User', user.id, { email: user.email, role: user.role });
  response.status(201).json({ user });
});

usersRouter.patch('/:id', async (request, response) => {
  const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
  const input = updateSchema.parse(request.body);
  const { password, ...changes } = input;
  if (!Object.keys(input).length)
    return response.status(400).json({ message: 'Informe ao menos uma alteração.' });
  try {
    const before = await ensureAdminRemains(id, changes);
    if (!before) return response.status(404).json({ message: 'Usuário não encontrado.' });
    if (id === response.locals.user.id && input.active === false)
      return response.status(400).json({ message: 'Você não pode desativar seu próprio acesso.' });
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...changes,
        ...(password
          ? { passwordHash: await bcrypt.hash(password, 12), sessionVersion: { increment: 1 } }
          : {})
      },
      select: publicSelect
    });
    await audit(response, 'UPDATE', 'User', user.id, {
      before: { role: before.role, active: before.active },
      after: { role: user.role, active: user.active }
    });
    response.json({ user });
  } catch (error) {
    response.status(400).json({
      message: error instanceof Error ? error.message : 'Não foi possível atualizar o usuário.'
    });
  }
});
