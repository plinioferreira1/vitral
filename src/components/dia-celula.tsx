"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { URGENCIA_COR } from "@/lib/alertas";
import { type CategoriaProcesso } from "@/lib/types";
import type { EventoCalendario } from "@/lib/queries";

const CATEGORIA_PONTO: Record<CategoriaProcesso, string> = {
  venda: "bg-brand",
  financiamento: "bg-gold",
  locacao: "bg-stone-500",
};

export function DiaCelula({
  dia,
  isToday,
  foraDoMes,
  eventos,
  compacto,
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
      className={`relative border-b border-r border-border p-1.5 last:border-r-0 ${
        compacto ? "min-h-[60px]" : "min-h-[80px]"
      } ${foraDoMes ? "bg-background/50" : ""}`}
    >
      <p
        className={`mb-1 text-xs ${
          isToday
            ? "flex h-5 w-5 items-center justify-center rounded-full bg-brand font-medium text-white"
            : foraDoMes
              ? "text-ink-muted/50"
              : "text-ink-muted"
        }`}
      >
        {dia}
      </p>

      {/* Só bolinhas coloridas — clica no dia pra ver a lista completa */}
      {eventos.length > 0 && (
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-label={`${eventos.length} evento${eventos.length > 1 ? "s" : ""} nesse dia`}
          className="flex w-full flex-wrap items-center gap-1"
        >
          {eventos.slice(0, 6).map((e) => (
            <span
              key={e.id}
              className={`h-2 w-2 shrink-0 rounded-full ${CATEGORIA_PONTO[e.categoria]}`}
            />
          ))}
          {eventos.length > 6 && (
            <span className="text-[9px] text-ink-muted">+{eventos.length - 6}</span>
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
          <div className="fixed inset-x-4 top-1/2 z-30 mx-auto max-h-[70vh] w-full max-w-sm -translate-y-1/2 overflow-hidden rounded-xl border border-border bg-surface p-3 shadow-xl">
            <div className="mb-1.5 flex items-center justify-between px-1">
              <p className="text-[11px] font-semibold text-ink">
                {eventos.length} evento{eventos.length > 1 ? "s" : ""} nesse dia
              </p>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="text-ink-muted hover:text-ink"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[55vh] space-y-1 overflow-y-auto">
              {eventos.map((e) => (
                <Link
                  key={e.id}
                  href={e.href}
                  onClick={() => setAberto(false)}
                  className={`flex items-start gap-1.5 rounded border px-1.5 py-1.5 text-xs leading-tight ${
                    e.concluida ? "border-stone-200 bg-stone-100 text-stone-500" : URGENCIA_COR[e.urgencia]
                  }`}
                >
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${CATEGORIA_PONTO[e.categoria]}`} />
                  <span className="min-w-0 flex-1">{e.titulo}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
