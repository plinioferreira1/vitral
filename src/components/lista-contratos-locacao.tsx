"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight } from "lucide-react";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { apagarContratosSelecionados } from "@/app/(app)/locacao/bulk-actions";

export interface ContratoLista {
  id: string;
  numero: string;
  ativo: boolean;
  imoveis: { endereco: string } | null;
  locador: { nome: string } | null;
  locatario: { nome: string } | null;
}

export function ListaContratosLocacao({ contratos, vencidas, encerrados = false }: {
  contratos: ContratoLista[];
  vencidas: Record<string, number>;
  encerrados?: boolean;
}) {
  const [busca, setBusca] = useState("");
  const [somenteVencidas, setSomenteVencidas] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  const filtrados = contratos.filter(c =>
    (!termo || [c.numero, c.imoveis?.endereco, c.locador?.nome, c.locatario?.nome].some(v => v?.toLocaleLowerCase("pt-BR").includes(termo)))
    && (!somenteVencidas || (vencidas[c.id] ?? 0) > 0),
  );
  const selecionadosVisiveis = selecionados.filter(id => filtrados.some(c => c.id === id));
  const limpar = () => { setBusca(""); setSomenteVencidas(false); setSelecionados([]); };
  return <div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search size={17} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input aria-label={encerrados ? "Buscar contratos encerrados" : "Buscar contratos ativos"} value={busca} onChange={e => { setBusca(e.target.value); setSelecionados([]); }} placeholder="Buscar imóvel, contrato, locador ou locatário" className="w-full rounded-lg border border-border bg-surface py-3 pl-10 pr-3 text-sm outline-none focus:border-brand" />
      </div>
      {!encerrados && <button type="button" aria-pressed={somenteVencidas} onClick={() => { setSomenteVencidas(v => !v); setSelecionados([]); }} className={`rounded-full border px-3 py-2 text-xs font-semibold ${somenteVencidas ? "border-rose-200 bg-rose-50 text-rose-700" : "border-border bg-surface text-ink-muted"}`}>Com contas vencidas</button>}
      {(busca || somenteVencidas) && <button type="button" onClick={limpar} className="text-xs font-semibold text-brand hover:underline">Limpar filtros</button>}
    </div>
    <div className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/60 px-4 py-3">
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          <input type="checkbox" aria-label="Selecionar todos os contratos visíveis" disabled={!filtrados.length} checked={filtrados.length > 0 && selecionadosVisiveis.length === filtrados.length} onChange={e => setSelecionados(e.target.checked ? filtrados.map(c => c.id) : [])} className="h-4 w-4 accent-brand" />
          <span aria-live="polite">{filtrados.length} de {contratos.length} contratos</span>
        </label>
        {selecionadosVisiveis.length > 0 && <form action={apagarContratosSelecionados}>
          {selecionadosVisiveis.map(id => <input key={id} type="hidden" name="ids" value={id} />)}
          <BotaoComConfirmacao mensagem={`Apagar ${selecionadosVisiveis.length} contratos selecionados? Essa ação não pode ser desfeita.`} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">Apagar selecionados ({selecionadosVisiveis.length})</BotaoComConfirmacao>
        </form>}
      </div>
      {filtrados.length === 0 ? <p className="p-8 text-center text-sm text-ink-muted">{contratos.length ? "Nenhum contrato encontrado. Ajuste os filtros." : encerrados ? "Nenhum contrato encerrado." : "Nenhum contrato ativo no momento."}</p> : <ul className="divide-y divide-border">
        {filtrados.map(c => {
          const quantidade = vencidas[c.id] ?? 0;
          return <li key={c.id} className="flex items-start gap-3 p-4 sm:p-5">
            <input type="checkbox" aria-label={`Selecionar contrato ${c.numero}`} checked={selecionadosVisiveis.includes(c.id)} onChange={e => setSelecionados(e.target.checked ? [...selecionadosVisiveis, c.id] : selecionadosVisiveis.filter(id => id !== c.id))} className="mt-1 h-4 w-4 shrink-0 accent-brand" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0"><Link href={`/locacao/${c.id}`} className="break-words text-sm font-semibold text-ink hover:text-brand hover:underline">{c.imoveis?.endereco || c.numero}</Link><p className="mt-1 text-xs text-ink-muted">Contrato {c.numero}</p></div>
                <span className={`w-fit shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${quantidade > 0 ? "border-rose-200 bg-rose-50 text-rose-700" : encerrados ? "border-border bg-background text-ink-muted" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{quantidade > 0 ? `${quantidade} conta${quantidade > 1 ? "s" : ""} vencida${quantidade > 1 ? "s" : ""}` : encerrados ? "Encerrado" : "Sem contas vencidas"}</span>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2"><div><dt className="text-[11px] text-ink-muted">Locador</dt><dd className="mt-1 break-words text-sm text-ink">{c.locador?.nome ?? "Não informado"}</dd></div><div><dt className="text-[11px] text-ink-muted">Locatário</dt><dd className="mt-1 break-words text-sm text-ink">{c.locatario?.nome ?? "Não informado"}</dd></div></dl>
              <div className="mt-4 flex justify-end"><Link href={`/locacao/${c.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">Abrir contrato <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
            </div>
          </li>;
        })}
      </ul>}
    </div>
  </div>;
}
