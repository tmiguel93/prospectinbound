import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../auth/auth.middleware.js';
export const exportsRouter = Router();
exportsRouter.use(requireAuth);
exportsRouter.get('/leads.csv', async (_q, res) => {
  const leads = await prisma.lead.findMany({ include: { product: true, stage: true } });
  const esc = (v: string | number | null | undefined) =>
    `"${String(v ?? '').replaceAll('"', '""')}"`;
  const rows = [
    'Estabelecimento,Produto,Etapa,Telefone,E-mail,Cidade,Estado',
    ...leads.map((l) =>
      [l.establishmentName, l.product.name, l.stage.name, l.phone, l.email, l.city, l.state]
        .map(esc)
        .join(',')
    )
  ];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.attachment('leads.csv').send(`\uFEFF${rows.join('\n')}`);
});
