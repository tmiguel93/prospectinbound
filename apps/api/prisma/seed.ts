import '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';

const stages = ['Novo lead', 'Em contato', 'Qualificado', 'Demonstração/Reunião', 'Fechamento'];

async function createInitialProduct(name: string, segment: string, questions: string[]) {
  const partner = await prisma.partner.upsert({
    where: { name: 'Parceiro demonstrativo' },
    update: {},
    create: {
      name: 'Parceiro demonstrativo',
      notes: 'Dados iniciais configuráveis pelo administrador.'
    }
  });
  const pipeline = await prisma.pipeline.upsert({
    where: { name: `Pipeline — ${segment}` },
    update: {},
    create: { name: `Pipeline — ${segment}` }
  });
  await prisma.pipelineStage.deleteMany({ where: { pipelineId: pipeline.id } });
  await prisma.pipelineStage.createMany({
    data: stages.map((stage, position) => ({
      pipelineId: pipeline.id,
      name: stage,
      position,
      color: position === 4 ? '#16a34a' : '#0891b2',
      isInitial: position === 0,
      isFinal: position === 4
    }))
  });
  const product = await prisma.product.upsert({
    where: { partnerId_name: { partnerId: partner.id, name } },
    update: { segment, pipelineId: pipeline.id },
    create: {
      partnerId: partner.id,
      pipelineId: pipeline.id,
      name,
      segment,
      description: `Produto demonstrativo para ${segment.toLowerCase()}.`
    }
  });
  await prisma.plan.deleteMany({ where: { productId: product.id } });
  await prisma.plan.create({
    data: {
      productId: product.id,
      name: 'Plano Profissional',
      priceCents: 12990,
      period: 'MONTHLY',
      description: 'Plano mensal demonstrativo.'
    }
  });
  await prisma.commissionRule.upsert({
    where: { productId: product.id },
    update: {
      fixedActivationCents: 3000,
      recurringPercentageBps: 1000,
      unlimitedRecurrence: true,
      includeFirstPayment: true
    },
    create: {
      productId: product.id,
      fixedActivationCents: 3000,
      recurringPercentageBps: 1000,
      unlimitedRecurrence: true,
      includeFirstPayment: true
    }
  });
  await prisma.productQuestion.deleteMany({ where: { productId: product.id } });
  await prisma.productQuestion.createMany({
    data: questions.map((label, position) => ({
      productId: product.id,
      label,
      inputType: 'TEXT',
      position
    }))
  });
}

async function main() {
  await createInitialProduct('Sistema para Oficinas', 'Oficinas', [
    'Quantas pessoas trabalham na oficina?',
    'Como controlam as ordens de serviço?',
    'Quem decide pela contratação?'
  ]);
  await createInitialProduct('Sistema para Barbearias e Salões', 'Barbearias e Salões', [
    'Quantos profissionais trabalham no estabelecimento?',
    'Como os agendamentos são controlados?',
    'Quem decide pela contratação?'
  ]);
}

main().finally(() => prisma.$disconnect());
