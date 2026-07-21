import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api.js';
type Sale = {
  id: string;
  amountCents: number;
  status: string;
  soldAt: string;
  lead: { establishmentName: string };
  product: { name: string };
  plan: { name: string };
  subscription: { status: string } | null;
  payments: Array<{ id: string; amountCents: number; paidAt: string }>;
};
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export function SalesPage({ canManage }: { canManage: boolean }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [error, setError] = useState('');
  const load = () =>
    apiRequest<{ sales: Sale[] }>('/api/sales')
      .then((x) => setSales(x.sales))
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  const confirm = async (id: string, amount: number) => {
    await apiRequest(`/api/sales/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify({ amountCents: amount, paidAt: new Date().toISOString() })
    });
    load();
  };
  const cancel = async (id: string) => {
    if (!window.confirm('Cancelar esta venda e a assinatura vinculada?')) return;
    try {
      await apiRequest(`/api/sales/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELED' })
      });
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível cancelar a venda.');
    }
  };
  return (
    <section>
      <p className="eyebrow text-cyan-700">Comercial</p>
      <h1 className="text-2xl font-bold">Vendas e assinaturas</h1>
      {error && <p className="mt-4 text-rose-700">{error}</p>}
      <div className="mt-6 rounded-xl border bg-white divide-y">
        {sales.map((s) => (
          <article className="p-5" key={s.id}>
            <div className="flex justify-between">
              <div>
                <b>{s.lead.establishmentName}</b>
                <p className="text-sm text-slate-600">
                  {s.product.name} · {s.plan.name} · {money.format(s.amountCents / 100)}
                </p>
                <p className="text-xs text-slate-500">
                  Venda: {s.status} · Assinatura: {s.subscription?.status ?? '—'} · Pagamentos:{' '}
                  {s.payments.length}
                </p>
              </div>
              {canManage && (
                <div className="flex gap-2">
                  {s.status !== 'PAYMENT_CONFIRMED' && s.status !== 'CANCELED' && (
                    <button className="primary-button" onClick={() => confirm(s.id, s.amountCents)}>
                      Confirmar pagamento
                    </button>
                  )}
                  {s.status !== 'CANCELED' && (
                    <button className="secondary-button" onClick={() => void cancel(s.id)}>
                      Cancelar
                    </button>
                  )}
                </div>
              )}
            </div>
          </article>
        ))}
        {!sales.length && <p className="p-5 text-slate-500">Nenhuma venda registrada.</p>}
      </div>
    </section>
  );
}
