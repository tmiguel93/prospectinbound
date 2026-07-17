import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import { healthResponseSchema } from '@prospectinbound/shared';
import { authRouter } from './modules/auth/auth.routes.js';
import { catalogRouter } from './modules/catalog/catalog.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { leadsRouter } from './modules/leads/leads.routes.js';
import { qualificationRouter } from './modules/qualification/qualification.routes.js';
import { errorHandler } from './shared/error-handler.js';

export const app = express();

app.use(cors());
app.use(express.json());
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
app.use(errorHandler);
