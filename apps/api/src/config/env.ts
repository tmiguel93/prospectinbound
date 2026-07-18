import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDirectory, '../../../../.env') });

const defaultDevelopmentSecret = 'local-development-secret-change-before-production';
const configuredJwtSecret = process.env.JWT_SECRET?.trim();
const corsOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  isProduction: process.env.NODE_ENV === 'production',
  jwtSecret: configuredJwtSecret || defaultDevelopmentSecret,
  corsOrigins
};

if (
  env.isProduction &&
  (!configuredJwtSecret ||
    configuredJwtSecret === defaultDevelopmentSecret ||
    configuredJwtSecret.length < 32)
) {
  throw new Error('JWT_SECRET deve ter ao menos 32 caracteres em produção.');
}
