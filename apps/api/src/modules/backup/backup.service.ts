import fs from 'node:fs/promises';
import path from 'node:path';
export async function createBackup() {
  const root = path.resolve(process.cwd(), 'data');
  const target = path.resolve(
    process.cwd(),
    'backups',
    `crm-${new Date().toISOString().replaceAll(':', '-')}.db`
  );
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(path.join(root, 'crm-local.db'), target);
  return target;
}
