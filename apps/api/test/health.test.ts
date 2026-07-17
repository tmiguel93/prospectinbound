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
