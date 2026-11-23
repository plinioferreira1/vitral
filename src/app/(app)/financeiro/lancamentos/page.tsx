import Link from "next/link";
import { PainelLancamentos } from "../painel-lancamentos";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { hojeISO } from "@/lib/data-br";

type Params = {
  tipo?: string; mes?: string; status?: string; referencia?: string; categoria?: string;
  pessoa?: string; conta_bancaria?: string; unidade?: string; competencia?: string;
  q?: string; ordenar?: string; direcao?: string; pagina?: string; por_pagina?: string;
};

export default async function LancamentosPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const tipo = params.tipo === "receita" ? "receita" : "despesa";
  const mesAtual = hojeISO().slice(0, 7);
  const mesSelecionado = params.mes && /^20\d{2}-(0[1-9]|1[0-2])$/.test(params.mes) ? params.mes : mesAtual;
  const [ano, numeroMes] = mesSelecionado.split("-").map(Number);
  const rotuloMes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(ano, numeroMes - 1, 1))).replace(/^./, c => c.toUpperCase()).replace(" de ", "/");
  const mesHref = (delta: number) => {
    const destino = new Date(Date.UTC(ano, numeroMes - 1 + delta, 1)).toISOString().slice(0, 7);
    const q = new URLSearchParams({ tipo, referencia: "mes", ...(destino !== mesAtual ? { mes: destino } : {}) });
    return "/financeiro/lancamentos?" + q.toString();
  };
  const filtros = { ...params, mes: mesSelecionado, referencia: params.referencia ?? (params.status === "vencido" ? "todos" : "mes") };
  filtros.tipo = tipo;
  const tab = (nome: "receita" | "despesa") => {
    const q = new URLSearchParams();
    for (const [chave, valor] of Object.entries(filtros)) if (valor && chave !== "pagina") q.set(chave, valor);
    q.set("tipo", nome);
    return "/financeiro/lancamentos?" + q.toString();
  };

  return (
    <div className="financeiro-ui min-w-0 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <CabecalhoPagina titulo="Lançamentos" descricao="Despesas e receitas em uma única área de trabalho." />
        <Link href={"/financeiro/lancamentos/novo?tipo=" + tipo}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          <Plus size={16} /> Novo lançamento
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1" aria-label="Selecionar mês dos lançamentos">
          <Link href={mesHref(-1)} aria-label="Mês anterior" className="rounded-lg p-2 text-ink-muted hover:bg-background"><ChevronLeft size={16} /></Link>
          <span className="min-w-[134px] text-center text-sm font-semibold text-ink">{rotuloMes}</span>
          <Link href={mesHref(1)} aria-label="Próximo mês" className="rounded-lg p-2 text-ink-muted hover:bg-background"><ChevronRight size={16} /></Link>
          {mesSelecionado !== mesAtual && <Link href={"/financeiro/lancamentos?tipo=" + tipo + "&referencia=mes"} className="rounded-lg px-2 py-1.5 text-xs font-medium text-brand hover:bg-background">Mês atual</Link>}
        </div>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-2">
        <Link href={tab("despesa")} aria-current={tipo === "despesa" ? "page" : undefined}
          className={"rounded-lg px-5 py-2.5 text-sm font-semibold transition " + (tipo === "despesa" ? "bg-brand text-white" : "text-ink-muted hover:bg-background hover:text-ink")}>
          Contas a pagar
        </Link>
        <Link href={tab("receita")} aria-current={tipo === "receita" ? "page" : undefined}
          className={"rounded-lg px-5 py-2.5 text-sm font-semibold transition " + (tipo === "receita" ? "bg-brand text-white" : "text-ink-muted hover:bg-background hover:text-ink")}>
          Contas a receber
        </Link>
      </div>
      <PainelLancamentos tipo={tipo} searchParams={filtros} />
    </div>
  );
}
