import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { leadScope } from '../auth/auth.access.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { audit } from '../audit/audit.service.js';

const responseSchema = z.object({
  questionId: z.string().cuid(),
  answer: z.string().max(3000),
  points: z.number().int().min(-100).max(100)
});
export const qualificationRouter = Router();
qualificationRouter.use(requireAuth);
qualificationRouter.get('/:leadId', async (request, response) => {
  const lead = await prisma.lead.findFirst({
    where: { id: request.params.leadId, ...leadScope(response) },
    include: {
      product: { include: { questions: { orderBy: { position: 'asc' } } } },
      qualificationResponses: true
    }
  });
  if (!lead) return response.status(404).json({ message: 'Lead não encontrado.' });
  response.json({
    score: lead.score,
    questions: lead.product.questions,
    responses: lead.qualificationResponses
  });
});
qualificationRouter.put('/:leadId/responses', async (request, response) => {
  const input = responseSchema.parse(request.body);
  const lead = await prisma.lead.findFirst({
    where: { id: request.params.leadId, ...leadScope(response) },
    select: { productId: true }
  });
  if (!lead) return response.status(404).json({ message: 'Lead não encontrado.' });
  if (
    !(await prisma.productQuestion.findFirst({
      where: { id: input.questionId, productId: lead.productId }
    }))
  )
    return response.status(400).json({ message: 'Pergunta inválida para este produto.' });
  const updated = await prisma.$transaction(async (transaction) => {
    await transaction.leadQualificationResponse.upsert({
      where: { leadId_questionId: { leadId: request.params.leadId, questionId: input.questionId } },
      update: { answerJson: JSON.stringify(input.answer), points: input.points },
      create: {
        leadId: request.params.leadId,
        questionId: input.questionId,
        answerJson: JSON.stringify(input.answer),
        points: input.points
      }
    });
    const score = await transaction.leadQualificationResponse.aggregate({
      where: { leadId: request.params.leadId },
      _sum: { points: true }
    });
    return transaction.lead.update({
      where: { id: request.params.leadId },
      data: { score: Math.max(0, Math.min(100, score._sum.points ?? 0)) }
    });
  });
  await audit(response, 'QUALIFY', 'Lead', request.params.leadId as string, {
    score: updated.score
  });
  response.json({ score: updated.score });
});
