"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { URGENCIA_COR } from "@/lib/alertas";
import { CATEGORIA_LABEL, type CategoriaProcesso } from "@/lib/types";
import type { EventoCalendario } from "@/lib/queries";

// Cores alinhadas com as agendas do Google Agenda usadas pela
// imobiliária: Vendas = vermelho (Tomato), Financiamento = azul
// claro/lavanda (Sacra Cred), Locação = azul (Peacock).
const CATEGORIA_PONTO: Record<CategoriaProcesso, string> = {
  venda: "bg-red-600",
  financiamento: "bg-indigo-300",
  locacao: "bg-blue-600",
  marketing: "bg-emerald-500",
};

const CATEGORIA_TEXTO: Record<CategoriaProcesso, string> = {
  venda: "text-red-700",
  financiamento: "text-indigo-700",
  locacao: "text-blue-700",
  marketing: "text-emerald-700",
};

function prioridadeEvento(e: EventoCalendario): number {
  if (!e.concluida && e.urgencia === "atrasada") return 0;
  if (!e.concluida && e.urgencia === "vence_hoje") return 1;
  if (!e.concluida && e.urgencia === "vence_em_breve") return 2;
  if (e.recorrente) return 4;
  return 3;
}

function tituloCurto(titulo: string): string {
  return titulo.replace(/^⚠️\s*/, "");
}

export function DiaCelula({
  dia,
  isToday,
  foraDoMes,
  eventos,
  compacto,
  maxPorDia = 3,
}: {
  dia: string;
  isToday: boolean;
  foraDoMes: boolean;
  eventos: EventoCalendario[];
  compacto: boolean;
  maxPorDia?: number;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const eventosOrdenados = [...eventos].sort((a, b) => prioridadeEvento(a) - prioridadeEvento(b));
  const eventosVisiveis = eventosOrdenados.slice(0, maxPorDia);
  const eventosOcultos = Math.max(eventosOrdenados.length - eventosVisiveis.length, 0);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  return (
    <div
      ref={ref}
      className={`relative border-b border-r border-border p-2 transition last:border-r-0 hover:bg-background/70 ${
        compacto ? "min-h-[72px]" : "min-h-[104px]"
      } ${foraDoMes ? "bg-background/40" : "bg-surface"}`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p
          className={`text-xs ${
            isToday
              ? "flex h-5 w-5 items-center justify-center rounded-full bg-brand font-semibold text-white"
              : foraDoMes
                ? "text-ink-muted/50"
                : "font-medium text-ink-muted"
          }`}
        >
          {dia}
        </p>
        {eventos.length > 0 && (
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="rounded-full bg-background px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted hover:text-ink"
            aria-label={`Abrir ${eventos.length} evento${eventos.length > 1 ? "s" : ""} desse dia`}
          >
            {eventos.length}
          </button>
        )}
      </div>

      {eventos.length > 0 && (
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-label={`${eventos.length} evento${eventos.length > 1 ? "s" : ""} nesse dia`}
          className="w-full space-y-1 text-left"
        >
          {eventosVisiveis.map((e) => (
            <span
              key={e.id}
              className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] leading-none ${
                e.concluida
                  ? "bg-stone-100 text-stone-500"
                  : e.recorrente
                    ? "bg-violet-50 text-violet-700"
                    : "bg-background text-ink"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  e.recorrente ? "bg-violet-400" : CATEGORIA_PONTO[e.categoria]
                }`}
              />
              <span className="truncate">{tituloCurto(e.titulo)}</span>
            </span>
          ))}
          {eventosOcultos > 0 && (
            <span className="inline-flex rounded-md bg-background px-1.5 py-1 text-[10px] font-medium text-ink-muted">
              +{eventosOcultos} mais
            </span>
          )}
        </button>
      )}

      {aberto && (
        <>
          {/* fundo escurecido — fecha ao clicar fora */}
          <div
            className="fixed inset-0 z-20 bg-black/30"
            onClick={() => setAberto(false)}
            aria-hidden="true"
          />
          {/* cartão centralizado na tela */}
          <div className="fixed inset-x-4 top-1/2 z-30 mx-auto max-h-[76vh] w-full max-w-lg -translate-y-1/2 overflow-hidden rounded-xl border border-border/60 bg-surface p-4 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3 px-1">
              <div>
                <p className="text-sm font-semibold text-ink">
                  Dia {dia}
                </p>
                <p className="text-xs text-ink-muted">
                {eventos.length} evento{eventos.length > 1 ? "s" : ""} nesse dia
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="rounded-md px-2 py-1 text-ink-muted hover:bg-background hover:text-ink"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[55vh] space-y-1 overflow-y-auto">
              {eventosOrdenados.map((e) => (
                <Link
                  key={e.id}
                  href={e.href}
                  onClick={() => setAberto(false)}
                  className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-tight transition hover:opacity-85 ${
                    e.concluida
                      ? "border-stone-200 bg-stone-100 text-stone-500"
                      : e.recorrente
                        ? "border-violet-200 bg-violet-50 text-violet-700"
                        : URGENCIA_COR[e.urgencia]
                  }`}
                >
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${CATEGORIA_PONTO[e.categoria]}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{tituloCurto(e.titulo)}</span>
                    <span className={`mt-0.5 block text-[11px] ${CATEGORIA_TEXTO[e.categoria]}`}>
                      {e.recorrente ? "Tarefa recorrente" : CATEGORIA_LABEL[e.categoria]}
                      {e.responsavelNome ? ` · ${e.responsavelNome}` : ""}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
