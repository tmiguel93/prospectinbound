import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sqliteSchema = resolve(rootDirectory, 'apps/api/schema.prisma');
const postgresSchema = resolve(rootDirectory, 'apps/api/postgres/schema.prisma');
const schema = await readFile(sqliteSchema, 'utf8');

if (!schema.includes('provider = "sqlite"')) {
  throw new Error('O schema SQLite esperado não foi encontrado.');
}

await mkdir(dirname(postgresSchema), { recursive: true });
await writeFile(postgresSchema, schema.replace('provider = "sqlite"', 'provider = "postgresql"'));
