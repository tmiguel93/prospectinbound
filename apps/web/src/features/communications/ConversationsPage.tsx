import { MessageCircle, Search, Send, Smartphone } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../lib/api.js';

type Lead = {
  id: string;
  establishmentName: string;
  contactName: string | null;
  phone: string | null;
  whatsapp: string | null;
  product: { name: string };
  messages: Array<{ content: string; createdAt: string }>;
};
type Message = {
  id: string;
  channel: 'INTERNAL' | 'WHATSAPP';
  direction: 'INBOUND' | 'OUTBOUND';
  content: string;
  status: string;
  createdAt: string;
  sender: { id: string; name: string } | null;
};

export function ConversationsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [content, setContent] = useState('');
  const [channel, setChannel] = useState<'INTERNAL' | 'WHATSAPP'>('INTERNAL');
  const [whatsappReady, setWhatsappReady] = useState(false);
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedId),
    [leads, selectedId]
  );
  const loadLeads = async () => {
    const data = await apiRequest<{ leads: Lead[] }>(
      `/api/communications/leads?search=${encodeURIComponent(search)}`
    );
    setLeads(data.leads);
    setSelectedId((current) =>
      current && data.leads.some((lead) => lead.id === current) ? current : data.leads[0]?.id
    );
  };
  useEffect(() => {
    void loadLeads().catch(() => setError('Não foi possível carregar as conversas.'));
  }, [search]);
  useEffect(() => {
    void apiRequest<{ outboundReady: boolean }>('/api/whatsapp/status')
      .then((status) => setWhatsappReady(status.outboundReady))
      .catch(() => setWhatsappReady(false));
  }, []);
  useEffect(() => {
    if (!selectedId) return setMessages([]);
    void apiRequest<{ messages: Message[] }>(`/api/communications/leads/${selectedId}/messages`)
      .then((data) => setMessages(data.messages))
      .catch(() => setError('Não foi possível carregar o histórico.'));
  }, [selectedId]);
  const send = async () => {
    if (!selectedId || !content.trim()) return;
    setSending(true);
    setError(undefined);
    try {
      if (channel === 'INTERNAL') {
        await apiRequest(`/api/communications/leads/${selectedId}/messages`, {
          method: 'POST',
          body: JSON.stringify({ content })
        });
      } else {
        await apiRequest('/api/whatsapp/messages', {
          method: 'POST',
          body: JSON.stringify({ leadId: selectedId, content })
        });
      }
      setContent('');
      const data = await apiRequest<{ messages: Message[] }>(
        `/api/communications/leads/${selectedId}/messages`
      );
      setMessages(data.messages);
      await loadLeads();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível enviar a mensagem.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="space-y-5">
      <div>
        <p className="eyebrow">Atendimento</p>
        <h1 className="page-title">Conversas</h1>
        <p className="page-subtitle">Chat interno por lead e envio pela API oficial do WhatsApp.</p>
      </div>
      <div className="conversation-layout">
        <aside className="conversation-list">
          <label className="search-field">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar lead"
            />
          </label>
          <div className="conversation-leads">
            {leads.map((lead) => (
              <button
                key={lead.id}
                type="button"
                className={`conversation-lead ${lead.id === selectedId ? 'conversation-lead-active' : ''}`}
                onClick={() => setSelectedId(lead.id)}
              >
                <strong>{lead.establishmentName}</strong>
                <span>{lead.contactName || lead.product.name}</span>
                <small>{lead.messages[0]?.content || 'Sem mensagens ainda'}</small>
              </button>
            ))}
            {!leads.length && <p className="empty-state">Nenhum lead encontrado.</p>}
          </div>
        </aside>
        <div className="conversation-thread">
          {selectedLead ? (
            <>
              <header className="conversation-header">
                <div>
                  <h2>{selectedLead.establishmentName}</h2>
                  <p>{selectedLead.contactName || selectedLead.product.name}</p>
                </div>
                <span className="badge">
                  {selectedLead.whatsapp || selectedLead.phone || 'Sem telefone'}
                </span>
              </header>
              <div className="message-feed">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`message-bubble ${message.direction === 'OUTBOUND' ? 'message-outbound' : 'message-inbound'}`}
                  >
                    <div className="message-meta">
                      {message.channel === 'WHATSAPP' ? (
                        <Smartphone size={13} />
                      ) : (
                        <MessageCircle size={13} />
                      )}{' '}
                      {message.sender?.name ||
                        (message.direction === 'INBOUND' ? 'Contato' : 'Sistema')}{' '}
                      · {new Date(message.createdAt).toLocaleString('pt-BR')}
                    </div>
                    <p>{message.content}</p>
                    <small>{message.status}</small>
                  </article>
                ))}
                {!messages.length && (
                  <p className="empty-state">Inicie a conversa interna com este lead.</p>
                )}
              </div>
              <div className="conversation-composer">
                <div className="channel-switch">
                  <button
                    type="button"
                    className={channel === 'INTERNAL' ? 'active' : ''}
                    onClick={() => setChannel('INTERNAL')}
                  >
                    Chat interno
                  </button>
                  <button
                    type="button"
                    disabled={!whatsappReady}
                    className={channel === 'WHATSAPP' ? 'active' : ''}
                    onClick={() => setChannel('WHATSAPP')}
                  >
                    WhatsApp oficial
                  </button>
                </div>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder={
                    channel === 'INTERNAL'
                      ? 'Escreva uma observação para a equipe…'
                      : 'Escreva a mensagem permitida pela Meta…'
                  }
                  maxLength={4096}
                />
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void send()}
                  disabled={sending || !content.trim()}
                >
                  <Send size={16} /> {sending ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
            </>
          ) : (
            <p className="empty-state">Selecione um lead para abrir a conversa.</p>
          )}
          {error && <p className="form-error">{error}</p>}
        </div>
      </div>
    </section>
  );
}
