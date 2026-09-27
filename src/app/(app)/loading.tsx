// Mostrado instantaneamente ao navegar entre páginas enquanto o servidor
// busca os dados — sem isso o clique parecia "travado" até a página inteira
// ficar pronta. Também habilita o prefetch das rotas dinâmicas no Next 16.
export default function Carregando() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2">
        <div className="h-7 w-64 rounded-md bg-border/70" />
        <div className="h-4 w-96 max-w-full rounded-md bg-border/50" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-border/60 bg-surface" />
        ))}
      </div>
      <div className="space-y-3 rounded-xl border border-border/60 bg-surface p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 rounded-md bg-border/50" style={{ width: `${90 - i * 8}%` }} />
        ))}
      </div>
    </div>
  );
}
