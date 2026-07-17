import { z } from 'zod';

const stageSchema = z.object({
  name: z.string().trim().min(2).max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  isInitial: z.boolean(),
  isFinal: z.boolean()
});

export const pipelineSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    stages: z.array(stageSchema).min(2).max(5)
  })
  .superRefine((value, context) => {
    if (value.stages.filter((stage) => stage.isInitial).length !== 1)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Defina exatamente uma etapa inicial.'
      });
    if (value.stages.filter((stage) => stage.isFinal).length !== 1)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Defina exatamente uma etapa final.'
      });
  });

const planSchema = z.object({
  name: z.string().trim().min(2).max(120),
  priceCents: z.number().int().min(0),
  period: z.enum(['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL', 'ONE_TIME']),
  description: z.string().trim().max(1000).optional(),
  active: z.boolean().default(true)
});

export const wizardSchema = z
  .object({
    partnerId: z.string().cuid().optional(),
    partnerName: z.string().trim().min(2).max(120).optional(),
    product: z.object({
      name: z.string().trim().min(2).max(120),
      segment: z.string().trim().min(2).max(120),
      description: z.string().trim().max(2000).optional(),
      demoUrl: z.string().url().optional().or(z.literal('')),
      signupUrl: z.string().url().optional().or(z.literal('')),
      internalNotes: z.string().trim().max(2000).optional(),
      active: z.boolean().default(true)
    }),
    plans: z.array(planSchema).min(1),
    commission: z.object({
      fixedActivationCents: z.number().int().min(0),
      recurringPercentageBps: z.number().int().min(0).max(10000),
      maxMonths: z.number().int().positive().nullable(),
      unlimitedRecurrence: z.boolean(),
      includeFirstPayment: z.boolean(),
      safetyDays: z.number().int().min(0).max(365),
      refundPolicy: z.string().trim().max(1000).optional()
    }),
    pipelineId: z.string().cuid().optional(),
    pipeline: pipelineSchema.optional(),
    questions: z
      .array(
        z.object({
          label: z.string().trim().min(2).max(500),
          inputType: z.string().trim().min(2).max(30)
        })
      )
      .default([])
  })
  .superRefine((value, context) => {
    if (!value.partnerId && !value.partnerName)
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Selecione ou crie um parceiro.' });
    if (!value.pipelineId && !value.pipeline)
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Selecione ou crie um pipeline.' });
  });

export const partnerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  notes: z.string().trim().max(2000).optional()
});
export type WizardInput = z.infer<typeof wizardSchema>;
