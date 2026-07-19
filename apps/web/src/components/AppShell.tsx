import {
  BadgeDollarSign,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  ContactRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  UsersRound
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import type { User } from '../lib/api.js';

const navigation = [
  {
    group: 'Visão geral',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/agenda', label: 'Agenda', icon: CalendarDays }
    ]
  },
  {
    group: 'Operação comercial',
    items: [
      { to: '/leads', label: 'Pipeline e Kanban', icon: ContactRound },
      { to: '/conversas', label: 'Conversas', icon: MessageCircle },
      { to: '/vendas', label: 'Vendas', icon: BadgeDollarSign },
      { to: '/assinaturas', label: 'Assinaturas', icon: Package },
      { to: '/comissoes', label: 'Comissões', icon: BadgeDollarSign }
    ]
  },
  {
    group: 'Administração',
    items: [
      { to: '/parceiros-e-produtos', label: 'Catálogo', icon: Package },
      { to: '/usuarios', label: 'Usuários', icon: UsersRound },
      { to: '/auditoria', label: 'Auditoria', icon: ClipboardList },
      { to: '/relatorios', label: 'Relatórios', icon: ChartNoAxesCombined },
      { to: '/configuracoes', label: 'Configurações', icon: Settings }
    ]
  }
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
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('prospectinbound-sidebar-collapsed') === 'true'
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    localStorage.getItem('prospectinbound-theme') === 'dark' ? 'dark' : 'light'
  );
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);
  useEffect(() => {
    const updateViewport = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('prospectinbound-theme', next);
    document.documentElement.dataset.theme = next;
  };
  const toggleNavigation = () => {
    if (!isDesktop) {
      setMobileOpen((open) => !open);
      return;
    }
    setSidebarCollapsed((collapsed) => {
      localStorage.setItem('prospectinbound-sidebar-collapsed', String(!collapsed));
      return !collapsed;
    });
  };
  document.documentElement.dataset.theme = theme;
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Fechar menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${mobileOpen ? 'sidebar-open' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
      >
        <div className="brand-lockup">
          <span className="brand-mark">P</span>
          <div className="brand-copy">
            <p className="brand-name">ProspectInbound</p>
            <p className="brand-subtitle">CRM local</p>
          </div>
        </div>
        <nav className="space-y-6">
          {navigation.map((section) => (
            <div key={section.group}>
              <p className="nav-group-label">{section.group}</p>
              <div className="mt-2 space-y-1">
                {section.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
                    aria-label={label}
                    title={label}
                  >
                    <Icon size={17} strokeWidth={2.2} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className={`app-content ${sidebarCollapsed ? 'app-content-collapsed' : ''}`}>
        <header className="app-header flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
          <button
            className="sidebar-toggle"
            onClick={toggleNavigation}
            type="button"
            aria-label={
              isDesktop
                ? sidebarCollapsed
                  ? 'Expandir menu'
                  : 'Recolher menu'
                : mobileOpen
                  ? 'Fechar menu'
                  : 'Abrir menu'
            }
            title={
              isDesktop
                ? sidebarCollapsed
                  ? 'Expandir menu'
                  : 'Recolher menu'
                : mobileOpen
                  ? 'Fechar menu'
                  : 'Abrir menu'
            }
          >
            <Menu className="lg:hidden" size={20} />
            {sidebarCollapsed ? (
              <PanelLeftOpen className="hidden lg:block" size={20} />
            ) : (
              <PanelLeftClose className="hidden lg:block" size={20} />
            )}
          </button>
          <div className="hidden lg:block">
            <p className="text-sm text-slate-500">Visão geral da operação</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              type="button"
              aria-label="Alternar tema"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <div className="hidden text-right text-sm sm:block">
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
