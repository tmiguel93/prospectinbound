import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { audit } from '../audit/audit.service.js';
import { requireAuth } from '../auth/auth.middleware.js';
export const importsRouter = Router();
importsRouter.use(requireAuth);
const schema = z.object({
  productId: z.string().cuid(),
  pipelineId: z.string().cuid(),
  stageId: z.string().cuid(),
  rows: z
    .array(
      z.object({
        establishmentName: z.string().min(2),
        contactName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional()
      })
    )
    .max(1000)
});
importsRouter.post('/leads', async (req, res) => {
  const x = schema.parse(req.body);
  const created = await prisma.$transaction(
    x.rows.map((row) =>
      prisma.lead.create({
        data: {
          ...row,
          productId: x.productId,
          pipelineId: x.pipelineId,
          stageId: x.stageId,
          ownerId: res.locals.user.id
        }
      })
    )
  );
  await audit(res, 'IMPORT', 'Lead', undefined, { count: created.length });
  res.status(201).json({ count: created.length });
});
