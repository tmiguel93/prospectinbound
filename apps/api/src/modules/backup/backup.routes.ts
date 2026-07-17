import { Router } from 'express';
import { audit } from '../audit/audit.service.js';
import { requireAdmin, requireAuth } from '../auth/auth.middleware.js';
import { createBackup, listBackups, restoreBackup } from './backup.service.js';

export const backupRouter = Router();
backupRouter.use(requireAuth, requireAdmin);

backupRouter.get('/', async (_request, response) => {
  response.json({ files: await listBackups() });
});

backupRouter.post('/', async (_request, response) => {
  const file = await createBackup();
  const name = file.split(/[\\/]/).pop()!;
  await audit(response, 'BACKUP', 'Database', undefined, { file: name });
  response.status(201).json({ file: name });
});

backupRouter.post('/restore', async (request, response) => {
  const file = String(request.body?.file ?? '');
  if (request.body?.confirmation !== `RESTAURAR ${file}`)
    return response.status(400).json({ message: 'Confirmação de restauração inválida.' });
  try {
    const emergencyFile = await restoreBackup(file);
    await audit(response, 'RESTORE', 'Database', undefined, { file, emergencyFile });
    response.json({ restored: file, emergencyFile });
  } catch (error) {
    response.status(400).json({
      message: error instanceof Error ? error.message : 'Não foi possível restaurar o backup.'
    });
  }
});
