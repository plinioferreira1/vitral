interface Tutorial {
  id: string;
  categoria: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  conteudo: string | null;
  link: string | null;
}

function urlEmbed(link: string): string | null {
  try {
    const url = new URL(link);
    if (url.hostname.includes("youtube.com") && url.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${url.searchParams.get("v")}`;
    }
    if (url.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${url.pathname}`;
    }
    if (url.hostname.includes("loom.com") && url.pathname.startsWith("/share/")) {
      return `https://www.loom.com/embed${url.pathname.replace("/share", "")}`;
    }
    return null;
  } catch {
    return null;
  }
}

function CardTutorial({ t }: { t: Tutorial }) {
  const embed = t.link ? urlEmbed(t.link) : null;

  return (
    <details className="group rounded-xl border border-border/60 bg-surface shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-medium text-ink">
        <span className="min-w-0">
          {t.titulo}
          {t.descricao && (
            <span className="ml-2 font-normal text-ink-muted">— {t.descricao}</span>
          )}
        </span>
        <span className="shrink-0 text-xs font-normal text-ink-muted group-open:hidden">
          abrir
        </span>
        <span className="hidden shrink-0 text-xs font-normal text-ink-muted group-open:inline">
          fechar
        </span>
      </summary>
      <div className="space-y-3 border-t border-border p-4 text-sm text-ink">
        {t.tipo === "video" && t.link && embed && (
          <div className="aspect-video w-full overflow-hidden rounded-lg bg-background">
            <iframe
              src={embed}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        {t.tipo === "video" && t.link && !embed && (
          <a
            href={t.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-medium text-brand hover:underline"
          >
            Assistir vídeo →
          </a>
        )}
        {t.conteudo && <p className="whitespace-pre-line text-ink-muted">{t.conteudo}</p>}
      </div>
    </details>
  );
}

export function TutoriaisSistema({ tutoriais }: { tutoriais: Tutorial[] }) {
  if (tutoriais.length === 0) return null;

  const categorias = Array.from(new Set(tutoriais.map((t) => t.categoria)));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-ink">Tutoriais do sistema</h2>
      {categorias.map((categoria) => (
        <div key={categoria} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {categoria}
          </p>
          <div className="space-y-2">
            {tutoriais
              .filter((t) => t.categoria === categoria)
              .map((t) => (
                <CardTutorial key={t.id} t={t} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
