import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api.js';

type Pipeline = {
  id: string;
  name: string;
  archived: boolean;
  stages: Array<{ id: string; name: string; color: string }>;
};
type Sale = {
  id: string;
  amountCents: number;
  lead: { establishmentName: string };
  product: { name: string };
  plan: { name: string };
  subscription: { status: string; currentCents: number; startedAt: string | null } | null;
};
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function PipelinesPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    apiRequest<{ pipelines: Pipeline[] }>('/api/catalog/overview')
      .then((result) => setPipelines(result.pipelines))
      .catch((cause) => setError(cause.message));
  }, []);
  return (
    <section>
      <p className="eyebrow text-cyan-700">Operação</p>
      <h1 className="text-2xl font-bold">Pipelines</h1>
      <p className="mt-1 text-sm text-slate-500">
        Etapas configuradas para a qualificação e avanço dos leads.
      </p>
      {error && <p className="mt-4 text-rose-700">{error}</p>}
      <div className="mt-6 space-y-4">
        {pipelines.map((pipeline) => (
          <article className="rounded-xl border bg-white p-5" key={pipeline.id}>
            <div className="flex justify-between">
              <b>{pipeline.name}</b>
              <span className="badge">{pipeline.archived ? 'Arquivado' : 'Ativo'}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {pipeline.stages.map((stage) => (
                <span className="stage-chip" key={stage.id} style={{ borderColor: stage.color }}>
                  {stage.name}
                </span>
              ))}
            </div>
          </article>
        ))}
        {!pipelines.length && <p className="text-slate-500">Nenhum pipeline configurado.</p>}
      </div>
    </section>
  );
}

export function SubscriptionsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    apiRequest<{ sales: Sale[] }>('/api/sales')
      .then((result) => setSales(result.sales.filter((sale) => sale.subscription)))
      .catch((cause) => setError(cause.message));
  }, []);
  return (
    <section>
      <p className="eyebrow text-cyan-700">Comercial</p>
      <h1 className="text-2xl font-bold">Assinaturas</h1>
      {error && <p className="mt-4 text-rose-700">{error}</p>}
      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-[42rem] divide-y text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Produto e plano</th>
              <th className="px-4 py-3">Mensalidade</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="px-4 py-3 font-medium">{sale.lead.establishmentName}</td>
                <td className="px-4 py-3">
                  {sale.product.name} · {sale.plan.name}
                </td>
                <td className="px-4 py-3">
                  {money.format((sale.subscription?.currentCents ?? sale.amountCents) / 100)}
                </td>
                <td className="px-4 py-3">
                  <span className="badge">{sale.subscription?.status}</span>
                </td>
              </tr>
            ))}
            {!sales.length && (
              <tr>
                <td className="px-4 py-8 text-slate-500" colSpan={4}>
                  Nenhuma assinatura cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
