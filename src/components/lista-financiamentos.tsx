"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Search, SlidersHorizontal } from "lucide-react";
import type { ProcessoRow } from "@/components/tabela-processos";
import { STATUS_COR, STATUS_LABEL } from "@/components/tabela-processos";
import type { EtapaAcompanhamento } from "@/lib/acompanhamento-financiamentos";
import { URGENCIA_COR, URGENCIA_LABEL, type Urgencia } from "@/lib/alertas";
import { salvarCodigoSanProcesso, salvarNumeroPropostaContratoProcesso } from "@/app/(app)/processos/[id]/actions";
import { identificacaoProcesso } from "@/lib/identificacao-processo";
import { apagarProcessosSelecionados } from "@/app/(app)/processos/bulk-actions";
import { BotaoEnviar } from "@/components/botao-enviar";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";

export type AcompanhamentoFinanciamento = EtapaAcompanhamento & { urgencia: Urgencia };

function data(iso: string | null) {
  return iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR") : "Não definido";
}

export function ListaFinanciamentos({ rows, acompanhamento, atrasos, finalizados = false, categoria = "financiamento" }: {
  rows: ProcessoRow[];
  acompanhamento: Record<string, AcompanhamentoFinanciamento>;
  atrasos: Record<string, number>;
  finalizados?: boolean;
  categoria?: "venda" | "financiamento";
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [responsavel, setResponsavel] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const responsaveis = [...new Set(rows.flatMap(p => acompanhamento[p.id]?.usuarios?.nome ?? []))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const filtradas = rows.filter(p => {
    const atual = acompanhamento[p.id];
    const campos = [p.numero_processo, p.codigo_san, p.numero_proposta_contrato, p.imoveis?.endereco, p.comprador?.nome, p.vendedor?.nome, p.bancos?.nome, atual?.nome, atual?.usuarios?.nome];
    return (!termo || campos.some(c => c?.toLocaleLowerCase("pt-BR").includes(termo)))
      && (filtro !== "atrasados" || (atrasos[p.id] ?? 0) > 0)
      && (filtro !== "hoje" || atual?.urgencia === "vence_hoje")
      && (!responsavel || atual?.usuarios?.nome === responsavel);
  });
  const visiveis = new Set(filtradas.map(p => p.id));
  const selecionadosVisiveis = selecionados.filter(id => visiveis.has(id));
  const todosSelecionados = filtradas.length > 0 && selecionadosVisiveis.length === filtradas.length;
  const limpar = () => { setBusca(""); setFiltro("todos"); setResponsavel(""); setSelecionados([]); };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input aria-label={categoria === "venda" ? "Buscar vendas" : "Buscar financiamentos"} value={busca} onChange={e => { setBusca(e.target.value); setSelecionados([]); }} placeholder={categoria === "venda" ? "Buscar imóvel, comprador, vendedor, SAN ou etapa" : "Buscar imóvel, cliente, proposta/contrato, banco ou etapa"} className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" />
        </div>
        {!finalizados && <select aria-label="Filtrar por responsável da etapa atual" value={responsavel} onChange={e => { setResponsavel(e.target.value); setSelecionados([]); }} className="rounded-lg border border-border bg-surface px-3 py-3 text-sm text-ink outline-none focus:border-brand">
          <option value="">Todos os responsáveis</option>
          {responsaveis.map(nome => <option key={nome} value={nome}>{nome}</option>)}
        </select>}
      </div>
      {!finalizados && <div className="flex flex-wrap items-center gap-2" aria-label="Filtros de prazo">
        <SlidersHorizontal size={15} aria-hidden="true" className="text-ink-muted" />
        {[["todos", "Todos"], ["atrasados", "Com etapas atrasadas"], ["hoje", "Etapa vence hoje"]].map(([id, label]) => <button key={id} type="button" aria-pressed={filtro === id} onClick={() => { setFiltro(id); setSelecionados([]); }} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${filtro === id ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface text-ink-muted hover:text-ink"}`}>{label}</button>)}
        {(busca || filtro !== "todos" || responsavel) && <button type="button" onClick={limpar} className="px-2 py-1.5 text-xs font-semibold text-brand hover:underline">Limpar filtros</button>}
      </div>}
      <div className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/60 px-4 py-3">
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            <input type="checkbox" aria-label="Selecionar todos os resultados visíveis" checked={todosSelecionados} disabled={!filtradas.length} onChange={e => setSelecionados(e.target.checked ? filtradas.map(p => p.id) : [])} className="h-4 w-4 accent-brand" />
            <span aria-live="polite">{filtradas.length} de {rows.length} processos</span>
          </label>
          {selecionadosVisiveis.length > 0 && <form action={apagarProcessosSelecionados}>
            {selecionadosVisiveis.map(id => <input key={id} type="hidden" name="ids" value={id} />)}
            <BotaoComConfirmacao mensagem={`Apagar ${selecionadosVisiveis.length} processos selecionados? Essa ação não pode ser desfeita.`} className="rounded-lg border border-rose-200 bg-surface px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">Apagar selecionados ({selecionadosVisiveis.length})</BotaoComConfirmacao>
          </form>}
        </div>
        {filtradas.length === 0 ? <div className="p-8 text-center">
          <p className="text-sm font-semibold text-ink">{rows.length === 0 ? "Nenhum processo em andamento" : "Nenhum processo encontrado"}</p>
          <p className="mt-1 text-sm text-ink-muted">{rows.length === 0 ? "Os novos processos aparecerão aqui." : "Experimente outro termo ou ajuste os filtros."}</p>
          {rows.length > 0 && <button type="button" onClick={limpar} className="mt-3 text-sm font-semibold text-brand hover:underline">Limpar filtros</button>}
        </div> : <ul className="divide-y divide-border">
          {filtradas.map(p => {
            const atual = acompanhamento[p.id];
            const nAtrasos = atrasos[p.id] ?? 0;
            return <li key={p.id} className="p-4 transition hover:bg-background/40 sm:p-5">
              <div className="flex items-start gap-3">
                <input type="checkbox" aria-label={`Selecionar ${p.imoveis?.endereco || identificacaoProcesso(p, categoria)}`} checked={selecionadosVisiveis.includes(p.id)} onChange={e => setSelecionados(e.target.checked ? [...selecionadosVisiveis, p.id] : selecionadosVisiveis.filter(id => id !== p.id))} className="mt-1 h-4 w-4 shrink-0 accent-brand" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <Link href={`/processos/${p.id}`} className="break-words text-sm font-semibold text-ink hover:text-brand hover:underline">{p.imoveis?.endereco || identificacaoProcesso(p, categoria)}</Link>
                      <p className="mt-1 text-xs text-ink-muted">{p.comprador?.nome ?? "Cliente não informado"} · {identificacaoProcesso(p, categoria)}</p>
                      {categoria === "venda" && <p className="mt-1 text-xs text-ink-muted">Vendedor: {p.vendedor?.nome ?? "Não informado"}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {nAtrasos > 0 && <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">{nAtrasos} etapa{nAtrasos > 1 ? "s" : ""} atrasada{nAtrasos > 1 ? "s" : ""}</span>}
                      <span className={`rounded-full border px-2 py-1 text-xs font-medium ${STATUS_COR[p.status] ?? "bg-stone-50 text-stone-600"}`}>{STATUS_LABEL[p.status] ?? p.status}</span>
                    </div>
                  </div>
                  {!finalizados && <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div><dt className="text-[11px] text-ink-muted">Etapa atual</dt><dd className="mt-1 text-sm font-medium text-ink">{atual?.nome ?? "Sem etapa em aberto"}</dd></div>
                    <div><dt className="text-[11px] text-ink-muted">{categoria === "financiamento" ? "Banco" : "Responsável da etapa"}</dt><dd className="mt-1 text-sm text-ink">{categoria === "financiamento" ? p.bancos?.nome ?? "Não informado" : atual?.usuarios?.nome ?? "Não definido"}</dd></div>
                    <div><dt className="text-[11px] text-ink-muted">Prazo da etapa</dt><dd className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink">{data(atual?.data_prevista ?? null)}{atual && <span className={`rounded-full border px-2 py-0.5 text-[11px] ${URGENCIA_COR[atual.urgencia]}`}>{URGENCIA_LABEL[atual.urgencia]}</span>}</dd></div>
                  </dl>}
                  <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                    <details className="min-w-0 flex-1">
                      <summary className="w-fit cursor-pointer text-xs font-semibold text-ink-muted hover:text-brand">Dados complementares</summary>
                      <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
                        {[[categoria === "venda" ? "Corretor" : "Banco", categoria === "venda" ? p.corretores?.nome ?? "Não informado" : p.bancos?.nome ?? "Não informado"], [categoria === "venda" ? "Valor da venda" : "Valor financiado", (categoria === "venda" ? p.valor_total : p.valor_financiado) != null ? Number(categoria === "venda" ? p.valor_total : p.valor_financiado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Não informado"], ["Indicação", p.indicacao?.nome ?? "Não informada"], ["Modelo", p.modelos_processo?.nome ?? "Não informado"], ["Assinatura", data(p.data_assinatura)], ["Prazo final do contrato", data(p.data_final_contrato)]].map(([label, valor]) => <div key={label}><dt className="text-ink-muted">{label}</dt><dd className="mt-1 text-ink">{valor}</dd></div>)}
                      </dl>
                      <form action={categoria === "venda" ? salvarCodigoSanProcesso : salvarNumeroPropostaContratoProcesso} className="mt-3 flex max-w-sm items-end gap-2">
                        <input type="hidden" name="processo_id" value={p.id} />
                        <label className="min-w-0 flex-1 text-xs text-ink-muted">{categoria === "venda" ? "Código SAN" : "Proposta/contrato"}<input key={`${p.id}-${p.codigo_san}-${p.numero_proposta_contrato}`} name={categoria === "venda" ? "codigo_san" : "numero_proposta_contrato"} maxLength={120} defaultValue={(categoria === "venda" ? p.codigo_san : p.numero_proposta_contrato) ?? ""} className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand" /></label>
                        <BotaoEnviar className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white">Salvar</BotaoEnviar>
                      </form>
                    </details>
                    <Link href={`/processos/${p.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">Abrir processo <ArrowUpRight size={14} aria-hidden="true" /></Link>
                  </div>
                </div>
              </div>
            </li>;
          })}
        </ul>}
      </div>
    </div>
  );
}
