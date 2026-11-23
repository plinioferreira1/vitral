import Link from "next/link";
import { PainelLancamentos } from "../painel-lancamentos";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { Plus } from "lucide-react";

type Params = {
  tipo?: string; status?: string; referencia?: string; categoria?: string;
  pessoa?: string; conta_bancaria?: string; unidade?: string; competencia?: string;
  q?: string; ordenar?: string; direcao?: string; pagina?: string; por_pagina?: string;
};

export default async function LancamentosPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const tipo = params.tipo === "receita" ? "receita" : "despesa";
  const filtros = { ...params };
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
