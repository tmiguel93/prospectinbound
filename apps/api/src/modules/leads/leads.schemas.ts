import { z } from 'zod';

export const leadSchema = z.object({
  establishmentName: z.string().trim().min(2).max(160),
  contactName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  email: z.string().trim().email().optional().or(z.literal('')),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(2).optional(),
  productId: z.string().cuid(),
  pipelineId: z.string().cuid(),
  stageId: z.string().cuid(),
  source: z.string().trim().max(120).default('Prospecção própria'),
  priority: z.enum(['Baixa', 'Normal', 'Alta']).default('Normal'),
  nextAction: z.string().trim().max(500).optional(),
  nextActionAt: z.string().datetime().optional(),
  estimatedValueCents: z.number().int().positive().optional(),
  expectedCloseAt: z.string().datetime().optional(),
  consentCapturedAt: z.string().datetime().optional(),
  consentSource: z.string().trim().max(160).optional(),
  legalBasis: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(3000).optional(),
  allowDuplicate: z.boolean().default(false)
});
export const moveSchema = z.object({ stageId: z.string().cuid() });
export const outcomeSchema = z.object({
  status: z.enum(['ACTIVE', 'WON', 'LOST']),
  lossReason: z.string().trim().min(2).max(500).optional()
});
export const assignmentSchema = z.object({ ownerId: z.string().cuid().nullable() });
export const activitySchema = z.object({
  type: z.enum([
    'Ligação',
    'WhatsApp',
    'E-mail',
    'Reunião',
    'Anotação',
    'Sem resposta',
    'Demonstração enviada',
    'Outro'
  ]),
  content: z.string().trim().max(3000).optional()
});
