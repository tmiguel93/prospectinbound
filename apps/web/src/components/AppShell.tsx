import { LayoutDashboard, LogOut, Menu, Settings, UsersRound } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import type { User } from '../lib/api.js';

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pipelines', label: 'Pipelines', icon: Menu },
  { to: '/agenda', label: 'Agenda', icon: Menu },
  { to: '/leads', label: 'Leads', icon: UsersRound },
  { to: '/vendas', label: 'Vendas', icon: Menu },
  { to: '/assinaturas', label: 'Assinaturas', icon: Menu },
  { to: '/comissoes', label: 'Comissões', icon: Menu },
  { to: '/parceiros-e-produtos', label: 'Parceiros e Produtos', icon: Menu },
  { to: '/usuarios', label: 'Usuários', icon: UsersRound },
  { to: '/relatorios', label: 'Relatórios', icon: Menu },
  { to: '/configuracoes', label: 'Configurações', icon: Settings }
];

export function AppShell({
  user,
  onLogout,
  children
}: {
  user: User;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="mb-8 px-3">
          <p className="eyebrow">ProspectInbound</p>
          <p className="font-semibold text-white">CRM local</p>
        </div>
        <nav className="space-y-1">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
          <button
            className="rounded-lg p-2 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            type="button"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <div className="hidden lg:block">
            <p className="text-sm text-slate-500">Visão geral da operação</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="font-semibold">{user.name}</p>
              <p className="text-slate-500">
                {user.role === 'ADMIN' ? 'Administrador' : 'Vendedor'}
              </p>
            </div>
            <button
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              onClick={onLogout}
              type="button"
              aria-label="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
