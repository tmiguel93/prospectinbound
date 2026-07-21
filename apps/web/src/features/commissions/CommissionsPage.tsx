import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api.js';

type CommissionEntry = {
  id: string;
  type: string;
  baseCents: number;
  percentageBps: number;
  amountCents: number;
  status: string;
  sale: { lead: { establishmentName: string }; product: { name: string } };
  payment: { paidAt: string };
};

type CommissionResponse = { entries: CommissionEntry[]; totals: Record<string, number> };

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const statusLabel: Record<string, string> = {
  CONFIRMED: 'Disponível para pagamento',
  PAID: 'Paga',
  REVERSED: 'Estornada'
};

function formatMoney(cents: number) {
  return money.format(cents / 100);
}

export function CommissionsPage({ canManage }: { canManage: boolean }) {
  const [data, setData] = useState<CommissionResponse>({ entries: [], totals: {} });
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string>();

  const load = async () => {
    try {
      setError('');
      setData(await apiRequest<CommissionResponse>('/api/commissions'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as comissões.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const runAction = async (entry: CommissionEntry, action: 'pay' | 'reverse') => {
    const verb = action === 'pay' ? 'marcar como paga' : 'estornar';
    if (!window.confirm(`Deseja ${verb} a comissão de ${formatMoney(entry.amountCents)}?`)) return;
    try {
      setBusyId(entry.id);
      setError('');
      await apiRequest(`/api/commissions/${entry.id}/${action}`, { method: 'POST' });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a operação.');
    } finally {
      setBusyId(undefined);
    }
  };

  const available = data.totals.CONFIRMED ?? 0;
  const paid = data.totals.PAID ?? 0;
  const reversed = data.totals.REVERSED ?? 0;
  return (
    <section>
      <p className="eyebrow text-cyan-700">Financeiro</p>
      <h1 className="text-2xl font-bold">Comissões</h1>
      <p className="mt-1 text-sm text-slate-500">
        Acompanhe lançamentos gerados pelos pagamentos confirmados.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="stat-card">
          <span>Disponível para pagamento</span>
          <strong>{formatMoney(available)}</strong>
        </article>
        <article className="stat-card">
          <span>Já pago</span>
          <strong>{formatMoney(paid)}</strong>
        </article>
        <article className="stat-card">
          <span>Estornado</span>
          <strong>{formatMoney(reversed)}</strong>
        </article>
      </div>
      {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Regra</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-4 py-4">
                    <strong>{entry.sale.lead.establishmentName}</strong>
                    <br />
                    <span className="text-xs text-slate-500">
                      {entry.sale.product.name} ·{' '}
                      {new Date(entry.payment.paidAt).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    {entry.type === 'REVERSAL'
                      ? 'Estorno'
                      : `${(entry.percentageBps / 100).toLocaleString('pt-BR')}% sobre ${formatMoney(entry.baseCents)}`}
                  </td>
                  <td
                    className={`px-4 py-4 font-semibold ${entry.amountCents < 0 ? 'text-rose-700' : ''}`}
                  >
                    {formatMoney(entry.amountCents)}
                  </td>
                  <td className="px-4 py-4">
                    <span className="badge">{statusLabel[entry.status] ?? entry.status}</span>
                  </td>
                  <td className="px-4 py-4">
                    {canManage && (
                      <div className="flex gap-2">
                        {entry.status === 'CONFIRMED' && (
                          <button
                            className="primary-button"
                            disabled={busyId === entry.id}
                            onClick={() => void runAction(entry, 'pay')}
                          >
                            Pagar
                          </button>
                        )}
                        {entry.type !== 'REVERSAL' && (
                          <button
                            className="secondary-button"
                            disabled={busyId === entry.id}
                            onClick={() => void runAction(entry, 'reverse')}
                          >
                            Estornar
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!data.entries.length && (
                <tr>
                  <td className="px-4 py-8 text-slate-500" colSpan={5}>
                    Nenhum lançamento de comissão foi gerado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
