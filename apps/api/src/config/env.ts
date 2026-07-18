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
  corsOrigins,
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim(),
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
    appSecret: process.env.WHATSAPP_APP_SECRET?.trim(),
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN?.trim(),
    apiVersion: process.env.WHATSAPP_API_VERSION?.trim()
  }
};

if (
  env.isProduction &&
  (!configuredJwtSecret ||
    configuredJwtSecret === defaultDevelopmentSecret ||
    configuredJwtSecret.length < 32)
) {
  throw new Error('JWT_SECRET deve ter ao menos 32 caracteres em produção.');
}
