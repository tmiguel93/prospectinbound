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
  allowDuplicates: z.boolean().default(false),
  rows: z
    .array(
      z.object({
        establishmentName: z.string().trim().min(2).max(160),
        contactName: z.string().trim().max(120).optional(),
        phone: z.string().trim().max(30).optional(),
        whatsapp: z.string().trim().max(30).optional(),
        email: z.string().trim().email().optional().or(z.literal('')),
        city: z.string().trim().max(120).optional(),
        state: z.string().trim().max(2).optional(),
        source: z.string().trim().max(120).default('Importação CSV'),
        priority: z.enum(['Baixa', 'Normal', 'Alta']).default('Normal')
      })
    )
    .min(1)
    .max(1000)
});
importsRouter.post('/leads', async (req, res) => {
  const x = schema.parse(req.body);
  const product = await prisma.product.findUnique({ where: { id: x.productId } });
  const stage = await prisma.pipelineStage.findUnique({ where: { id: x.stageId } });
  if (!product || product.pipelineId !== x.pipelineId || stage?.pipelineId !== x.pipelineId)
    return res.status(400).json({ message: 'Produto, pipeline ou etapa inválidos.' });

  const seen = new Set<string>();
  const duplicateRows: Array<{ row: number; message: string }> = [];
  const identifiers = x.rows
    .flatMap((row) => [row.email?.toLowerCase(), row.phone, row.whatsapp])
    .filter(Boolean) as string[];
  const existing = x.allowDuplicates
    ? []
    : await prisma.lead.findMany({
        where: {
          OR: [
            { email: { in: identifiers } },
            { phone: { in: identifiers } },
            { whatsapp: { in: identifiers } }
          ]
        },
        select: { email: true, phone: true, whatsapp: true }
      });
  const existingIdentifiers = new Set(
    existing
      .flatMap((lead) => [lead.email?.toLowerCase(), lead.phone, lead.whatsapp])
      .filter(Boolean)
  );
  x.rows.forEach((row, index) => {
    const rowIdentifiers = [row.email?.toLowerCase(), row.phone, row.whatsapp].filter(
      Boolean
    ) as string[];
    if (
      !x.allowDuplicates &&
      rowIdentifiers.some((value) => existingIdentifiers.has(value) || seen.has(value))
    )
      duplicateRows.push({ row: index + 2, message: 'E-mail, telefone ou WhatsApp duplicado.' });
    rowIdentifiers.forEach((value) => seen.add(value));
  });
  if (duplicateRows.length)
    return res.status(422).json({
      message: 'A importação foi interrompida por registros duplicados.',
      errors: duplicateRows
    });

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
  await audit(res, 'IMPORT', 'Lead', undefined, { count: created.length, source: 'CSV' });
  res.status(201).json({ count: created.length });
});
