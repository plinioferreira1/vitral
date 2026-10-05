"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CalendarClock, GripVertical } from "lucide-react";
import { moverProcessoParaEtapa } from "@/app/(app)/processos/bulk-actions";

export interface CardKanban {
  id: string;
  titulo: string;
  subtitulo: string;
  etapaAtual: string | null;
  atrasos: number;
  prazoAtual?: {
    texto: string;
    tom: "atrasado" | "hoje" | "proximo" | "normal" | "neutro";
  } | null;
}

export interface CardPrazo {
  id: string;
  titulo: string;
  subtitulo: string;
  cor: "vermelho" | "amarelo" | "neutro";
}

const COR_PRAZO: Record<CardPrazo["cor"], string> = {
  vermelho: "border-rose-200 bg-rose-50",
  amarelo: "border-amber-200 bg-amber-50",
  neutro: "border-border bg-background",
};

const COR_PRAZO_TEXTO: Record<CardPrazo["cor"], string> = {
  vermelho: "text-rose-700",
  amarelo: "text-amber-700",
  neutro: "text-ink-muted",
};

// Paleta de cores das colunas do Kanban — cada coluna (etapa) recebe
// uma cor diferente, em sequência, só pra facilitar a leitura visual
// (não tem relação com status/urgência, é só identificação).
const PALETA_COLUNA = [
  { borda: "border-t-brand", texto: "text-brand", selo: "bg-brand-soft text-brand" },
  { borda: "border-t-amber-500", texto: "text-amber-700", selo: "bg-amber-50 text-amber-700" },
  { borda: "border-t-blue-500", texto: "text-blue-700", selo: "bg-blue-50 text-blue-700" },
  { borda: "border-t-emerald-500", texto: "text-emerald-700", selo: "bg-emerald-50 text-emerald-700" },
  { borda: "border-t-violet-500", texto: "text-violet-700", selo: "bg-violet-50 text-violet-700" },
  { borda: "border-t-rose-400", texto: "text-rose-700", selo: "bg-rose-50 text-rose-700" },
  { borda: "border-t-cyan-500", texto: "text-cyan-700", selo: "bg-cyan-50 text-cyan-700" },
  { borda: "border-t-orange-500", texto: "text-orange-700", selo: "bg-orange-50 text-orange-700" },
  { borda: "border-t-indigo-500", texto: "text-indigo-700", selo: "bg-indigo-50 text-indigo-700" },
  { borda: "border-t-teal-500", texto: "text-teal-700", selo: "bg-teal-50 text-teal-700" },
  { borda: "border-t-fuchsia-500", texto: "text-fuchsia-700", selo: "bg-fuchsia-50 text-fuchsia-700" },
  { borda: "border-t-lime-500", texto: "text-lime-700", selo: "bg-lime-50 text-lime-700" },
];

/**
 * Agrupa processos em colunas pela etapa atual (a primeira etapa
 * sequencial ainda não concluída). Processos sem etapa em aberto
 * (todas concluídas, mas o processo ainda não foi marcado como
 * concluído) caem numa coluna "Sem etapa em aberto". Arrastar um
 * card pra outra coluna avança (ou volta) o processo de verdade.
 *
 * `colunaPrazos`, se passada, aparece como uma coluna extra fixa
 * no final — só pra consulta (não dá pra arrastar cards pra
 * dentro/fora dela), mostrando o prazo final de cada processo.
 */
