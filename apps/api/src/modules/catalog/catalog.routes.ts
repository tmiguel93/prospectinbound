import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAdmin, requireAuth } from '../auth/auth.middleware.js';
import {
  partnerSchema,
  pipelineSchema,
  wizardSchema,
  type WizardInput
} from './catalog.schemas.js';

const catalogInclude = {
  partner: true,
  plans: true,
  commissionRule: true,
  pipeline: { include: { stages: { orderBy: { position: 'asc' as const } } } },
  questions: { orderBy: { position: 'asc' as const } }
};

async function createWizard(input: WizardInput) {
  return prisma.$transaction(async (transaction) => {
    const partner = input.partnerId
      ? await transaction.partner.findUniqueOrThrow({ where: { id: input.partnerId } })
      : await transaction.partner.upsert({
          where: { name: input.partnerName! },
          update: {},
          create: { name: input.partnerName! }
        });
    const pipeline = input.pipelineId
      ? await transaction.pipeline.findUniqueOrThrow({ where: { id: input.pipelineId } })
      : await transaction.pipeline.create({
          data: {
            name: input.pipeline!.name,
            stages: {
              create: input.pipeline!.stages.map((stage, position) => ({ ...stage, position }))
            }
          }
        });
    const product = await transaction.product.create({
      data: {
        partnerId: partner.id,
        pipelineId: pipeline.id,
        ...input.product,
        demoUrl: input.product.demoUrl || null,
        signupUrl: input.product.signupUrl || null,
        plans: { create: input.plans },
        commissionRule: { create: input.commission },
        questions: {
          create: input.questions.map((question, position) => ({ ...question, position }))
        }
      },
      include: catalogInclude
    });
    return product;
  });
}

export const catalogRouter = Router();
catalogRouter.use(requireAuth);

catalogRouter.get('/overview', async (_request, response) => {
  const [partners, products, pipelines] = await Promise.all([
    prisma.partner.findMany({ orderBy: { name: 'asc' } }),
    prisma.product.findMany({ include: catalogInclude, orderBy: { name: 'asc' } }),
    prisma.pipeline.findMany({
      include: { stages: { orderBy: { position: 'asc' } } },
      orderBy: { name: 'asc' }
    })
  ]);
  response.json({ partners, products, pipelines });
});

catalogRouter.post('/partners', requireAdmin, async (request, response) => {
  const input = partnerSchema.parse(request.body);
  const partner = await prisma.partner.create({ data: input });
  response.status(201).json({ partner });
});

catalogRouter.post('/pipelines', requireAdmin, async (request, response) => {
  const input = pipelineSchema.parse(request.body);
  const pipeline = await prisma.pipeline.create({
    data: {
      name: input.name,
      stages: { create: input.stages.map((stage, position) => ({ ...stage, position })) }
    },
    include: { stages: { orderBy: { position: 'asc' } } }
  });
  response.status(201).json({ pipeline });
});

catalogRouter.post('/wizard', requireAdmin, async (request, response) => {
  const product = await createWizard(wizardSchema.parse(request.body));
  response.status(201).json({ product });
});
