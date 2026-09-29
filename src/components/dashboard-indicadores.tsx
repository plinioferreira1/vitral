"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CATEGORIA_LABEL } from "@/lib/types";
import type { CategoriaProcesso } from "@/lib/types";

type IndicadorId = "andamento" | "atrasados" | "venceHoje" | "venceEmBreve";
type TomIndicador = "neutro" | "perigo" | "alerta";

export type DashboardIndicadorItem = {
  id: string;
  titulo: string;
  subtitulo: string;
  detalhe: string;
  categoria: Extract<CategoriaProcesso, "venda" | "financiamento">;
  href: string;
};

export type DashboardIndicadoresDados = Record<
  IndicadorId,
  {
    valor: number;
    label: string;
    descricao: string;
    itens: DashboardIndicadorItem[];
    tom: TomIndicador;
  }
>;

const CONFIG: Record<
  IndicadorId,
  {
    icon: LucideIcon;
    vazio: string;
  }
> = {
  andamento: {
    icon: FileText,
    vazio: "Nenhum processo em andamento.",
  },
  atrasados: {
    icon: AlertTriangle,
    vazio: "Nenhum processo atrasado.",
  },
  venceHoje: {
    icon: CalendarClock,
    vazio: "Nenhum processo vencendo hoje.",
  },
  venceEmBreve: {
    icon: CalendarDays,
    vazio: "Nenhum processo vencendo nos próximos 7 dias.",
  },
};

const ORDEM: IndicadorId[] = ["andamento", "atrasados", "venceHoje", "venceEmBreve"];

const TONS: Record<
  TomIndicador,
  {
    card: string;
    icon: string;
    valor: string;
    ativo: string;
  }
> = {
  neutro: {
    card: "border-border/60 bg-surface",
    icon: "bg-background text-ink-muted",
    valor: "text-ink",
    ativo: "ring-2 ring-brand/20",
  },
  perigo: {
    card: "border-rose-200 bg-rose-50",
    icon: "bg-rose-100 text-rose-700",
    valor: "text-rose-700",
    ativo: "ring-2 ring-rose-200",
  },
  alerta: {
    card: "border-border/60 bg-surface",
    icon: "bg-amber-100 text-amber-700",
    valor: "text-ink",
    ativo: "ring-2 ring-amber-200",
  },
};

export function DashboardIndicadores({ indicadores }: { indicadores: DashboardIndicadoresDados }) {
  const [ativo, setAtivo] = useState<IndicadorId | null>(null);
  const indicadorAtivo = ativo ? indicadores[ativo] : null;
  const configAtivo = ativo ? CONFIG[ativo] : null;

  return (
    <section className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ORDEM.map((id) => {
          const indicador = indicadores[id];
          const config = CONFIG[id];
          const Icon = config.icon;
          const tom = TONS[indicador.tom];
          const selecionado = ativo === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setAtivo((atual) => (atual === id ? null : id))}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left shadow-sm transition hover:border-border-strong hover:shadow-md ${
                tom.card
              } ${selecionado ? tom.ativo : ""}`}
              aria-expanded={selecionado}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tom.icon}`}>
                <Icon size={19} strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`num text-2xl font-bold leading-tight ${tom.valor}`}>{indicador.valor}</p>
                <p className="truncate text-xs text-ink-muted">{indicador.label}</p>
              </div>
              <ChevronDown
                size={16}
                className={`shrink-0 text-ink-muted transition ${selecionado ? "rotate-180" : ""}`}
              />
            </button>
          );
        })}
      </div>

      {indicadorAtivo && configAtivo && (
        <div className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">
                {indicadorAtivo.label} ({indicadorAtivo.valor})
              </p>
              <p className="mt-1 text-sm text-ink-muted">{indicadorAtivo.descricao}</p>
            </div>
            <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-ink-muted">
              Clique em um item para abrir o processo
            </span>
          </div>

          {indicadorAtivo.itens.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border bg-background px-4 py-5 text-center text-sm text-ink-muted">
              {configAtivo.vazio}
            </p>
          ) : (
            <div className="mt-4 grid max-h-[360px] gap-2 overflow-y-auto pr-1 lg:grid-cols-2">
              {indicadorAtivo.itens.map((item) => (
                <Link
                  key={`${ativo}-${item.id}`}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-2.5 transition hover:border-border-strong hover:bg-surface"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{item.titulo}</span>
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
                        {CATEGORIA_LABEL[item.categoria]}
                      </span>
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
