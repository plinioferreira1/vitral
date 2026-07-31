"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { URGENCIA_COR } from "@/lib/alertas";
import { CATEGORIA_LABEL, type CategoriaProcesso } from "@/lib/types";
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
  maxPorDia,
}: {
  dia: string;
  isToday: boolean;
  foraDoMes: boolean;
  eventos: EventoCalendario[];
  compacto: boolean;
  maxPorDia: number;
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

  const restantes = eventos.length - maxPorDia;

  return (
    <div
      ref={ref}
      className={`relative border-b border-r border-border p-1.5 last:border-r-0 ${
        compacto ? "min-h-[74px]" : "min-h-[110px]"
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
      <div className="space-y-1">
        {eventos.slice(0, maxPorDia).map((e) => (
          <Link
            key={e.id}
            href={e.href}
            className={`flex items-center gap-1 truncate rounded border px-1 py-0.5 text-[10px] leading-tight ${
              e.concluida ? "border-stone-200 bg-stone-100 text-stone-500" : URGENCIA_COR[e.urgencia]
            }`}
            title={`${CATEGORIA_LABEL[e.categoria]} — ${e.titulo}`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${CATEGORIA_PONTO[e.categoria]}`} />
            <span className="truncate">{e.titulo}</span>
          </Link>
        ))}
        {restantes > 0 && (
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="block w-full rounded px-1 py-0.5 text-left text-[10px] font-medium text-brand hover:bg-background hover:underline"
          >
            +{restantes} mais
          </button>
        )}
      </div>

      {aberto && (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 max-w-[80vw] rounded-lg border border-border bg-surface p-2 shadow-lg">
          <p className="mb-1.5 px-1 text-[11px] font-semibold text-ink">
            {eventos.length} evento{eventos.length > 1 ? "s" : ""} nesse dia
          </p>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {eventos.map((e) => (
              <Link
                key={e.id}
                href={e.href}
                onClick={() => setAberto(false)}
                className={`flex items-center gap-1.5 rounded border px-1.5 py-1 text-[11px] leading-tight ${
                  e.concluida ? "border-stone-200 bg-stone-100 text-stone-500" : URGENCIA_COR[e.urgencia]
                }`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${CATEGORIA_PONTO[e.categoria]}`} />
                <span className="min-w-0 flex-1 truncate">{e.titulo}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
