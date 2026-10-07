export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Carregando usuários e acessos"
      className="mx-auto max-w-6xl animate-pulse space-y-5"
    >
      <div className="h-9 w-64 rounded-lg bg-border/60" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-20 rounded-xl bg-border/40" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-border/40" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
