import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { healthResponseSchema } from '@prospectinbound/shared';
import { env } from './config/env.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { catalogRouter } from './modules/catalog/catalog.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { leadsRouter } from './modules/leads/leads.routes.js';
import { qualificationRouter } from './modules/qualification/qualification.routes.js';
import { meetingsRouter } from './modules/meetings/meetings.routes.js';
import { salesRouter } from './modules/sales/sales.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { exportsRouter } from './modules/exports/exports.routes.js';
import { backupRouter } from './modules/backup/backup.routes.js';
import { importsRouter } from './modules/imports/imports.routes.js';
import { commissionsRouter } from './modules/commissions/commissions.routes.js';
import { whatsappRouter } from './modules/whatsapp/whatsapp.routes.js';
import { errorHandler } from './shared/error-handler.js';

export const app = express();

app.use(helmet({ contentSecurityPolicy: env.isProduction ? undefined : false }));
app.use(
  cors({
    origin: env.isProduction ? env.corsOrigins : true,
    credentials: true
  })
);
app.use(
  express.json({
    limit: '1mb',
    verify: (request, _response, buffer) => {
      (request as typeof request & { rawBody?: Buffer }).rawBody = buffer;
    }
  })
);
app.use(cookieParser());

app.get('/health', (_request, response) => {
  const payload = healthResponseSchema.parse({ status: 'ok' });
  response.status(200).json(payload);
});

app.use('/api/auth', authRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/qualifications', qualificationRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/sales', salesRouter);
app.use('/api/audit', auditRouter);
app.use('/api/users', usersRouter);
app.use('/api/exports', exportsRouter);
app.use('/api/backups', backupRouter);
app.use('/api/imports', importsRouter);
app.use('/api/commissions', commissionsRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use(errorHandler);
