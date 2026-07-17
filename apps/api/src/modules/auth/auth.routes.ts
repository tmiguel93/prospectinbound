import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from './auth.middleware.js';
import { loginSchema, setupAdminSchema } from './auth.schemas.js';
import {
  authenticate,
  createFirstAdministrator,
  createSessionToken,
  toPublicUser
} from './auth.service.js';

const sessionCookie = 'prospectinbound_session';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.isProduction,
  maxAge: 8 * 60 * 60 * 1000,
  path: '/'
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Tente novamente em alguns minutos.' }
});

export const authRouter = Router();

authRouter.get('/status', async (_request, response) => {
  const userCount = await prisma.user.count();
  response.json({ initialized: userCount > 0 });
});

authRouter.post('/setup', async (request, response) => {
  const input = setupAdminSchema.parse(request.body);
  const user = await createFirstAdministrator(input);
  if (!user) {
    response.status(409).json({ message: 'O administrador inicial já foi criado.' });
    return;
  }

  response
    .status(201)
    .cookie(sessionCookie, createSessionToken(user), cookieOptions)
    .json({ user: toPublicUser(user) });
});

authRouter.post('/login', loginLimiter, async (request, response) => {
  const input = loginSchema.parse(request.body);
  const user = await authenticate(input.email, input.password);
  if (!user) {
    response.status(401).json({ message: 'E-mail ou senha inválidos.' });
    return;
  }

  response
    .cookie(sessionCookie, createSessionToken(user), cookieOptions)
    .json({ user: toPublicUser(user) });
});

authRouter.post('/logout', (_request, response) => {
  response.clearCookie(sessionCookie, cookieOptions).status(204).send();
});

authRouter.get('/me', requireAuth, (_request, response) => {
  response.json({ user: response.locals.user });
});
