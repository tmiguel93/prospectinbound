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
  notes: z.string().trim().max(3000).optional(),
  allowDuplicate: z.boolean().default(false)
});
export const moveSchema = z.object({ stageId: z.string().cuid() });
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
