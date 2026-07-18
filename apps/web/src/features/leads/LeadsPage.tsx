import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import { Plus, Search, Upload } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { apiRequest } from '../../lib/api.js';
import { QualificationModal } from './QualificationModal.js';
import { ImportLeadsModal } from './ImportLeadsModal.js';

type Stage = { id: string; name: string; color: string; position: number };
type Catalog = {
  products: Array<{
    id: string;
    name: string;
    segment: string;
    pipeline: { id: string; name: string; stages: Stage[] } | null;
  }>;
};
type Lead = {
  id: string;
  establishmentName: string;
  contactName: string | null;
  city: string | null;
  state: string | null;
  score: number;
  priority: string;
  nextAction: string | null;
  stageId: string;
  pipelineId: string;
  product: { name: string };
  owner: { name: string } | null;
};
type FormValues = {
  establishmentName: string;
  contactName: string;
  phone: string;
  email: string;
  productId: string;
  pipelineId: string;
  stageId: string;
  source: string;
  priority: 'Baixa' | 'Normal' | 'Alta';
  nextAction: string;
  notes: string;
};

function LeadCard({ lead, onQualify }: { lead: Lead; onQualify: () => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: lead.id });
  return (
    <article
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`lead-card priority-${lead.priority.toLowerCase()}`}
      onDoubleClick={onQualify}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined
      }}
    >
      <p className="font-semibold">{lead.establishmentName}</p>
      <p className="mt-1 text-xs text-slate-500">
        {lead.contactName ?? 'Sem responsável'} · {lead.city ?? '—'}
        {lead.state ? `/${lead.state}` : ''}
      </p>
      <div className="mt-3 flex justify-between text-xs">
        <span className="badge">Score {lead.score}</span>
        <span>{lead.priority}</span>
      </div>
      {lead.nextAction && <p className="mt-3 text-xs text-cyan-800">Próxima: {lead.nextAction}</p>}
    </article>
  );
}
function Column({
  stage,
  leads,
  onQualify
}: {
  stage: Stage;
  leads: Lead[];
  onQualify: (leadId: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: stage.id });
  return (
    <section
      className="kanban-column"
      ref={setNodeRef}
      style={{ '--stage-color': stage.color } as CSSProperties}
    >
      <header>
        <p className="font-semibold">{stage.name}</p>
        <span className="column-count">{leads.length}</span>
      </header>
      <div className="space-y-3">
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onQualify={() => onQualify(lead.id)} />
        ))}
      </div>
    </section>
  );
}

