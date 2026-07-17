import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api.js';

type Backup = { name: string; size: number; createdAt: string };

function fileSize(size: number) {
  return `${(size / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} MB`;
}

export function SettingsPage() {
  const [files, setFiles] = useState<Backup[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState<Backup>();
  const [confirmation, setConfirmation] = useState('');
  const load = async () => {
    try {
      setFiles((await apiRequest<{ files: Backup[] }>('/api/backups')).files);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os backups.');
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const create = async () => {
    try {
      setBusy(true);
      setError('');
      setNotice('');
      const result = await apiRequest<{ file: string }>('/api/backups', { method: 'POST' });
      setNotice(`Backup ${result.file} criado com sucesso.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar o backup.');
    } finally {
      setBusy(false);
    }
  };
  const restore = async () => {
    if (!restoring) return;
    try {
      setBusy(true);
      setError('');
      setNotice('');
      const result = await apiRequest<{ emergencyFile: string }>('/api/backups/restore', {
        method: 'POST',
        body: JSON.stringify({ file: restoring.name, confirmation })
      });
      setNotice(
        `Base restaurada. A cópia de segurança anterior é ${result.emergencyFile}. Faça login novamente se necessário.`
      );
      setRestoring(undefined);
      setConfirmation('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível restaurar o backup.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <p className="eyebrow text-cyan-700">Configurações</p>
      <h1 className="text-2xl font-bold">Dados e backups</h1>
      <p className="mt-1 text-sm text-slate-500">
        Crie cópias locais antes de alterações relevantes. A restauração substitui o banco atual.
      </p>
      <div className="mt-6">
        <button
          className="primary-button"
          disabled={busy}
          onClick={() => void create()}
          type="button"
        >
          {busy ? 'Processando...' : 'Criar backup agora'}
        </button>
      </div>
      {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {notice && <p className="mt-4 rounded-lg bg-cyan-50 p-3 text-sm text-cyan-900">{notice}</p>}
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Arquivo</th>
              <th className="px-4 py-3">Criado</th>
              <th className="px-4 py-3">Tamanho</th>
              <th className="px-4 py-3">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {files.map((file) => (
              <tr key={file.name}>
                <td className="px-4 py-3 font-medium">{file.name}</td>
                <td className="px-4 py-3">{new Date(file.createdAt).toLocaleString('pt-BR')}</td>
                <td className="px-4 py-3">{fileSize(file.size)}</td>
                <td className="px-4 py-3">
                  <button
                    className="secondary-button"
                    onClick={() => setRestoring(file)}
                    type="button"
                  >
                    Restaurar
                  </button>
                </td>
              </tr>
            ))}
            {!files.length && (
              <tr>
                <td className="px-4 py-8 text-slate-500" colSpan={4}>
                  Nenhum backup local disponível.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {restoring && (
        <div className="modal-backdrop">
          <section className="modal-panel">
            <h2 className="text-xl font-bold">Restaurar backup</h2>
            <p className="mt-3 text-sm text-slate-600">
              Esta ação substituirá os dados atuais por <b>{restoring.name}</b>. Um backup
              automático do estado atual será criado antes da troca.
            </p>
            <label className="label mt-5">
              Digite <b>RESTAURAR {restoring.name}</b> para confirmar
              <input
                className="field"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="secondary-button"
                onClick={() => {
                  setRestoring(undefined);
                  setConfirmation('');
                }}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                disabled={busy || confirmation !== `RESTAURAR ${restoring.name}`}
                onClick={() => void restore()}
                type="button"
              >
                Restaurar definitivamente
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
