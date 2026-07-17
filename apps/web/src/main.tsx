import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center p-6">
      <section className="max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
          ProspectInbound
        </p>
        <h1 className="text-3xl font-bold">CRM local em preparação</h1>
        <p className="mt-4 leading-7 text-slate-300">
          A base técnica está pronta. Os módulos de autenticação, pipelines, leads e comissões serão
          adicionados sequencialmente.
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
