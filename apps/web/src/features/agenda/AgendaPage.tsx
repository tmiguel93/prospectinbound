import { CalendarPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../../lib/api.js';

type Meeting = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  format: string;
  status: string;
  lead: { establishmentName: string; product: { name: string } };
};
type Lead = { id: string; establishmentName: string };

export function AgendaPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const load = () => {
    apiRequest<{ meetings: Meeting[] }>('/api/meetings').then((data) => setMeetings(data.meetings));
    apiRequest<{ leads: Lead[] }>('/api/leads').then((data) => setLeads(data.leads));
  };
  useEffect(load, []);
  const create = async (form: HTMLFormElement) => {
    const data = new FormData(form);
    try {
      await apiRequest('/api/meetings', {
        method: 'POST',
        body: JSON.stringify({
          leadId: data.get('leadId'),
          title: data.get('title'),
          startsAt: new Date(String(data.get('startsAt'))).toISOString(),
          endsAt: new Date(String(data.get('endsAt'))).toISOString(),
          format: data.get('format')
        })
      });
      setOpen(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível agendar.');
    }
  };
  return (
    <section>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="eyebrow text-cyan-700">Agenda</p>
          <h1 className="text-2xl font-bold">Reuniões internas</h1>
        </div>
        <button className="primary-button" onClick={() => setOpen(true)}>
          <CalendarPlus size={16} />
          Agendar
        </button>
      </div>
      {error && <p className="mb-4 text-rose-700">{error}</p>}
      <div className="rounded-xl border border-slate-200 bg-white divide-y">
        {meetings.map((meeting) => (
          <article className="p-5" key={meeting.id}>
            <p className="font-semibold">{meeting.title}</p>
            <p className="mt-1 text-sm text-slate-600">
              {meeting.lead.establishmentName} · {meeting.lead.product.name} ·{' '}
              {new Date(meeting.startsAt).toLocaleString('pt-BR')} · {meeting.format}
            </p>
          </article>
        ))}
        {!meetings.length && <p className="p-5 text-slate-500">Nenhuma reunião agendada.</p>}
      </div>
      {open && (
        <div className="modal-backdrop">
          <form
            className="modal-panel space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              create(e.currentTarget);
            }}
          >
            <h2 className="text-xl font-bold">Agendar reunião</h2>
            <select className="field" name="leadId" required>
              <option value="">Selecionar lead</option>
              {leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.establishmentName}
                </option>
              ))}
            </select>
            <input className="field" name="title" placeholder="Título" required />
            <input className="field" name="startsAt" type="datetime-local" required />
            <input className="field" name="endsAt" type="datetime-local" required />
            <select className="field" name="format">
              <option>Videochamada</option>
              <option>Ligação</option>
              <option>Presencial</option>
              <option>Demonstração remota</option>
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" className="secondary-button" onClick={() => setOpen(false)}>
                Cancelar
              </button>
              <button className="primary-button">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
