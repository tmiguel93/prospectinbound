import { access, copyFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { URL } from 'node:url';

const dataDirectory = new URL('../data/', import.meta.url);
const sourceDatabase = new URL('crm-local.db', dataDirectory);
const testDatabase = new URL('crm-test.db', dataDirectory);
const execute = promisify(execFile);

await mkdir(dataDirectory, { recursive: true });
try {
  await access(sourceDatabase);
  await copyFile(sourceDatabase, testDatabase);
} catch {
  await execute(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['prisma', 'db', 'push', '--skip-generate', '--schema', 'apps/api/schema.prisma'],
    {
      env: { ...process.env, DATABASE_URL: 'file:../../data/crm-test.db' }
    }
  );
}