export function LeadsPage() {
  const [catalog, setCatalog] = useState<Catalog>();
  const [qualifyingLeadId, setQualifyingLeadId] = useState<string>();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [productId, setProductId] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [error, setError] = useState<string>();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );
  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: { source: 'Prospecção própria', priority: 'Normal' }
  });
  const selectedProduct = catalog?.products.find((product) => product.id === productId);
  const selectableProducts =
    catalog?.products.filter((product) => product.pipeline && !/^teste/i.test(product.segment)) ?? [];
  const stages = selectedProduct?.pipeline?.stages ?? [];
  const load = () =>
    apiRequest<Lead[]>(
      `/api/leads?${new URLSearchParams({ ...(productId ? { productId } : {}), ...(search ? { search } : {}) })}`
    )
      .then((data) => setLeads((data as unknown as { leads: Lead[] }).leads))
      .catch(() => setError('Não foi possível carregar leads.'));
  useEffect(() => {
    apiRequest<Catalog>('/api/catalog/overview')
      .then((data) => {
        setCatalog(data);
        setProductId(
          (current) => current || data.products.find((product) => product.pipeline && !/^teste/i.test(product.segment))?.id || ''
        );
      })
      .catch(() => setError('Não foi possível carregar produtos.'));
  }, []);
  useEffect(() => {
    load();
  }, [productId, search]);
  const grouped = useMemo(
    () =>
      Object.fromEntries(
        stages.map((stage) => [stage.id, leads.filter((lead) => lead.stageId === stage.id)])
      ),
    [leads, stages]
  );
  const move = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const moved = leads.find((lead) => lead.id === active.id);
    if (!moved || moved.stageId === over.id) return;
    const result = await apiRequest<{ lead: Lead }>(`/api/leads/${moved.id}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ stageId: over.id })
    });
    setLeads((items) => items.map((lead) => (lead.id === moved.id ? result.lead : lead)));
  };
  const submit = async (data: FormValues) => {
    setError(undefined);
    try {
      const result = await apiRequest<{ lead: Lead }>('/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          productId: productId || data.productId,
          pipelineId: selectedProduct?.pipeline?.id || data.pipelineId,
          stageId: data.stageId || stages[0]?.id,
          allowDuplicate: false
        })
      });
      setLeads((items) => [result.lead, ...items]);
      setOpen(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Não foi possível criar lead.'
      );
    }
  };
  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-cyan-700">Prospecção</p>
          <h1 className="text-2xl font-bold">Leads e Kanban</h1>
        </div>
        <div className="flex gap-2">
          <button className="secondary-button" onClick={() => setImportOpen(true)} type="button">
            <Upload size={16} />
            Importar CSV
          </button>
          <button className="primary-button" onClick={() => setOpen(true)} type="button">
            <Plus size={16} />
            Novo lead
          </button>
        </div>
      </div>
      <div className="mb-5 flex flex-wrap gap-3">
        <label className="product-picker">
          Produto ativo no Kanban
          <select
            className="field"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
          >
            <option value="">Selecione um produto</option>
            {selectableProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
          </select>
        </label>
        <label className="relative block">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input
            className="field pl-9"
            placeholder="Pesquisar leads"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>
      {error && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-800">{error}</p>}
      {!productId && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-slate-600">
          Selecione um produto para visualizar seu pipeline.
        </p>
      )}
      {productId && (
        <DndContext sensors={sensors} onDragEnd={(event) => void move(event)}>
          <div className="kanban-board">
            {stages.map((stage) => (
              <Column
                key={stage.id}
                stage={stage}
                leads={grouped[stage.id] ?? []}
                onQualify={setQualifyingLeadId}
              />
            ))}
          </div>
        </DndContext>
      )}
      {open && (
        <div className="modal-backdrop">
          <section className="modal-panel">
            <h2 className="text-xl font-bold">Novo lead</h2>
            <form className="mt-5 wizard-grid" onSubmit={handleSubmit(submit)}>
              <label className="label">
                Estabelecimento
                <input className="field" {...register('establishmentName', { required: true })} />
              </label>
              <label className="label">
                Responsável
                <input className="field" {...register('contactName')} />
              </label>
              <label className="label">
                Telefone
                <input className="field" {...register('phone')} />
              </label>
              <label className="label">
                E-mail
                <input className="field" {...register('email')} />
              </label>
              <label className="label">
                Origem
                <select className="field" {...register('source')}>
                  <option>Prospecção própria</option>
                  <option>Marketing próprio</option>
                  <option>Indicação</option>
                  <option>Lead fornecido pelo parceiro</option>
                  <option>Carteira antiga</option>
                  <option>Outro</option>
                </select>
              </label>
              <label className="label">
                Prioridade
                <select className="field" {...register('priority')}>
                  <option>Baixa</option>
                  <option>Normal</option>
                  <option>Alta</option>
                </select>
              </label>
              <label className="label md:col-span-2">
                Próxima ação
                <input className="field" {...register('nextAction')} />
              </label>
              <div className="col-span-2 flex justify-end gap-2">
                <button className="secondary-button" onClick={() => setOpen(false)} type="button">
                  Cancelar
                </button>
                <button className="primary-button" type="submit">
                  Criar lead
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {qualifyingLeadId && (
        <QualificationModal
          leadId={qualifyingLeadId}
          onClose={() => setQualifyingLeadId(undefined)}
          onSaved={load}
        />
      )}
      {importOpen && (
        <ImportLeadsModal
          products={catalog?.products ?? []}
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setImportOpen(false);
            void load();
          }}
        />
      )}
    </section>
  );
}
