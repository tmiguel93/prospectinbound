import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest, type User } from '../lib/api.js';

type Credentials = { name?: string; email: string; password: string };

const credentialsSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres.')
});

export function AuthScreen({
  initialized,
  onSuccess
}: {
  initialized: boolean;
  onSuccess: (user: User) => void;
}) {
  const { register, handleSubmit, formState } = useForm<Credentials>();
  const [error, setError] = useState<string>();
  const isSetup = !initialized;

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
    <main className="screen">
      <section className="panel max-w-md">
        <p className="eyebrow">ProspectInbound</p>
        <h1 className="text-3xl font-bold">{isSetup ? 'Criar administrador' : 'Entrar no CRM'}</h1>
        <p className="mt-3 leading-7 text-slate-300">
          {isSetup
            ? 'Esta é a primeira execução. Crie a conta que administrará o CRM.'
            : 'Use suas credenciais locais para continuar.'}
        </p>
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
      </section>
    </main>
  );
}
