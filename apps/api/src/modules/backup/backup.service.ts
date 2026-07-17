import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../../lib/prisma.js';

const dataDirectory = path.resolve(process.cwd(), 'data');
const backupsDirectory = path.resolve(process.cwd(), 'backups');
const databaseFile = path.join(dataDirectory, 'crm-local.db');

export type BackupFile = { name: string; size: number; createdAt: string };

function backupPath(name: string) {
  if (!/^[\w.-]+\.db$/.test(name)) throw new Error('Arquivo de backup inválido.');
  const file = path.resolve(backupsDirectory, name);
  if (!file.startsWith(`${backupsDirectory}${path.sep}`))
    throw new Error('Arquivo de backup inválido.');
  return file;
}

export async function listBackups(): Promise<BackupFile[]> {
  await fs.mkdir(backupsDirectory, { recursive: true });
  const names = (await fs.readdir(backupsDirectory)).filter((name) => name.endsWith('.db'));
  const files = await Promise.all(
    names.map(async (name) => {
      const stat = await fs.stat(backupPath(name));
      return { name, size: stat.size, createdAt: stat.birthtime.toISOString() };
    })
  );
  return files.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

async function assertSqliteFile(file: string) {
  const handle = await fs.open(file, 'r');
  try {
    const header = Buffer.alloc(16);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (bytesRead !== 16 || header.toString('utf8') !== 'SQLite format 3\u0000')
      throw new Error('O arquivo selecionado não é um backup SQLite válido.');
  } finally {
    await handle.close();
  }
}

export async function createBackup() {
  const target = path.resolve(
    backupsDirectory,
    `crm-${new Date().toISOString().replaceAll(':', '-')}.db`
  );
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(databaseFile, target);
  return target;
}

export async function restoreBackup(name: string) {
  const source = backupPath(name);
  await fs.access(source);
  await assertSqliteFile(source);
  const emergencyFile = await createBackup();
  await prisma.$disconnect();
  try {
    await fs.copyFile(source, databaseFile);
  } catch (error) {
    await fs.copyFile(emergencyFile, databaseFile);
    throw error;
  } finally {
    await prisma.$connect();
  }
  return path.basename(emergencyFile);
}
