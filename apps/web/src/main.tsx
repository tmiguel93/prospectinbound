import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import './styles.css';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SELLER';
  active: boolean;
};

type Credentials = { name?: string; email: string; password: string };

const credentialsSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres.')
});

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers }
  });
  const body = response.status === 204 ? undefined : await response.json();
  if (!response.ok) throw new Error(body?.message ?? 'Não foi possível concluir a solicitação.');
  return body as T;
}

function CredentialsForm({
  mode,
  onSuccess
}: {
  mode: 'setup' | 'login';
  onSuccess: (user: User) => void;
}) {
  const { register, handleSubmit, formState } = useForm<Credentials>();
  const [error, setError] = useState<string>();
  const isSetup = mode === 'setup';

  const submit = async (values: Credentials) => {
    setError(undefined);
    const parsed = credentialsSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos.');
      return;
    }
    if (isSetup && !values.name?.trim()) {
      setError('Informe seu nome.');
      return;
    }
    try {
      const result = await apiRequest<{ user: User }>(
        isSetup ? '/api/auth/setup' : '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(
            isSetup ? { ...parsed.data, name: values.name?.trim() } : parsed.data
          )
        }
      );
      onSuccess(result.user);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível entrar.');
    }
  };

  return (
    <form className="mt-8 space-y-4" onSubmit={handleSubmit(submit)} noValidate>
      {isSetup && (
        <label className="label">
          Seu nome
          <input className="field" autoComplete="name" {...register('name')} />
        </label>
      )}
      <label className="label">
        E-mail
        <input className="field" type="email" autoComplete="email" {...register('email')} />
      </label>
      <label className="label">
        Senha
        <input
          className="field"
          type="password"
          autoComplete={isSetup ? 'new-password' : 'current-password'}
          {...register('password')}
        />
      </label>
      {error && (
        <p className="rounded-lg bg-rose-950/60 px-3 py-2 text-sm text-rose-200">{error}</p>
      )}
      <button
        className="w-full rounded-lg bg-cyan-500 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
        disabled={formState.isSubmitting}
        type="submit"
      >
        {formState.isSubmitting ? 'Aguarde...' : isSetup ? 'Criar administrador' : 'Entrar'}
      </button>
    </form>
  );
}

function App() {
  const [initialized, setInitialized] = useState<boolean>();
  const [user, setUser] = useState<User>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    Promise.all([
      apiRequest<{ initialized: boolean }>('/api/auth/status'),
      apiRequest<{ user: User }>('/api/auth/me').catch(() => null)
    ])
      .then(([status, session]) => {
        setInitialized(status.initialized);
        setUser(session?.user);
      })
      .catch(() => setError('Não foi possível conectar à API local.'));
  }, []);

  const logout = async () => {
    await apiRequest('/api/auth/logout', { method: 'POST' });
    setUser(undefined);
  };

  if (initialized === undefined && !error)
    return <main className="screen">Carregando CRM local...</main>;
  if (error) return <main className="screen text-rose-200">{error}</main>;
  if (user)
    return (
      <main className="screen">
        <section className="panel max-w-xl">
          <p className="eyebrow">ProspectInbound</p>
          <h1 className="text-3xl font-bold">Sessão iniciada</h1>
          <p className="mt-4 text-slate-300">
            Olá, {user.name}. A base de autenticação local está ativa.
          </p>
          <button
            className="mt-8 rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
            onClick={logout}
            type="button"
          >
            Sair
          </button>
        </section>
      </main>
    );

  return (
    <main className="screen">
      <section className="panel max-w-md">
        <p className="eyebrow">ProspectInbound</p>
        <h1 className="text-3xl font-bold">
          {initialized ? 'Entrar no CRM' : 'Criar administrador'}
        </h1>
        <p className="mt-3 leading-7 text-slate-300">
          {initialized
            ? 'Use suas credenciais locais para continuar.'
            : 'Esta é a primeira execução. Crie a conta que administrará o CRM.'}
        </p>
        <CredentialsForm mode={initialized ? 'login' : 'setup'} onSuccess={setUser} />
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
