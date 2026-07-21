import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { readSessionToken, toPublicUser } from './auth.service.js';

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = request.cookies.prospectinbound_session as string | undefined;
  const session = token ? readSessionToken(token) : null;
  if (!session) {
    response.status(401).json({ message: 'Autenticação necessária.' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || !user.active || user.sessionVersion !== session.sessionVersion) {
    response.status(401).json({ message: 'Sessão inválida.' });
    return;
  }

  response.locals.user = toPublicUser(user);
  next();
}

export function requireAdmin(_request: Request, response: Response, next: NextFunction) {
  if (response.locals.user?.role !== 'ADMIN') {
    response.status(403).json({ message: 'Acesso restrito a administradores.' });
    return;
  }

  next();
}
