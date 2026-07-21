import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { User, UserRole } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import type { SetupAdminInput } from './auth.schemas.js';

const passwordRounds = 12;

export type SessionPayload = {
  sub: string;
  role: UserRole;
  sessionVersion: number;
};

export const toPublicUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  active: user.active
});

export async function createFirstAdministrator(input: SetupAdminInput) {
  const totalUsers = await prisma.user.count();
  if (totalUsers > 0) {
    return null;
  }

  const passwordHash = await bcrypt.hash(input.password, passwordRounds);
  return prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash, role: 'ADMIN' }
  });
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
    return null;
  }

  return user;
}

export function createSessionToken(user: User) {
  return jwt.sign({ role: user.role, sessionVersion: user.sessionVersion }, env.jwtSecret, {
    subject: user.id,
    expiresIn: '8h'
  });
}

export function readSessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (
      typeof decoded === 'string' ||
      !decoded.sub ||
      typeof decoded.role !== 'string' ||
      typeof decoded.sessionVersion !== 'number'
    ) {
      return null;
    }

    return {
      sub: decoded.sub,
      role: decoded.role as UserRole,
      sessionVersion: decoded.sessionVersion
    };
  } catch {
    return null;
  }
}
