import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '../../lib/api.js';

type User = { id: string; name: string; email: string; role: string; active: boolean };
type Log = {
  id: string;
  action: string;
  entity: string;
  createdAt: string;
  user: { name: string } | null;
};

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'SELLER' });
  const load = () =>
    apiRequest<{ users: User[] }>('/api/users')
      .then((result) => setUsers(result.users))
      .catch((cause) => setError(cause.message));
  useEffect(() => {
    void load();
  }, []);
  const create = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setError('');
      await apiRequest('/api/users', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', email: '', password: '', role: 'SELLER' });
      setNotice('Usuário criado com sucesso.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar o usuário.');
    }
  };
  const update = async (user: User, data: Record<string, unknown>) => {
    try {
      setError('');
      await apiRequest(`/api/users/${user.id}`, { method: 'PATCH', body: JSON.stringify(data) });
      setNotice('Usuário atualizado.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o usuário.');
    }
  };
  return (
    <section>
      <p className="eyebrow text-cyan-700">Administração</p>
      <h1 className="text-2xl font-bold">Usuários e permissões</h1>
      <form
        className="mt-6 grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-4"
        onSubmit={(event) => void create(event)}
      >
        <input
          className="field m-0"
          placeholder="Nome"
          required
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        <input
          className="field m-0"
          placeholder="E-mail"
          required
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
        <input
          className="field m-0"
          placeholder="Senha inicial (8+ caracteres)"
          required
          minLength={8}
          type="password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
        />
        <div className="flex gap-2">
          <select
            className="field m-0"
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value })}
          >
            <option value="SELLER">Vendedor</option>
            <option value="ADMIN">Administrador</option>
          </select>
          <button className="primary-button" type="submit">
            Adicionar
          </button>
        </div>
      </form>
      {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p>}
      {notice && <p className="mt-4 rounded-lg bg-cyan-50 p-3 text-cyan-900">{notice}</p>}
      <div className="mt-6 overflow-hidden rounded-xl border bg-white">
        <table className="min-w-full divide-y text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Papel</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3">
                  <b>{user.name}</b>
                  <br />
                  <span className="text-slate-500">{user.email}</span>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="field m-0"
                    value={user.role}
                    onChange={(event) => void update(user, { role: event.target.value })}
                  >
                    <option value="SELLER">Vendedor</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className="badge">{user.active ? 'Ativo' : 'Inativo'}</span>
                </td>
                <td className="px-4 py-3">
                  <button
                    className="secondary-button"
                    onClick={() => void update(user, { active: !user.active })}
                    type="button"
                  >
                    {user.active ? 'Desativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td className="px-4 py-8 text-slate-500" colSpan={4}>
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState('');
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  useEffect(() => {
    const query = new URLSearchParams({
      ...(entity ? { entity } : {}),
      ...(action ? { action } : {})
    });
    apiRequest<{ logs: Log[] }>(`/api/audit?${query}`)
      .then((result) => setLogs(result.logs))
      .catch((cause) => setError(cause.message));
  }, [action, entity]);
  return (
    <section>
      <p className="eyebrow text-cyan-700">Administração</p>
      <h1 className="text-2xl font-bold">Auditoria</h1>
      <div className="mt-5 flex flex-wrap gap-3">
        <select
          className="field m-0 max-w-xs"
          value={entity}
          onChange={(event) => setEntity(event.target.value)}
        >
          <option value="">Todas as entidades</option>
          <option>Lead</option>
          <option>Meeting</option>
          <option>User</option>
          <option>Database</option>
          <option>CommissionEntry</option>
        </select>
        <select
          className="field m-0 max-w-xs"
          value={action}
          onChange={(event) => setAction(event.target.value)}
        >
          <option value="">Todas as ações</option>
          <option>CREATE</option>
          <option>UPDATE</option>
          <option>MOVE</option>
          <option>ACTIVITY</option>
          <option>IMPORT</option>
          <option>PAY</option>
        </select>
      </div>
      {error && <p className="mt-4 text-rose-700">{error}</p>}
      <div className="mt-6 rounded-xl border bg-white divide-y">
        {logs.map((log) => (
          <article className="p-4 text-sm" key={log.id}>
            <b>{log.action}</b> · {log.entity} · {log.user?.name ?? 'Sistema'} ·{' '}
            {new Date(log.createdAt).toLocaleString('pt-BR')}
          </article>
        ))}
      </div>
    </section>
  );
}
