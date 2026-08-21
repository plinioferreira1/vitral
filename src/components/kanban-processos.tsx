import Link from "next/link";

export interface CardKanban {
  id: string;
  titulo: string;
  subtitulo: string;
  etapaAtual: string | null;
  atrasos: number;
}

/**
 * Agrupa processos em colunas pela etapa atual (a primeira etapa
 * sequencial ainda não concluída). Processos sem etapa em aberto
 * (todas concluídas, mas o processo ainda não foi marcado como
 * concluído) caem numa coluna "Sem etapa em aberto".
 */
export function KanbanProcessos({
  colunas,
  cards,
}: {
  colunas: string[];
  cards: CardKanban[];
}) {
  const colunaExtra = "Sem etapa em aberto";
  const cardsPorColuna = new Map<string, CardKanban[]>();
  [...colunas, colunaExtra].forEach((c) => cardsPorColuna.set(c, []));
  cards.forEach((card) => {
    const coluna = card.etapaAtual && cardsPorColuna.has(card.etapaAtual) ? card.etapaAtual : colunaExtra;
    cardsPorColuna.get(coluna)!.push(card);
  });

  // As colunas padrão (Etapas padrão) aparecem sempre, mesmo vazias —
  // formato fixo do quadro. A coluna extra só aparece se tiver algo.
  const colunasParaMostrar = [
    ...colunas,
    ...((cardsPorColuna.get(colunaExtra)?.length ?? 0) > 0 ? [colunaExtra] : []),
  ];

  if (colunasParaMostrar.length === 0) {
    return (
      <p className="rounded-xl border border-border/60 bg-surface p-8 text-center text-sm text-ink-muted shadow-sm">
        Nenhuma etapa padrão configurada pra essa categoria ainda.
      </p>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {colunasParaMostrar.map((coluna) => {
        const cardsColuna = cardsPorColuna.get(coluna) ?? [];
        return (
          <div key={coluna} className="w-72 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{coluna}</p>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs text-ink-muted">
                {cardsColuna.length}
              </span>
            </div>
            <div className="space-y-2">
              {cardsColuna.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-ink-muted">
                  Nenhum processo aqui
                </div>
              ) : (
                cardsColuna.map((card) => (
                  <Link
                    key={card.id}
                    href={`/processos/${card.id}`}
                    className="block rounded-xl border border-border/60 bg-surface p-3 shadow-sm transition hover:border-brand hover:bg-background"
                  >
                    <p className="text-sm font-medium text-ink">{card.titulo}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{card.subtitulo}</p>
                    {card.atrasos > 0 && (
                      <span className="mt-2 inline-block rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                        {card.atrasos} atraso{card.atrasos > 1 ? "s" : ""}
                      </span>
                    )}
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
