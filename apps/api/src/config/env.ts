import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDirectory, '../../../../.env') });

export const env = {
  isProduction: process.env.NODE_ENV === 'production',
  jwtSecret: process.env.JWT_SECRET ?? 'local-development-secret-change-before-production'
};

if (env.isProduction && env.jwtSecret === 'local-development-secret-change-before-production') {
  throw new Error('JWT_SECRET é obrigatório em produção.');
}
