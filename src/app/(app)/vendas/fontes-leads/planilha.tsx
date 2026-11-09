"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { salvarFonteRapida } from "./actions";

export type LinhaVenda = {
  id: string;
  tipo: "processo" | "historico";
  imovel: string;
  mes: string;
  san: string | null;
  fonte: string | null;
  situacao: "concluida" | "andamento";
};

function Linha({ linha, fontes }: { linha: LinhaVenda; fontes: string[] }) {
  const router = useRouter();
  const [fonte, setFonte] = useState(linha.fonte ?? "");
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  const opcoes = fonte && !fontes.some((f) => f === fonte)
    ? [fonte, ...fontes] : fontes;
  return <tr className="border-t border-border/70 hover:bg-background/70">
    <td className="px-3 py-3">
      <div className="font-medium text-ink">{linha.imovel}</div>
      <div className="text-xs text-ink-muted">
        {linha.mes ? linha.mes.slice(5, 7) + "/" + linha.mes.slice(0, 4) : "Sem mês"}
        {linha.san ? " · SAN " + linha.san : ""}
        {linha.tipo === "processo" ? <> · <Link href={`/processos/${linha.id}`} className="text-brand hover:underline">Abrir processo</Link></> : null}
      </div>
    </td>
    <td className="px-3 py-3">
      <span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${linha.situacao === "concluida" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
        {linha.situacao === "concluida" ? "Concluída" : "Em andamento"}
      </span>
    </td>
    <td className="min-w-[190px] px-3 py-3">
      <select aria-label={`Fonte do lead de ${linha.imovel}`} value={fonte} disabled={pendente}
        onChange={(event) => {
          const proxima = event.target.value;
          const anterior = fonte;
          setFonte(proxima);
          setErro("");
          iniciar(async () => {
            const resultado = await salvarFonteRapida(linha.tipo, linha.id, proxima);
            if (!resultado.ok) { setFonte(anterior); setErro(resultado.erro ?? "Erro ao salvar"); }
            else router.refresh();
          });
        }}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand disabled:opacity-60">
        <option value="">Selecionar fonte</option>
        {opcoes.map(op => <option key={op} value={op}>{op}</option>)}
      </select>
      {erro ? <p role="alert" className="mt-1 text-xs text-rose-700">{erro}</p> : pendente ? <p className="mt-1 text-xs text-ink-muted">Salvando…</p> : null}
    </td>
  </tr>;
}

export function PlanilhaFontes({ linhas, ano, fontes }: { linhas: LinhaVenda[]; ano: string; fontes: string[] }) {
  const [busca, setBusca] = useState("");
  const [estado, setEstado] = useState("todos");
  const [canal, setCanal] = useState("");
  const filtradas = useMemo(() => linhas.filter(l => {
    if (estado !== "todos" && l.situacao !== estado) return false;
    if (canal && (l.fonte ?? "") !== canal) return false;
    const texto = [l.imovel, l.san, l.mes].join(" ").toLocaleLowerCase("pt-BR");
    return texto.includes(busca.toLocaleLowerCase("pt-BR"));
  }), [linhas, busca, estado, canal]);
  return <section className="overflow-hidden rounded-xl border border-border bg-surface">
    <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
      <input aria-label="Pesquisar imóvel" value={busca} onChange={e => setBusca(e.target.value)}
        placeholder="Buscar imóvel ou código SAN" className="min-w-52 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
      <select aria-label="Filtrar situação" value={estado} onChange={e => setEstado(e.target.value)}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
        <option value="todos">Todas as situações</option>
        <option value="concluida">Concluídas</option>
        <option value="andamento">Em andamento</option>
      </select>
      <select aria-label="Filtrar fonte" value={canal} onChange={e => setCanal(e.target.value)}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
        <option value="">Todos os canais</option>
        {fontes.map(op => <option key={op} value={op}>{op}</option>)}
      </select>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[650px] text-left text-sm">
        <thead className="bg-background text-xs uppercase tracking-wide text-ink-muted">
          <tr><th className="px-3 py-3">Imóvel · {ano}</th><th className="px-3 py-3">Situação</th><th className="px-3 py-3">Fonte do lead</th></tr>
        </thead>
        <tbody>{filtradas.map(l => <Linha key={l.tipo + l.id} linha={l} fontes={fontes} />)}</tbody>
      </table>
    </div>
    {!filtradas.length && <p className="p-6 text-sm text-ink-muted">Nenhuma venda encontrada.</p>}
    <p className="border-t border-border px-4 py-3 text-xs text-ink-muted">
      {filtradas.length} de {linhas.length} vendas · Alterações na fonte são salvas automaticamente.
    </p>
  </section>;
}
