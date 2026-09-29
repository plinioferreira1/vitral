"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";

export type DashboardAreaItem = {
  id: string;
  titulo: string;
  subtitulo: string;
  detalhe: string;
  href: string;
  tag?: string;
};

export type DashboardAreaResumo = {
  id: string;
  titulo: string;
  descricao: string;
  href: string;
  total: number;
  totalLabel?: string;
  atrasados: number;
  venceHoje: number;
  venceEmBreve: number;
  itens: DashboardAreaItem[];
  vazio: string;
  acaoLabel: string;
};

export function DashboardAreaCards({ areas }: { areas: DashboardAreaResumo[] }) {
  const [ativa, setAtiva] = useState<string | null>(areas[0]?.id ?? null);
  const areaAtiva = areas.find((area) => area.id === ativa) ?? null;

  if (areas.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="grid gap-4 lg:grid-cols-3">
        {areas.map((area) => {
          const selecionada = area.id === ativa;
          return (
            <button
              key={area.id}
              type="button"
              onClick={() => setAtiva((atual) => (atual === area.id ? null : area.id))}
              className={`group rounded-xl border bg-surface p-4 text-left shadow-sm transition hover:border-border-strong hover:shadow-md ${
                selecionada ? "border-brand/40 ring-2 ring-brand/10" : "border-border/70"
              }`}
              aria-expanded={selecionada}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-ink">{area.titulo}</p>
                  <p className="mt-1 text-xs leading-5 text-ink-muted">{area.descricao}</p>
                </div>
                <ChevronDown
                  size={16}
                  className={`mt-0.5 shrink-0 text-ink-muted transition ${
                    selecionada ? "rotate-180" : "group-hover:translate-y-0.5"
                  }`}
                />
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="num text-3xl font-bold leading-none text-ink">{area.total}</p>
                  <p className="mt-1 text-xs text-ink-muted">{area.totalLabel ?? "em andamento"}</p>
                </div>
                <div className="grid gap-1 text-right text-xs text-ink-muted">
                  <span>
                    <b className={area.atrasados > 0 ? "text-rose-700" : "text-ink"}>
                      {area.atrasados}
                    </b>{" "}
                    atrasados
                  </span>
                  <span>
                    <b className={area.venceHoje > 0 ? "text-amber-700" : "text-ink"}>
                      {area.venceHoje}
                    </b>{" "}
                    hoje
                  </span>
                  <span>
                    <b className="text-ink">{area.venceEmBreve}</b> em 7 dias
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {areaAtiva && (
        <div className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">
                {areaAtiva.titulo}: lista rápida ({areaAtiva.itens.length})
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                Abra um item específico sem sair procurando na tela principal.
              </p>
            </div>
            <Link
              href={areaAtiva.href}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-background"
            >
              {areaAtiva.acaoLabel} <ArrowRight size={14} />
            </Link>
          </div>

          {areaAtiva.itens.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border bg-background px-4 py-5 text-center text-sm text-ink-muted">
              {areaAtiva.vazio}
            </p>
          ) : (
            <div className="mt-4 grid max-h-[360px] gap-2 overflow-y-auto pr-1 lg:grid-cols-2">
              {areaAtiva.itens.map((item) => (
                <Link
                  key={`${areaAtiva.id}-${item.id}`}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-2.5 transition hover:border-border-strong hover:bg-surface"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{item.titulo}</span>
                      {item.tag && (
                        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
                          {item.tag}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ink-muted">{item.subtitulo}</span>
                    <span className="mt-0.5 block truncate text-xs font-medium text-ink-muted">
                      {item.detalhe}
                    </span>
                  </span>
                  <ArrowRight
                    size={15}
                    className="shrink-0 text-ink-muted transition group-hover:translate-x-0.5"
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
