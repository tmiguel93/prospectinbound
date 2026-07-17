import { Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProductWizard } from './ProductWizard.js';
import { apiRequest } from '../../lib/api.js';

type Catalog = {
  partners: Array<{ id: string; name: string; active: boolean }>;
  pipelines: Array<{
    id: string;
    name: string;
    archived: boolean;
    stages: Array<{ id: string; name: string; color: string }>;
  }>;
  products: Array<{
    id: string;
    name: string;
    segment: string;
    active: boolean;
    partner: { name: string };
    plans: Array<{ id: string; name: string; priceCents: number; period: string }>;
    commissionRule: { fixedActivationCents: number; recurringPercentageBps: number } | null;
    pipeline: { name: string } | null;
  }>;
};

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function ProductCatalogPage() {
  const [catalog, setCatalog] = useState<Catalog>();
  const [error, setError] = useState<string>();
  const [wizardOpen, setWizardOpen] = useState(false);
  const load = () => {
    setError(undefined);
    apiRequest<Catalog>('/api/catalog/overview')
      .then(setCatalog)
      .catch(() => setError('Não foi possível carregar parceiros e produtos.'));
  };
  useEffect(load, []);

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-cyan-700">Catálogo</p>
          <h1 className="text-2xl font-bold">Parceiros, produtos e pipelines</h1>
          <p className="mt-2 text-slate-600">Configure a operação sem precisar alterar o código.</p>
        </div>
        <div className="flex gap-2">
          <button className="secondary-button" onClick={load} type="button">
            <RefreshCw size={16} />
            Atualizar
          </button>
          <button className="primary-button" onClick={() => setWizardOpen(true)} type="button">
            <Plus size={16} />
            Novo produto
          </button>
        </div>
      </div>
      {error && <p className="rounded-lg bg-rose-50 p-4 text-rose-800">{error}</p>}
      {!catalog && !error && <p className="text-slate-500">Carregando catálogo...</p>}
      {catalog && (
        <>
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <article className="stat-card">
              <div>
                <p className="text-sm text-slate-500">Parceiros ativos</p>
                <p className="mt-3 text-2xl font-bold">
                  {catalog.partners.filter((partner) => partner.active).length}
                </p>
              </div>
            </article>
            <article className="stat-card">
              <div>
                <p className="text-sm text-slate-500">Produtos ativos</p>
                <p className="mt-3 text-2xl font-bold">
                  {catalog.products.filter((product) => product.active).length}
                </p>
              </div>
            </article>
            <article className="stat-card">
              <div>
                <p className="text-sm text-slate-500">Pipelines disponíveis</p>
                <p className="mt-3 text-2xl font-bold">
                  {catalog.pipelines.filter((pipeline) => !pipeline.archived).length}
                </p>
              </div>
            </article>
          </div>
          <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            <section className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-semibold">Produtos</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {catalog.products.map((product) => (
                  <article className="p-5" key={product.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {product.partner.name} · {product.segment} ·{' '}
                          {product.pipeline?.name ?? 'Sem pipeline'}
                        </p>
                      </div>
                      <span className={`badge ${product.active ? 'badge-active' : ''}`}>
                        {product.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {product.plans.map((plan) => (
                        <span className="badge" key={plan.id}>
                          {plan.name}: {money.format(plan.priceCents / 100)}
                        </span>
                      ))}
                      {product.commissionRule && (
                        <span className="badge">
                          {product.commissionRule.recurringPercentageBps / 100}% recorrente
                        </span>
                      )}
                    </div>
                  </article>
                ))}
                {catalog.products.length === 0 && (
                  <p className="p-5 text-sm text-slate-500">Nenhum produto cadastrado.</p>
                )}
              </div>
            </section>
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold">Pipelines</h2>
              <div className="mt-4 space-y-4">
                {catalog.pipelines.map((pipeline) => (
                  <article key={pipeline.id}>
                    <p className="text-sm font-medium">{pipeline.name}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {pipeline.stages.map((stage) => (
                        <span
                          className="stage-chip"
                          key={stage.id}
                          style={{ borderColor: stage.color }}
                        >
                          {stage.name}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
      {wizardOpen && catalog && (
        <ProductWizard
          partners={catalog.partners}
          pipelines={catalog.pipelines}
          onClose={() => setWizardOpen(false)}
          onCreated={() => {
            setWizardOpen(false);
            load();
          }}
        />
      )}
    </section>
  );
}
