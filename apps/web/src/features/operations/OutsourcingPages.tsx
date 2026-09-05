import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileImage,
  FileText,
  PlayCircle,
  Plus,
  UsersRound,
  Wrench
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type FormEvent
} from 'react';
import { apiRequest } from '../../lib/api.js';

type Service = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  defaultPriceCents: number;
  active: boolean;
};
type Client = {
  id: string;
  name: string;
  taxId: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  _count?: { contracts: number };
};
type Contract = {
  id: string;
  number: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  valueCents: number;
  status: string;
  client: Client;
  _count?: { jobs: number };
};
type Photo = { id: string; originalName: string; kind: string; createdAt: string };
type Job = {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: string | null;
  stage: Stage;
  priority: string;
  completedAt: string | null;
  service: Service;
  contract: Contract;
  assignee: { id: string; name: string } | null;
  photos: Photo[];
};
type User = { id: string; name: string; active: boolean };
type Stage = 'SCHEDULED' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'COMPLETED';
type OperationsSummary = {
  activeContracts: number;
  scheduled: number;
  inProgress: number;
  pendingApproval: number;
  completed: number;
  upcoming: Job[];
};

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
const stages: Array<{ id: Stage; label: string; color: string }> = [
  { id: 'SCHEDULED', label: 'Programado', color: '#2563eb' },
  { id: 'IN_PROGRESS', label: 'Em execução', color: '#d97706' },
  { id: 'PENDING_APPROVAL', label: 'Para validação', color: '#7c3aed' },
  { id: 'COMPLETED', label: 'Finalizado', color: '#15803d' }
];

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Não foi possível concluir a operação.';
}
function localDate(value: string | null) {
  return value ? date.format(new Date(value)) : 'Sem agendamento';
}
function stageLabel(stage: string) {
  return stages.find((item) => item.id === stage)?.label ?? stage;
}

