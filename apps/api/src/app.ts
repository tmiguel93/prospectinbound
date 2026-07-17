import cors from 'cors';
import express from 'express';
import { healthResponseSchema } from '@prospectinbound/shared';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_request, response) => {
  const payload = healthResponseSchema.parse({ status: 'ok' });
  response.status(200).json(payload);
});
