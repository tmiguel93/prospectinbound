import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { prisma } from '../../lib/prisma.js';

const dataDirectory = path.resolve(process.cwd(), 'data');
const backupsDirectory = path.resolve(process.cwd(), 'backups');
const databaseFile = path.join(dataDirectory, 'crm-local.db');
const execute = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL ?? '';
const isPostgres = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');

export type BackupFile = { name: string; size: number; createdAt: string };

function backupPath(name: string) {
  if (!/^[\w.-]+\.(db|dump)$/.test(name)) throw new Error('Arquivo de backup inválido.');
  const file = path.resolve(backupsDirectory, name);
  if (!file.startsWith(`${backupsDirectory}${path.sep}`))
    throw new Error('Arquivo de backup inválido.');
  return file;
}

export async function listBackups(): Promise<BackupFile[]> {
  await fs.mkdir(backupsDirectory, { recursive: true });
  const names = (await fs.readdir(backupsDirectory)).filter((name) => /\.(db|dump)$/.test(name));
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

async function assertPostgresDump(file: string) {
  const handle = await fs.open(file, 'r');
  try {
    const header = Buffer.alloc(5);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (bytesRead !== 5 || header.toString('utf8') !== 'PGDMP')
      throw new Error('O arquivo selecionado não é um backup PostgreSQL válido.');
  } finally {
    await handle.close();
  }
}

export async function createBackup() {
  if (isPostgres) return createPostgresBackup();
  const target = path.resolve(
    backupsDirectory,
    `crm-${new Date().toISOString().replaceAll(':', '-')}.db`
  );
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(databaseFile, target);
  return target;
}

async function createPostgresBackup() {
  const target = path.resolve(
    backupsDirectory,
    `crm-${new Date().toISOString().replaceAll(':', '-')}.dump`
  );
  await fs.mkdir(path.dirname(target), { recursive: true });
  await execute('pg_dump', ['--format=custom', '--file', target, databaseUrl]);
  return target;
}

export async function restoreBackup(name: string) {
  if (isPostgres) return restorePostgresBackup(name);
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

async function restorePostgresBackup(name: string) {
  const source = backupPath(name);
  if (!source.endsWith('.dump')) throw new Error('Selecione um backup PostgreSQL válido.');
  await fs.access(source);
  await assertPostgresDump(source);
  const emergencyFile = await createPostgresBackup();
  await prisma.$disconnect();
  try {
    await execute('pg_restore', [
      '--clean',
      '--if-exists',
      '--no-owner',
      '--dbname',
      databaseUrl,
      source
    ]);
  } catch (error) {
    try {
      await execute('pg_restore', [
        '--clean',
        '--if-exists',
        '--no-owner',
        '--dbname',
        databaseUrl,
        emergencyFile
      ]);
    } catch {
      // O erro original é mais útil para a operação e será retornado ao chamador.
    }
    throw error;
  } finally {
    await prisma.$connect();
  }
  return path.basename(emergencyFile);
}
