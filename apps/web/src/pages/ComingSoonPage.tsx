export function ComingSoonPage({ title }: { title: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-8">
      <p className="eyebrow text-cyan-700">Em desenvolvimento</p>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Esta área já possui uma rota e será habilitada no módulo correspondente, sem antecipar
        regras comerciais.
      </p>
    </section>
  );
}