export function KanbanProcessos({
  colunas,
  cards,
  colunaPrazos,
}: {
  colunas: string[];
  cards: CardKanban[];
  colunaPrazos?: { titulo: string; cards: CardPrazo[] };
}) {
  const colunaExtra = "Sem etapa em aberto";
  const [cardArrastando, setCardArrastando] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<string | null>(null);
  const [colunaMobile, setColunaMobile] = useState<string | null>(null);
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
  const colunaMobileAtiva =
    colunaMobile && colunasParaMostrar.includes(colunaMobile)
      ? colunaMobile
      : colunasParaMostrar.find((coluna) => (cardsPorColuna.get(coluna)?.length ?? 0) > 0) ??
        colunasParaMostrar[0];

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

  function cartaoProcesso(card: CardKanban, compactoMobile = false) {
    const tomPrazo =
      card.prazoAtual?.tom === "atrasado"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : card.prazoAtual?.tom === "hoje"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : card.prazoAtual?.tom === "proximo"
            ? "border-amber-100 bg-amber-50/70 text-amber-700"
            : card.prazoAtual?.tom === "normal"
              ? "border-emerald-100 bg-emerald-50/70 text-emerald-700"
              : "border-border bg-background text-ink-muted";

    return (
      <div
        key={card.id}
        draggable={!compactoMobile}
        onDragStart={() => setCardArrastando(card.id)}
        onDragEnd={() => {
          setCardArrastando(null);
          setColunaAlvo(null);
        }}
        className={`group relative rounded-xl border border-border/70 bg-surface shadow-sm transition hover:border-border-strong hover:shadow-md ${
          cardArrastando === card.id ? "opacity-40" : ""
        }`}
      >
        <Link
          href={`/processos/${card.id}`}
          className={`block p-3.5 ${compactoMobile ? "" : "cursor-grab active:cursor-grabbing"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-sm font-semibold leading-5 text-ink">{card.titulo}</p>
            {!compactoMobile && (
              <GripVertical
                size={15}
                className="mt-0.5 shrink-0 text-ink-muted/50 opacity-0 transition group-hover:opacity-100"
                aria-hidden="true"
              />
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-4 text-ink-muted">{card.subtitulo}</p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {card.prazoAtual && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${tomPrazo}`}>
                <CalendarClock size={12} strokeWidth={2.2} />
                {card.prazoAtual.texto}
              </span>
            )}
            {card.atrasos > 0 && card.prazoAtual?.tom !== "atrasado" && (
              <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700">
                {card.atrasos} atraso{card.atrasos > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className={`md:hidden ${pendente ? "opacity-60" : ""}`}>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-muted" htmlFor="etapa-kanban-mobile">
          Etapa
        </label>
        <select
          id="etapa-kanban-mobile"
          value={colunaMobileAtiva}
          onChange={(evento) => setColunaMobile(evento.target.value)}
          className="mb-3 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
        >
          {colunasParaMostrar.map((coluna) => (
            <option key={coluna} value={coluna}>
              {coluna} ({cardsPorColuna.get(coluna)?.length ?? 0})
            </option>
          ))}
        </select>
        <div className="space-y-2">
          {(cardsPorColuna.get(colunaMobileAtiva) ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-ink-muted">
              Nenhum processo nesta etapa
            </div>
          ) : (
            (cardsPorColuna.get(colunaMobileAtiva) ?? []).map((card) => cartaoProcesso(card, true))
          )}
        </div>
      </div>

      <div className={`hidden gap-4 md:flex ${pendente ? "opacity-60" : ""}`}>
        <div className="flex min-w-0 flex-1 gap-3 overflow-x-auto pb-3">
        {colunasParaMostrar.map((coluna, indice) => {
        const cardsColuna = cardsPorColuna.get(coluna) ?? [];
        const cor = PALETA_COLUNA[indice % PALETA_COLUNA.length];
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
            className={`w-[260px] shrink-0 rounded-xl transition ${
              colunaAlvo === coluna ? "bg-brand/5 ring-2 ring-brand/30" : ""
            }`}
          >
            <div className={`mb-2 flex items-center justify-between border-t-4 ${cor.borda} px-1 pt-2`}>
              <p className={`text-xs font-semibold uppercase tracking-wide ${cor.texto}`}>{coluna}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cor.selo}`}>
                {cardsColuna.length}
              </span>
            </div>
            <div className="space-y-2 p-1">
              {cardsColuna.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-ink-muted">
                  Nenhum processo aqui
                </div>
              ) : (
                cardsColuna.map((card) => cartaoProcesso(card))
              )}
            </div>
          </div>
        );
      })}
        </div>

      {colunaPrazos && (
        <div className="w-[260px] shrink-0">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {colunaPrazos.titulo}
            </p>
            <span className="rounded-full bg-background px-2 py-0.5 text-xs text-ink-muted">
              {colunaPrazos.cards.length}
            </span>
          </div>
          <div className="max-h-[520px] space-y-2 overflow-y-auto p-1">
            {colunaPrazos.cards.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-ink-muted">
                Nenhum prazo cadastrado
              </div>
            ) : (
              colunaPrazos.cards.map((card) => (
                <Link
                  key={card.id}
                  href={`/processos/${card.id}`}
                  className={`block rounded-xl border p-3 shadow-sm transition hover:opacity-80 ${COR_PRAZO[card.cor]}`}
                >
                  <p className="text-sm font-medium text-ink">{card.titulo}</p>
                  <p className={`mt-0.5 text-xs font-medium ${COR_PRAZO_TEXTO[card.cor]}`}>
                    {card.subtitulo}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
