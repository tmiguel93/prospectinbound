import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../auth/auth.middleware.js';
const schema = z.object({
  leadId: z.string().cuid(),
  title: z.string().min(2),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  format: z.string().min(2),
  link: z.string().url().optional().or(z.literal('')),
  location: z.string().optional(),
  notes: z.string().optional()
});
export const meetingsRouter = Router();
meetingsRouter.use(requireAuth);
meetingsRouter.get('/', async (_q, res) =>
  res.json({
    meetings: await prisma.meeting.findMany({
      include: {
        lead: { select: { establishmentName: true, product: { select: { name: true } } } }
      },
      orderBy: { startsAt: 'asc' }
    })
  })
);
meetingsRouter.post('/', async (req, res) => {
  const x = schema.parse(req.body);
  const startsAt = new Date(x.startsAt),
    endsAt = new Date(x.endsAt);
  if (endsAt <= startsAt) return res.status(400).json({ message: 'Horário final inválido.' });
  const conflict = await prisma.meeting.findFirst({
    where: { startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, status: { not: 'CANCELED' } }
  });
  if (conflict)
    return res.status(409).json({ message: 'Conflito de horário detectado.', conflict });
  res
    .status(201)
    .json({
      meeting: await prisma.meeting.create({
        data: { ...x, startsAt, endsAt, link: x.link || null }
      })
    });
});
