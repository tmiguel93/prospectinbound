import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api.js';
type Report = {
  sales: { _sum: { amountCents: number | null }; _count: number };
  commissions: number;
  subscriptions: Array<{ status: string; _count: number; _sum: { currentCents: number | null } }>;
  leadsByStage: Array<{ name: string; count: number }>;
};
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export function ReportsPage() {
  const [report, setReport] = useState<Report>();
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const load = () => {
    const query = new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) });
    apiRequest<Report>(`/api/dashboard/report?${query}`)
      .then(setReport)
      .catch((cause) => setError(cause.message));
  };
  useEffect(() => {
    load();
  }, []);
  return (
    <section>
      <p className="eyebrow text-cyan-700">Análise</p>
      <h1 className="text-2xl font-bold">Relatórios</h1>
      <form
        className="mt-5 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          load();
        }}
      >
        <label className="label">
          De
          <input
            className="field"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="label">
          Até
          <input
            className="field"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <button className="primary-button" type="submit">
          Aplicar período
        </button>
      </form>
      {error && <p className="mt-4 text-rose-700">{error}</p>}
      {report && (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="stat-card">
              <span>Vendas confirmadas</span>
              <b>{report.sales._count}</b>
            </article>
            <article className="stat-card">
              <span>Valor comercial</span>
              <b>{money.format((report.sales._sum.amountCents ?? 0) / 100)}</b>
            </article>
            <article className="stat-card">
              <span>Comissões líquidas</span>
              <b>{money.format(report.commissions / 100)}</b>
            </article>
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <section className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold">Leads por etapa</h2>
              {report.leadsByStage.map((item) => (
                <div className="mt-3 flex justify-between" key={item.name}>
                  <span>{item.name}</span>
                  <b>{item.count}</b>
                </div>
              ))}
            </section>
            <section className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold">Assinaturas por status</h2>
              {report.subscriptions.map((item) => (
                <div className="mt-3 flex justify-between" key={item.status}>
                  <span>{item.status}</span>
                  <b>
                    {item._count} · {money.format((item._sum.currentCents ?? 0) / 100)}
                  </b>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
