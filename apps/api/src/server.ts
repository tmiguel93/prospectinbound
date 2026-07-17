import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { app } from './app.js';

const host = process.env.HOST ?? '0.0.0.0';
const port = Number(process.env.PORT ?? 3000);
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.resolve(currentDirectory, '../../web/dist');

app.use(express.static(webDist));
app.get('/{*splat}', (_request, response) => response.sendFile(path.join(webDist, 'index.html')));

app.listen(port, host, () => {
  console.log(`CRM local disponível em http://localhost:${port}`);
  console.log(`Acesso na rede local: http://<IP-DO-COMPUTADOR>:${port}`);
});
