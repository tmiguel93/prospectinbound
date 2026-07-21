import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { isAdmin, leadScope, meetingScope } from '../auth/auth.access.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { audit } from '../audit/audit.service.js';
const schema = z.object({
  leadId: z.string().cuid(),
  ownerId: z.string().cuid().optional(),
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
      where: meetingScope(res),
      include: {
        lead: { select: { establishmentName: true, product: { select: { name: true } } } },
        owner: { select: { id: true, name: true } }
      },
      orderBy: { startsAt: 'asc' }
    })
  })
);
meetingsRouter.post('/', async (req, res) => {
  const x = schema.parse(req.body);
  const lead = await prisma.lead.findFirst({
    where: { id: x.leadId, ...leadScope(res) },
    select: { id: true }
  });
  if (!lead) return res.status(404).json({ message: 'Lead não encontrado.' });
  const startsAt = new Date(x.startsAt),
    endsAt = new Date(x.endsAt);
  if (endsAt <= startsAt) return res.status(400).json({ message: 'Horário final inválido.' });
  const conflict = await prisma.meeting.findFirst({
    where: {
      ...meetingScope(res),
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      status: { not: 'CANCELED' }
    }
  });
  if (conflict)
    return res.status(409).json({ message: 'Conflito de horário detectado.', conflict });
  const meeting = await prisma.meeting.create({
    data: {
      ...x,
      leadId: lead.id,
      ownerId: isAdmin(res) ? (x.ownerId ?? res.locals.user.id) : res.locals.user.id,
      startsAt,
      endsAt,
      link: x.link || null
    }
  });
  await audit(res, 'CREATE', 'Meeting', meeting.id, {
    leadId: meeting.leadId,
    startsAt: meeting.startsAt
  });
  res.status(201).json({ meeting });
});

meetingsRouter.patch('/:id', async (req, res) => {
  const x = schema
    .pick({ startsAt: true, endsAt: true, ownerId: true, format: true, title: true })
    .partial()
    .parse(req.body);
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const existing = await prisma.meeting.findFirst({ where: { id, ...meetingScope(res) } });
  if (!existing) return res.status(404).json({ message: 'Reunião não encontrada.' });
  const startsAt = x.startsAt ? new Date(x.startsAt) : existing.startsAt;
  const endsAt = x.endsAt ? new Date(x.endsAt) : existing.endsAt;
  if (endsAt <= startsAt) return res.status(400).json({ message: 'Horário final inválido.' });
  const conflict = await prisma.meeting.findFirst({
    where: {
      ...meetingScope(res),
      id: { not: existing.id },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      status: { not: 'CANCELED' }
    }
  });
  if (conflict)
    return res.status(409).json({ message: 'Conflito de horário detectado.', conflict });
  const meeting = await prisma.meeting.update({
    where: { id: existing.id },
    data: {
      ...x,
      ...(isAdmin(res) ? {} : { ownerId: undefined }),
      startsAt,
      endsAt
    }
  });
  await audit(res, 'RESCHEDULE', 'Meeting', meeting.id, {
    startsAt,
    endsAt,
    ownerId: meeting.ownerId
  });
  res.json({ meeting });
});
