import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell.js';
import { AuthScreen } from './components/AuthScreen.js';
import { DashboardPage } from './features/dashboard/DashboardPage.js';
import { ProductCatalogPage } from './features/catalog/ProductCatalogPage.js';
import { LeadsPage } from './features/leads/LeadsPage.js';
import { AgendaPage } from './features/agenda/AgendaPage.js';
import { AuditPage, UsersPage } from './features/admin/AdminPage.js';
import { apiRequest, type User } from './lib/api.js';
import { ComingSoonPage } from './pages/ComingSoonPage.js';
import './styles.css';

const placeholders = [
  'Pipelines',
  'Vendas',
  'Assinaturas',
  'Comissões',
  'Relatórios',
  'Configurações'
];

function AuthenticatedApp({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <BrowserRouter>
      <AppShell user={user} onLogout={onLogout}>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/parceiros-e-produtos" element={<ProductCatalogPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/usuarios" element={<UsersPage />} />
          <Route path="/auditoria" element={<AuditPage />} />
          {placeholders.map((title) => (
            <Route
              key={title}
              path={`/${title
                .toLocaleLowerCase('pt-BR')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replaceAll(' ', '-')}`}
              element={<ComingSoonPage title={title} />}
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
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
  return user ? (
    <AuthenticatedApp user={user} onLogout={logout} />
  ) : (
    <AuthScreen initialized={initialized ?? false} onSuccess={setUser} />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
