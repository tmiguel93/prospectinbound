import { CalendarDays, CircleDollarSign, ContactRound, Target, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest, type DashboardSummary } from '../../lib/api.js';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const cards = (summary: DashboardSummary) => [
  { label: 'Leads novos', value: summary.newLeads, icon: Users },
  { label: 'Em contato', value: summary.contactsInProgress, icon: ContactRound },
  { label: 'Qualificados', value: summary.qualifiedLeads, icon: Target },
  { label: 'Reuniões agendadas', value: summary.scheduledMeetings, icon: CalendarDays },
  { label: 'Vendas no mês', value: summary.monthlySales, icon: CircleDollarSign },
  { label: 'Clientes ativos', value: summary.activeCustomers, icon: Users },
  {
    label: 'Comissão projetada',
    value: money.format(summary.projectedCommissionCents / 100),
    icon: CircleDollarSign
  },
  {
    label: 'Comissão disponível',
    value: money.format(summary.availableCommissionCents / 100),
    icon: CircleDollarSign
  }
];

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    apiRequest<DashboardSummary>('/api/dashboard/summary')
      .then(setSummary)
      .catch(() => setError('Não foi possível carregar os indicadores.'));
  }, []);

  return (
    <section>
      <div className="mb-8">
        <p className="eyebrow text-cyan-700">Dashboard</p>
        <h1 className="text-2xl font-bold tracking-tight">Acompanhe sua operação</h1>
        <p className="mt-2 text-slate-600">
          Os indicadores serão preenchidos conforme os módulos comerciais forem disponibilizados.
        </p>
      </div>
      {error && <p className="rounded-lg bg-rose-50 p-4 text-rose-800">{error}</p>}
      {!summary && !error && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div className="h-32 animate-pulse rounded-xl bg-slate-200" key={index} />
          ))}
        </div>
      )}
      {summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards(summary).map(({ label, value, icon: Icon }) => (
              <article className="stat-card" key={label}>
                <div>
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-3 text-2xl font-bold">{value}</p>
                </div>
                <Icon className="text-cyan-700" size={22} />
              </article>
            ))}
          </div>
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold">Atividades pendentes</h2>
            <p className="mt-2 text-sm text-slate-600">
              Nenhuma atividade atrasada. O controle de atividades será disponibilizado no módulo de
              Leads.
            </p>
          </section>
        </>
      )}
    </section>
  );
}
