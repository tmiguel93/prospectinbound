import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api.js';

type Backup = { name: string; size: number; createdAt: string };
type MessageTemplate = { id: string; name: string; content: string; active: boolean };

function fileSize(size: number) {
  return `${(size / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} MB`;
}

export function SettingsPage({ canManage }: { canManage: boolean }) {
  const [files, setFiles] = useState<Backup[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState<Backup>();
  const [confirmation, setConfirmation] = useState('');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [whatsappReady, setWhatsappReady] = useState(false);
  const load = async () => {
    try {
      setFiles((await apiRequest<{ files: Backup[] }>('/api/backups')).files);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os backups.');
    }
  };
  useEffect(() => {
    void load();
    void apiRequest<{ templates: MessageTemplate[] }>('/api/communications/templates')
      .then((result) => setTemplates(result.templates))
      .catch(() => setTemplates([]));
    void apiRequest<{ outboundReady: boolean }>('/api/whatsapp/status')
      .then((result) => setWhatsappReady(result.outboundReady))
      .catch(() => setWhatsappReady(false));
  }, []);
  const createTemplate = async () => {
    if (!templateName.trim() || !templateContent.trim()) return;
    try {
      setError('');
      const result = await apiRequest<{ template: MessageTemplate }>(
        '/api/communications/templates',
        {
          method: 'POST',
          body: JSON.stringify({ name: templateName, content: templateContent })
        }
      );
      setTemplates((current) =>
        [...current, result.template].sort((a, b) => a.name.localeCompare(b.name))
      );
      setTemplateName('');
      setTemplateContent('');
      setNotice('Modelo de mensagem criado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar o modelo.');
    }
  };
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
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-[42rem] divide-y divide-slate-200 text-sm">
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
      <section className="mt-8 rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">WhatsApp oficial</p>
            <h2 className="text-lg font-bold">Modelos e status operacional</h2>
            <p className="mt-1 text-sm text-slate-500">
              {whatsappReady
                ? 'Envio oficial configurado e disponível.'
                : 'Envio oficial indisponível: configure as credenciais da Meta no ambiente.'}
            </p>
          </div>
          <span className="badge">{whatsappReady ? 'Pronto' : 'Não configurado'}</span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {templates.map((template) => (
            <article className="rounded-lg border border-slate-200 p-3 text-sm" key={template.id}>
              <b>{template.name}</b>
              <p className="mt-1 whitespace-pre-wrap text-slate-600">{template.content}</p>
            </article>
          ))}
          {!templates.length && <p className="text-sm text-slate-500">Nenhum modelo cadastrado.</p>}
        </div>
        {canManage && (
          <div className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-[12rem_1fr_auto]">
            <input
              className="field m-0"
              maxLength={80}
              placeholder="Nome do modelo"
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
            />
            <input
              className="field m-0"
              maxLength={4096}
              placeholder="Mensagem do modelo"
              value={templateContent}
              onChange={(event) => setTemplateContent(event.target.value)}
            />
            <button
              className="primary-button"
              disabled={!templateName.trim() || !templateContent.trim()}
              onClick={() => void createTemplate()}
              type="button"
            >
              Criar modelo
            </button>
          </div>
        )}
      </section>
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
