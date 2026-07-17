import { useEffect, useState } from 'react';
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
  useEffect(() => {
    apiRequest<{ users: User[] }>('/api/users')
      .then((x) => setUsers(x.users))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <section>
      <h1 className="text-2xl font-bold">Usuários</h1>
      {error && <p className="mt-4 text-rose-700">{error}</p>}
      <div className="mt-6 rounded-xl border bg-white divide-y">
        {users.map((u) => (
          <article className="p-4" key={u.id}>
            <b>{u.name}</b>
            <span className="ml-2 text-sm text-slate-500">
              {u.email} · {u.role} · {u.active ? 'Ativo' : 'Inativo'}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
export function AuditPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    apiRequest<{ logs: Log[] }>('/api/audit')
      .then((x) => setLogs(x.logs))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <section>
      <h1 className="text-2xl font-bold">Auditoria</h1>
      {error && <p className="mt-4 text-rose-700">{error}</p>}
      <div className="mt-6 rounded-xl border bg-white divide-y">
        {logs.map((l) => (
          <article className="p-4 text-sm" key={l.id}>
            <b>{l.action}</b> · {l.entity} · {l.user?.name ?? 'Sistema'} ·{' '}
            {new Date(l.createdAt).toLocaleString('pt-BR')}
          </article>
        ))}
      </div>
    </section>
  );
}
