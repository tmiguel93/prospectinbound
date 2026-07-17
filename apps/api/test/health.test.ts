import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

describe('GET /health', () => {
  it('returns the API health status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('local authentication', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates the first administrator with a hashed password and protects routes', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    const agent = request.agent(app);
    const setup = await agent.post('/api/auth/setup').send({
      name: 'Administradora Local',
      email: 'admin@example.com',
      password: 'senha-segura-123'
    });
    expect(setup.status).toBe(201);
    expect(setup.headers['set-cookie'][0]).toContain('HttpOnly');
    const storedUser = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@example.com' }
    });
    expect(storedUser.passwordHash).not.toBe('senha-segura-123');
    expect(storedUser.role).toBe('ADMIN');
    expect((await agent.get('/api/auth/me')).status).toBe(200);
    expect(
      (
        await request(app)
          .post('/api/auth/setup')
          .send({ name: 'Outro Admin', email: 'other@example.com', password: 'senha-segura-123' })
      ).status
    ).toBe(409);
    expect((await agent.post('/api/auth/logout')).status).toBe(204);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('allows a valid login and rejects invalid credentials', async () => {
    await request(app)
      .post('/api/auth/setup')
      .send({ name: 'Admin', email: 'admin@example.com', password: 'senha-segura-123' });
    expect(
      (
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'admin@example.com', password: 'senha-incorreta' })
      ).status
    ).toBe(401);
    const agent = request.agent(app);
    expect(
      (
        await agent
          .post('/api/auth/login')
          .send({ email: 'admin@example.com', password: 'senha-segura-123' })
      ).status
    ).toBe(200);
    expect((await agent.get('/api/auth/me')).status).toBe(200);
  });
});

describe('catalog wizard', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a configurable product, its plans, rule and five-stage pipeline', async () => {
    const stamp = Date.now();
    const agent = request.agent(app);
    await agent.post('/api/auth/setup').send({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'senha-segura-123'
    });
    const created = await agent.post('/api/catalog/wizard').send({
      partnerName: `Parceiro de teste ${stamp}`,
      product: { name: `Produto de teste ${stamp}`, segment: 'Testes', active: true },
      plans: [{ name: 'Mensal', priceCents: 12990, period: 'MONTHLY', active: true }],
      commission: {
        fixedActivationCents: 3000,
        recurringPercentageBps: 1000,
        maxMonths: null,
        unlimitedRecurrence: true,
        includeFirstPayment: true,
        safetyDays: 0
      },
      pipeline: {
        name: `Pipeline de teste ${stamp}`,
        stages: ['Novo', 'Contato', 'Qualificado', 'Reunião', 'Fechamento'].map((name, index) => ({
          name,
          color: '#0891b2',
          isInitial: index === 0,
          isFinal: index === 4
        }))
      },
      questions: [{ label: 'Pergunta inicial?', inputType: 'TEXT' }]
    });

    expect(created.status).toBe(201);
    expect(created.body.product.plans[0].priceCents).toBe(12990);
    expect(created.body.product.commissionRule.fixedActivationCents).toBe(3000);
    expect(created.body.product.pipeline.stages).toHaveLength(5);
    expect((await agent.get('/api/catalog/overview')).body.products).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: `Produto de teste ${stamp}` })])
    );
  });
});

describe('CSV lead import', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('imports valid rows and returns a line-level duplicate report', async () => {
    const stamp = Date.now();
    const partner = await prisma.partner.create({ data: { name: `Parceiro importação ${stamp}` } });
    const pipeline = await prisma.pipeline.create({
      data: { name: `Pipeline importação ${stamp}` }
    });
    const stage = await prisma.pipelineStage.create({
      data: {
        pipelineId: pipeline.id,
        name: 'Entrada',
        color: '#0891b2',
        position: 0,
        isInitial: true
      }
    });
    const product = await prisma.product.create({
      data: {
        partnerId: partner.id,
        pipelineId: pipeline.id,
        name: `Produto importação ${stamp}`,
        segment: 'Teste'
      }
    });
    const agent = request.agent(app);
    await agent.post('/api/auth/setup').send({
      name: 'Admin',
      email: `import-${stamp}@example.com`,
      password: 'senha-segura-123'
    });
    const payload = {
      productId: product.id,
      pipelineId: pipeline.id,
      stageId: stage.id,
      rows: [
        {
          establishmentName: 'Oficina Importada',
          email: `contato-${stamp}@example.com`,
          city: 'São Paulo',
          state: 'SP'
        }
      ]
    };
    expect((await agent.post('/api/imports/leads').send(payload)).body.count).toBe(1);
    const duplicate = await agent.post('/api/imports/leads').send(payload);
    expect(duplicate.status).toBe(422);
    expect(duplicate.body.errors).toEqual([
      { row: 2, message: 'E-mail, telefone ou WhatsApp duplicado.' }
    ]);
  });
});

describe('local backups', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a listed backup and requires explicit confirmation for restoration', async () => {
    const stamp = Date.now();
    const agent = request.agent(app);
    await agent.post('/api/auth/setup').send({
      name: 'Admin',
      email: `backup-${stamp}@example.com`,
      password: 'senha-segura-123'
    });
    const created = await agent.post('/api/backups');
    expect(created.status).toBe(201);
    expect(created.body.file).toMatch(/^crm-.*\.db$/);
    expect((await agent.get('/api/backups')).body.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: created.body.file, size: expect.any(Number) })
      ])
    );
    expect(
      (
        await agent
          .post('/api/backups/restore')
          .send({ file: created.body.file, confirmation: 'confirmar' })
      ).status
    ).toBe(400);
  });
});