export function OperationsDashboardPage() {
  const [summary, setSummary] = useState<OperationsSummary>();
  const [error, setError] = useState('');
  useEffect(() => {
    void apiRequest<OperationsSummary>('/api/operations/dashboard')
      .then(setSummary)
      .catch((cause) => setError(errorMessage(cause)));
  }, []);
  const cards = summary
    ? [
        { label: 'Contratos ativos', value: summary.activeContracts, icon: FileText },
        { label: 'Programados', value: summary.scheduled, icon: CalendarDays },
        { label: 'Em execução', value: summary.inProgress, icon: PlayCircle },
        { label: 'Para validação', value: summary.pendingApproval, icon: ClipboardCheck },
        { label: 'Serviços finalizados', value: summary.completed, icon: CheckCircle2 }
      ]
    : [];
  return (
    <section>
      <div className="mb-8">
        <p className="eyebrow text-cyan-700">Operações terceirizadas</p>
        <h1 className="text-2xl font-bold tracking-tight">Controle de contratos e execução</h1>
        <p className="mt-2 text-slate-600">
          Acompanhe os contratos ativos, as equipes em campo e as entregas que aguardam validação.
        </p>
      </div>
      {error && <p className="rounded-lg bg-rose-50 p-4 text-rose-800">{error}</p>}
      {!summary && !error && <div className="h-32 animate-pulse rounded-xl bg-slate-200" />}
      {!!summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map(({ label, value, icon: Icon }) => (
              <article className="stat-card" key={label}>
                <div>
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-3 text-2xl font-bold">{value}</p>
                </div>
                <Icon className="text-cyan-700" size={22} />
              </article>
            ))}
          </div>
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <CalendarDays className="text-cyan-700" size={20} />
              <h2 className="font-semibold">Próximos serviços</h2>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {summary.upcoming.map((job) => (
                <article className="rounded-lg border border-slate-200 p-4" key={job.id}>
                  <div className="flex justify-between gap-3">
                    <div>
                      <b>{job.title}</b>
                      <p className="mt-1 text-sm text-slate-500">
                        {job.contract.client.name} · {job.service.name}
                      </p>
                    </div>
                    <span className="badge">{stageLabel(job.stage)}</span>
                  </div>
                  <p className="mt-3 text-sm">{localDate(job.scheduledAt)}</p>
                </article>
              ))}
              {!summary.upcoming.length && (
                <p className="text-sm text-slate-500">
                  Nenhum serviço agendado para os próximos sete dias.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}

export function ServiceCatalogPage({ canManage }: { canManage: boolean }) {
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    unit: 'unidade',
    price: ''
  });
  const [clientForm, setClientForm] = useState({
    name: '',
    taxId: '',
    contactName: '',
    phone: '',
    email: '',
    address: ''
  });
  const load = async () => {
    const [serviceData, clientData] = await Promise.all([
      apiRequest<{ services: Service[] }>('/api/operations/services'),
      apiRequest<{ clients: Client[] }>('/api/operations/clients')
    ]);
    setServices(serviceData.services);
    setClients(clientData.clients);
  };
  useEffect(() => {
    void load().catch((cause) => setError(errorMessage(cause)));
  }, []);
  const createService = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiRequest('/api/operations/services', {
        method: 'POST',
        body: JSON.stringify({
          name: serviceForm.name,
          description: serviceForm.description || undefined,
          unit: serviceForm.unit,
          defaultPriceCents: Math.round(Number(serviceForm.price || 0) * 100)
        })
      });
      setServiceForm({ name: '', description: '', unit: 'unidade', price: '' });
      setNotice('Serviço adicionado ao catálogo.');
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };
  const createClient = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiRequest('/api/operations/clients', {
        method: 'POST',
        body: JSON.stringify(clientForm)
      });
      setClientForm({ name: '', taxId: '', contactName: '', phone: '', email: '', address: '' });
      setNotice('Cliente cadastrado.');
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };
  return (
    <section>
      <p className="eyebrow text-cyan-700">Cadastros operacionais</p>
      <h1 className="text-2xl font-bold">Serviços e clientes</h1>
      <p className="mt-1 text-sm text-slate-600">
        Monte o catálogo de prestação de serviços e mantenha os contratantes organizados.
      </p>
      {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-rose-800">{error}</p>}
      {notice && <p className="mt-4 rounded-lg bg-cyan-50 p-3 text-cyan-900">{notice}</p>}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border bg-white p-5">
          <div className="flex items-center gap-2">
            <Wrench className="text-cyan-700" size={20} />
            <h2 className="font-semibold">Catálogo de serviços</h2>
          </div>
          {canManage && (
            <form
              className="mt-4 grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => void createService(event)}
            >
              <input
                className="field m-0"
                required
                placeholder="Ex.: Limpeza fina"
                value={serviceForm.name}
                onChange={(event) => setServiceForm({ ...serviceForm, name: event.target.value })}
              />
              <input
                className="field m-0"
                placeholder="Unidade de cobrança"
                value={serviceForm.unit}
                onChange={(event) => setServiceForm({ ...serviceForm, unit: event.target.value })}
              />
              <input
                className="field m-0"
                placeholder="Descrição"
                value={serviceForm.description}
                onChange={(event) =>
                  setServiceForm({ ...serviceForm, description: event.target.value })
                }
              />
              <input
                className="field m-0"
                min={0}
                step="0.01"
                type="number"
                placeholder="Valor padrão (R$)"
                value={serviceForm.price}
                onChange={(event) => setServiceForm({ ...serviceForm, price: event.target.value })}
              />
              <button className="primary-button sm:col-span-2" type="submit">
                <Plus size={16} />
                Adicionar serviço
              </button>
            </form>
          )}
          <div className="mt-5 space-y-2">
            {services.map((service) => (
              <article className="rounded-lg border border-slate-200 p-3" key={service.id}>
                <div className="flex justify-between gap-2">
                  <b>{service.name}</b>
                  <span className="badge">{service.active ? 'Ativo' : 'Inativo'}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {service.description || 'Sem descrição'} · {service.unit} ·{' '}
                  {money.format(service.defaultPriceCents / 100)}
                </p>
              </article>
            ))}
            {!services.length && (
              <p className="text-sm text-slate-500">
                Cadastre portaria, limpeza, restauração e os demais serviços prestados.
              </p>
            )}
          </div>
        </section>
        <section className="rounded-xl border bg-white p-5">
          <div className="flex items-center gap-2">
            <UsersRound className="text-cyan-700" size={20} />
            <h2 className="font-semibold">Clientes contratantes</h2>
          </div>
          {canManage && (
            <form
              className="mt-4 grid gap-3 sm:grid-cols-2"
              onSubmit={(event) => void createClient(event)}
            >
              <input
                className="field m-0"
                required
                placeholder="Razão social ou nome"
                value={clientForm.name}
                onChange={(event) => setClientForm({ ...clientForm, name: event.target.value })}
              />
              <input
                className="field m-0"
                placeholder="CNPJ ou CPF"
                value={clientForm.taxId}
                onChange={(event) => setClientForm({ ...clientForm, taxId: event.target.value })}
              />
              <input
                className="field m-0"
                placeholder="Contato responsável"
                value={clientForm.contactName}
                onChange={(event) =>
                  setClientForm({ ...clientForm, contactName: event.target.value })
                }
              />
              <input
                className="field m-0"
                placeholder="Telefone"
                value={clientForm.phone}
                onChange={(event) => setClientForm({ ...clientForm, phone: event.target.value })}
              />
              <input
                className="field m-0"
                type="email"
                placeholder="E-mail"
                value={clientForm.email}
                onChange={(event) => setClientForm({ ...clientForm, email: event.target.value })}
              />
              <input
                className="field m-0"
                placeholder="Endereço da operação"
                value={clientForm.address}
                onChange={(event) => setClientForm({ ...clientForm, address: event.target.value })}
              />
              <button className="primary-button sm:col-span-2" type="submit">
                <Plus size={16} />
                Adicionar cliente
              </button>
            </form>
          )}
          <div className="mt-5 space-y-2">
            {clients.map((client) => (
              <article className="rounded-lg border border-slate-200 p-3" key={client.id}>
                <div className="flex justify-between gap-2">
                  <b>{client.name}</b>
                  <span className="badge">{client._count?.contracts ?? 0} contratos</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {client.contactName || 'Sem contato'} ·{' '}
                  {client.phone || client.email || 'Sem telefone/e-mail'}
                </p>
              </article>
            ))}
            {!clients.length && (
              <p className="text-sm text-slate-500">Nenhum cliente cadastrado.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

export function ContractsPage({ canManage }: { canManage: boolean }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    clientId: '',
    number: '',
    title: '',
    startsAt: new Date().toISOString().slice(0, 10),
    endsAt: '',
    value: '',
    notes: ''
  });
  const load = async () => {
    const [contractData, clientData] = await Promise.all([
      apiRequest<{ contracts: Contract[] }>('/api/operations/contracts'),
      apiRequest<{ clients: Client[] }>('/api/operations/clients')
    ]);
    setContracts(contractData.contracts);
    setClients(clientData.clients);
  };
  useEffect(() => {
    void load().catch((cause) => setError(errorMessage(cause)));
  }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiRequest('/api/operations/contracts', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          startsAt: new Date(`${form.startsAt}T12:00:00`).toISOString(),
          endsAt: form.endsAt ? new Date(`${form.endsAt}T12:00:00`).toISOString() : undefined,
          valueCents: Math.round(Number(form.value || 0) * 100)
        })
      });
      setForm({
        clientId: '',
        number: '',
        title: '',
        startsAt: new Date().toISOString().slice(0, 10),
        endsAt: '',
        value: '',
        notes: ''
      });
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };
  return (
    <section>
      <p className="eyebrow text-cyan-700">Operação contratual</p>
      <h1 className="text-2xl font-bold">Contratos ativos</h1>
      <p className="mt-1 text-sm text-slate-600">
        Centralize vigência, valor contratado e as ordens de serviço relacionadas.
      </p>
      {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-rose-800">{error}</p>}
      {canManage && (
        <form
          className="mt-6 grid gap-3 rounded-xl border bg-white p-5 md:grid-cols-3"
          onSubmit={(event) => void submit(event)}
        >
          <select
            className="field m-0"
            required
            value={form.clientId}
            onChange={(event) => setForm({ ...form, clientId: event.target.value })}
          >
            <option value="">Cliente contratante</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <input
            className="field m-0"
            required
            placeholder="Nº do contrato"
            value={form.number}
            onChange={(event) => setForm({ ...form, number: event.target.value })}
          />
          <input
            className="field m-0"
            required
            placeholder="Título/objeto do contrato"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <label className="text-sm text-slate-600">
            Início
            <input
              className="field m-0 mt-1"
              required
              type="date"
              value={form.startsAt}
              onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
            />
          </label>
          <label className="text-sm text-slate-600">
            Fim da vigência
            <input
              className="field m-0 mt-1"
              type="date"
              value={form.endsAt}
              onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
            />
          </label>
          <input
            className="field m-0 self-end"
            min={0}
            step="0.01"
            type="number"
            placeholder="Valor mensal (R$)"
            value={form.value}
            onChange={(event) => setForm({ ...form, value: event.target.value })}
          />
          <textarea
            className="field m-0 md:col-span-2"
            placeholder="Observações e escopo"
            value={form.notes}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
          <button className="primary-button self-end" type="submit">
            <Plus size={16} />
            Cadastrar contrato
          </button>
        </form>
      )}
      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-[52rem] divide-y text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Contrato</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Vigência</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Ordens</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {contracts.map((contract) => (
              <tr key={contract.id}>
                <td className="px-4 py-3">
                  <b>{contract.number}</b>
                  <br />
                  <span className="text-slate-500">{contract.title}</span>
                </td>
                <td className="px-4 py-3">{contract.client.name}</td>
                <td className="px-4 py-3">
                  {localDate(contract.startsAt)}
                  {contract.endsAt
                    ? ` até ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(contract.endsAt))}`
                    : ' · sem término'}
                </td>
                <td className="px-4 py-3">{money.format(contract.valueCents / 100)}</td>
                <td className="px-4 py-3">{contract._count?.jobs ?? 0}</td>
                <td className="px-4 py-3">
                  <span className="badge">{contract.status}</span>
                </td>
              </tr>
            ))}
            {!contracts.length && (
              <tr>
                <td className="px-4 py-8 text-slate-500" colSpan={6}>
                  Nenhum contrato cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function OperationsKanbanPage({ canManage }: { canManage: boolean }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<Job>();
  const [draggedId, setDraggedId] = useState<string>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    contractId: '',
    serviceId: '',
    assigneeId: '',
    title: '',
    scheduledAt: '',
    priority: 'NORMAL',
    description: ''
  });
  const load = async () => {
    const requests: Array<Promise<unknown>> = [
      apiRequest<{ jobs: Job[] }>('/api/operations/jobs'),
      apiRequest<{ services: Service[] }>('/api/operations/services'),
      apiRequest<{ contracts: Contract[] }>('/api/operations/contracts')
    ];
    if (canManage) requests.push(apiRequest<{ users: User[] }>('/api/users'));
    const [jobData, serviceData, contractData, userData] = (await Promise.all(requests)) as [
      { jobs: Job[] },
      { services: Service[] },
      { contracts: Contract[] },
      { users: User[] } | undefined
    ];
    setJobs(jobData.jobs);
    setServices(serviceData.services.filter((service) => service.active));
    setContracts(contractData.contracts.filter((contract) => contract.status === 'ACTIVE'));
    setUsers(userData?.users.filter((user) => user.active) ?? []);
    setSelected((current) => jobData.jobs.find((job) => job.id === current?.id));
  };
  useEffect(() => {
    void load().catch((cause) => setError(errorMessage(cause)));
  }, [canManage]);
  const move = async (jobId: string, stage: Stage) => {
    const prior = jobs;
    setJobs((current) =>
      current.map((job) =>
        job.id === jobId
          ? { ...job, stage, completedAt: stage === 'COMPLETED' ? new Date().toISOString() : null }
          : job
      )
    );
    try {
      const result = await apiRequest<{ job: Job }>(`/api/operations/jobs/${jobId}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ stage })
      });
      setJobs((current) => current.map((job) => (job.id === jobId ? result.job : job)));
      setSelected((current) => (current?.id === jobId ? result.job : current));
    } catch (cause) {
      setJobs(prior);
      setError(errorMessage(cause));
    }
  };
  const createJob = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await apiRequest('/api/operations/jobs', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          assigneeId: form.assigneeId || null,
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined
        })
      });
      setForm({
        contractId: '',
        serviceId: '',
        assigneeId: '',
        title: '',
        scheduledAt: '',
        priority: 'NORMAL',
        description: ''
      });
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };
  const upload = async (
    event: ChangeEvent<HTMLInputElement>,
    kind: 'BEFORE' | 'AFTER' | 'EVIDENCE'
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selected) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3_500_000) {
      setError('Escolha uma imagem JPG, PNG ou WEBP de até 3,5 MB.');
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolveFile, rejectFile) => {
        const reader = new FileReader();
        reader.onload = () => resolveFile(String(reader.result));
        reader.onerror = rejectFile;
        reader.readAsDataURL(file);
      });
      await apiRequest(`/api/operations/jobs/${selected.id}/photos`, {
        method: 'POST',
        body: JSON.stringify({ dataUrl, filename: file.name, kind })
      });
      await load();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };
  const columns = useMemo(
    () => stages.map((stage) => ({ ...stage, jobs: jobs.filter((job) => job.stage === stage.id) })),
    [jobs]
  );
  return (
    <section>
      <p className="eyebrow text-cyan-700">Execução em campo</p>
      <h1 className="text-2xl font-bold">Kanban de serviços</h1>
      <p className="mt-1 text-sm text-slate-600">
        Arraste as ordens entre etapas. Registre evidências fotográficas antes, durante ou após a
        execução.
      </p>
      {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-rose-800">{error}</p>}
      {canManage && (
        <form
          className="mt-6 grid gap-3 rounded-xl border bg-white p-5 md:grid-cols-3"
          onSubmit={(event) => void createJob(event)}
        >
          <select
            className="field m-0"
            required
            value={form.contractId}
            onChange={(event) => setForm({ ...form, contractId: event.target.value })}
          >
            <option value="">Contrato ativo</option>
            {contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.number} · {contract.client.name}
              </option>
            ))}
          </select>
          <select
            className="field m-0"
            required
            value={form.serviceId}
            onChange={(event) => setForm({ ...form, serviceId: event.target.value })}
          >
            <option value="">Serviço prestado</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          <select
            className="field m-0"
            value={form.assigneeId}
            onChange={(event) => setForm({ ...form, assigneeId: event.target.value })}
          >
            <option value="">Responsável (opcional)</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <input
            className="field m-0"
            required
            placeholder="Título da ordem de serviço"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <input
            className="field m-0"
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })}
          />
          <select
            className="field m-0"
            value={form.priority}
            onChange={(event) => setForm({ ...form, priority: event.target.value })}
          >
            <option value="LOW">Baixa prioridade</option>
            <option value="NORMAL">Prioridade normal</option>
            <option value="HIGH">Alta prioridade</option>
            <option value="URGENT">Urgente</option>
          </select>
          <textarea
            className="field m-0 md:col-span-2"
            placeholder="Escopo, observações e instruções"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          <button className="primary-button self-end" type="submit">
            <Plus size={16} />
            Criar ordem
          </button>
        </form>
      )}
      <div className="kanban-board mt-6">
        {columns.map((column) => (
          <section
            key={column.id}
            className="kanban-column"
            style={{ '--stage-color': column.color } as CSSProperties}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event: DragEvent<HTMLElement>) => {
              event.preventDefault();
              if (draggedId) void move(draggedId, column.id);
              setDraggedId(undefined);
            }}
          >
            <header>
              <span>{column.label}</span>
              <span className="column-count">{column.jobs.length}</span>
            </header>
            <div className="space-y-3">
              {column.jobs.map((job) => (
                <button
                  className="lead-card block w-full text-left"
                  draggable
                  key={job.id}
                  onDragStart={() => setDraggedId(job.id)}
                  onClick={() => setSelected(job)}
                  type="button"
                >
                  <div className="flex justify-between gap-2">
                    <b>{job.title}</b>
                    <span className="badge">{job.priority}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{job.contract.client.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {job.service.name} · {localDate(job.scheduledAt)}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {job.assignee?.name || 'Sem responsável'} · {job.photos.length} fotos
                  </p>
                </button>
              ))}
              {!column.jobs.length && (
                <p className="p-2 text-xs text-slate-500">Solte a ordem aqui</p>
              )}
            </div>
          </section>
        ))}
      </div>
      {selected && (
        <div className="modal-backdrop">
          <section className="modal-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Ordem de serviço</p>
                <h2 className="text-xl font-bold">{selected.title}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {selected.contract.client.name} · {selected.service.name}
                </p>
              </div>
              <button
                className="secondary-button"
                onClick={() => setSelected(undefined)}
                type="button"
              >
                Fechar
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <p>
                <b>Agendamento:</b>
                <br />
                {localDate(selected.scheduledAt)}
              </p>
              <p>
                <b>Responsável:</b>
                <br />
                {selected.assignee?.name || 'Não atribuído'}
              </p>
              <p className="sm:col-span-2">
                <b>Escopo:</b>
                <br />
                {selected.description || 'Sem observações.'}
              </p>
            </div>
            <div className="mt-5 border-t pt-4">
              <div className="flex items-center gap-2">
                <FileImage className="text-cyan-700" size={19} />
                <h3 className="font-semibold">Evidências fotográficas</h3>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(['BEFORE', 'EVIDENCE', 'AFTER'] as const).map((kind) => (
                  <label className="secondary-button cursor-pointer" key={kind}>
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={busy}
                      onChange={(event) => void upload(event, kind)}
                      type="file"
                    />
                    {kind === 'BEFORE' ? 'Antes' : kind === 'AFTER' ? 'Depois' : 'Evidência'}
                  </label>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {selected.photos.map((photo) => (
                  <a
                    className="overflow-hidden rounded-lg border border-slate-200"
                    href={`/api/operations/photos/${photo.id}`}
                    key={photo.id}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <img
                      alt={photo.originalName}
                      className="h-28 w-full object-cover"
                      src={`/api/operations/photos/${photo.id}`}
                    />
                    <span className="block truncate p-2 text-xs">
                      {photo.kind} · {photo.originalName}
                    </span>
                  </a>
                ))}
                {!selected.photos.length && (
                  <p className="col-span-full text-sm text-slate-500">
                    Ainda não há fotos anexadas.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export function OperationsAgendaPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void apiRequest<{ jobs: Job[] }>('/api/operations/agenda')
      .then((data) => setJobs(data.jobs))
      .catch((cause) => setError(errorMessage(cause)));
  }, []);
  return (
    <section>
      <p className="eyebrow text-cyan-700">Planejamento de campo</p>
      <h1 className="text-2xl font-bold">Agenda operacional</h1>
      <p className="mt-1 text-sm text-slate-600">
        Próximas ordens de serviço programadas para os próximos 30 dias.
      </p>
      {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-rose-800">{error}</p>}
      <div className="mt-6 space-y-3">
        {jobs.map((job) => (
          <article className="rounded-xl border bg-white p-4" key={job.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{job.title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {job.contract.client.name} · {job.service.name} ·{' '}
                  {job.assignee?.name || 'Sem responsável'}
                </p>
              </div>
              <div className="text-right">
                <span className="badge">{stageLabel(job.stage)}</span>
                <p className="mt-2 text-sm font-medium">{localDate(job.scheduledAt)}</p>
              </div>
            </div>
          </article>
        ))}
        {!jobs.length && (
          <p className="rounded-xl border bg-white p-6 text-slate-500">Nenhuma ordem agendada.</p>
        )}
      </div>
    </section>
  );
}
