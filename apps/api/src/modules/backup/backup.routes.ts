import { Router } from 'express';
import { requireAdmin, requireAuth } from '../auth/auth.middleware.js';
import { createBackup } from './backup.service.js';
export const backupRouter = Router();
backupRouter.use(requireAuth, requireAdmin);
backupRouter.post('/', async (_q, res) => res.status(201).json({ file: await createBackup() }));
