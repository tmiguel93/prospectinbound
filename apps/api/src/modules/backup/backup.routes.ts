import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import { audit } from '../audit/audit.service.js';
import { requireAdmin, requireAuth } from '../auth/auth.middleware.js';
import { createBackup } from './backup.service.js';

export const backupRouter = Router();
backupRouter.use(requireAuth, requireAdmin);
backupRouter.get('/', async (_q, res) => {
  const directory = path.resolve(process.cwd(), 'backups');
  await fs.mkdir(directory, { recursive: true });
  res.json({ files: (await fs.readdir(directory)).filter((file) => file.endsWith('.db')) });
});
backupRouter.post('/', async (_q, res) => {
  const file = await createBackup();
  await audit(res, 'BACKUP', 'Database', undefined, { file });
  res.status(201).json({ file });
});
backupRouter.post('/restore', async (req, res) => {
  const file = String(req.body?.file ?? '');
  if (!/^[\w.-]+\.db$/.test(file)) return res.status(400).json({ message: 'Arquivo inválido.' });
  const source = path.resolve(process.cwd(), 'backups', file);
  const target = path.resolve(process.cwd(), 'data', 'crm-local.db');
  if (!source.startsWith(path.resolve(process.cwd(), 'backups')))
    return res.status(400).json({ message: 'Arquivo inválido.' });
  await createBackup();
  await fs.copyFile(source, target);
  await audit(res, 'RESTORE', 'Database', undefined, { file });
  res.status(204).send();
});
