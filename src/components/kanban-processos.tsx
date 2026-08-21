"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { moverProcessoParaEtapa } from "@/app/(app)/processos/bulk-actions";

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
 * concluído) caem numa coluna "Sem etapa em aberto". Arrastar um
 * card pra outra coluna avança (ou volta) o processo de verdade.
 */
export function KanbanProcessos({
  colunas,
  cards,
}: {
  colunas: string[];
  cards: CardKanban[];
}) {
  const colunaExtra = "Sem etapa em aberto";
  const [cardArrastando, setCardArrastando] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

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

  function soltarEm(coluna: string) {
    if (!cardArrastando) return;
    const card = cards.find((c) => c.id === cardArrastando);
    setCardArrastando(null);
    setColunaAlvo(null);
    if (!card || card.etapaAtual === coluna || (coluna === colunaExtra && card.etapaAtual === null)) return;

    startTransition(async () => {
      await moverProcessoParaEtapa(card.id, coluna === colunaExtra ? null : coluna);
    });
  }

  return (
    <div className={`flex gap-4 overflow-x-auto pb-2 ${pendente ? "opacity-60" : ""}`}>
      {colunasParaMostrar.map((coluna) => {
        const cardsColuna = cardsPorColuna.get(coluna) ?? [];
        return (
          <div
            key={coluna}
            onDragOver={(ev) => {
              ev.preventDefault();
              if (colunaAlvo !== coluna) setColunaAlvo(coluna);
            }}
            onDragLeave={() => setColunaAlvo((atual) => (atual === coluna ? null : atual))}
            onDrop={(ev) => {
              ev.preventDefault();
              soltarEm(coluna);
            }}
            className={`w-72 shrink-0 rounded-xl transition ${
              colunaAlvo === coluna ? "bg-brand/5 ring-2 ring-brand/30" : ""
            }`}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{coluna}</p>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs text-ink-muted">
                {cardsColuna.length}
              </span>
            </div>
            <div className="space-y-2 p-1">
              {cardsColuna.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-ink-muted">
                  Nenhum processo aqui
                </div>
              ) : (
                cardsColuna.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => setCardArrastando(card.id)}
                    onDragEnd={() => {
                      setCardArrastando(null);
                      setColunaAlvo(null);
                    }}
                    className={`group relative rounded-xl border border-border/60 bg-surface shadow-sm transition ${
                      cardArrastando === card.id ? "opacity-40" : ""
                    }`}
                  >
                    <Link
                      href={`/processos/${card.id}`}
                      className="block cursor-grab p-3 pr-7 hover:bg-background active:cursor-grabbing"
                    >
                      <p className="text-sm font-medium text-ink">{card.titulo}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">{card.subtitulo}</p>
                      {card.atrasos > 0 && (
                        <span className="mt-2 inline-block rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                          {card.atrasos} atraso{card.atrasos > 1 ? "s" : ""}
                        </span>
                      )}
                    </Link>
                    <span className="pointer-events-none absolute right-2 top-2 select-none text-ink-muted opacity-0 transition group-hover:opacity-100">
                      ⠿
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
