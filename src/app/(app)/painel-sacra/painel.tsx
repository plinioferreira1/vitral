import { BarChart3, CircleDollarSign, HandCoins, Hourglass, House, Target, Trophy, TrendingUp, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { CartaoKpi } from "@/components/cartao-kpi";
import { INPUT_CLASS } from "@/components/ui/styles";

const indicadores = [
  { label: "VGV", descricao: "Valor dos imóveis vendidos", icon: House, tom: "marca" },
  { label: "VGC da Sacra", descricao: "Comissão gerada para a Sacra", icon: CircleDollarSign, tom: "marca" },
  { label: "Comissão recebida", descricao: "Recebimentos da comissão da Sacra", icon: Wallet, tom: "sucesso" },
  { label: "Comissão a receber", descricao: "Saldo pendente da comissão da Sacra", icon: HandCoins, tom: "info" },
  { label: "Vendas realizadas", descricao: "Negócios fechados no período", icon: House, tom: "info" },
  { label: "Ticket médio", descricao: "Valor médio dos imóveis vendidos", icon: TrendingUp, tom: "info" },
] as const;

function Secao({ titulo, descricao, children }: { titulo: string; descricao: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-border/70 bg-surface p-5 shadow-sm"><h2 className="font-semibold text-ink">{titulo}</h2><p className="mt-1 text-sm text-ink-muted">{descricao}</p>{children}</section>;
}

export function PainelSacra() {
  return <div className="mx-auto max-w-7xl space-y-6">
    <CabecalhoPagina titulo="Painel Sacra" descricao="Resultados comerciais, comissões e desempenho da equipe em um só lugar." acao={<span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"><Hourglass size={14} aria-hidden="true" />Aguardando a planilha</span>} />

    <div className="rounded-xl border border-brand/15 bg-brand-soft p-4 text-sm leading-6 text-ink"><p className="font-semibold">A estrutura do painel está pronta.</p><p className="mt-1 text-ink-muted">Os indicadores serão preenchidos após recebermos e conferirmos a planilha. O VGC representa a comissão gerada para a Sacra; os repasses aos corretores serão tratados separadamente.</p></div>

    <fieldset disabled className="rounded-xl border border-border/70 bg-surface p-4"><legend className="px-1 text-sm font-semibold">Filtros do painel</legend><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <label className="text-xs font-medium text-ink-muted">Período<select className={`${INPUT_CLASS} mt-1 disabled:cursor-not-allowed disabled:opacity-60`} defaultValue="mes"><option value="mes">Mês</option><option value="trimestre">Trimestre</option><option value="ano">Ano</option><option value="personalizado">Personalizado</option></select></label>
      <label className="text-xs font-medium text-ink-muted">Data inicial<input type="date" className={`${INPUT_CLASS} mt-1 disabled:cursor-not-allowed disabled:opacity-60`} /></label>
      <label className="text-xs font-medium text-ink-muted">Data final<input type="date" className={`${INPUT_CLASS} mt-1 disabled:cursor-not-allowed disabled:opacity-60`} /></label>
      <label className="text-xs font-medium text-ink-muted">Corretor<select className={`${INPUT_CLASS} mt-1 disabled:cursor-not-allowed disabled:opacity-60`}><option>Todos os corretores</option></select></label>
    </div><p className="mt-3 text-xs text-ink-muted">Os filtros serão liberados quando os dados estiverem disponíveis.</p></fieldset>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{indicadores.map(item => <CartaoKpi key={item.label} label={item.label} icon={item.icon} tom={item.tom} valor="—" rodape={<p className="mt-3 text-xs text-ink-muted">{item.descricao} · Dados pendentes</p>} />)}</div>

    <div className="grid gap-6 lg:grid-cols-2">
      <Secao titulo="Evolução mensal" descricao="VGV e VGC da Sacra ao longo do tempo."><div className="relative mt-5 flex min-h-64 items-center justify-center rounded-xl border border-dashed border-border bg-background p-6"><div className="text-center"><BarChart3 size={32} className="mx-auto text-ink-muted" aria-hidden="true" /><p className="mt-3 text-sm font-medium">O histórico aparecerá aqui</p><p className="mt-1 text-xs text-ink-muted">Aguardando os valores e as datas das vendas.</p></div></div></Secao>
      <Secao titulo="Ranking de corretores" descricao="Classificação pelo VGV realizado no período."><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[460px] text-left text-sm"><caption className="sr-only">Ranking por VGV, ainda sem dados</caption><thead className="border-b border-border text-xs text-ink-muted"><tr>{["Posição", "Corretor", "Vendas", "VGV", "Ticket médio"].map(nome => <th key={nome} scope="col" className="px-2 py-3 font-medium">{nome}</th>)}</tr></thead><tbody><tr><td colSpan={5} className="px-4 py-12 text-center"><Trophy size={28} className="mx-auto text-ink-muted" aria-hidden="true" /><p className="mt-3 font-medium">Ranking aguardando dados</p><p className="mt-1 text-xs text-ink-muted">Os corretores serão listados após a conferência da planilha.</p></td></tr></tbody></table></div></Secao>
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      <Secao titulo="Metas e desempenho" descricao="Acompanhe o realizado e o percentual atingido."><div className="mt-5 flex items-start gap-3 rounded-xl bg-background p-4"><Target size={22} className="shrink-0 text-brand" aria-hidden="true" /><div><p className="text-sm font-medium">Metas ainda não cadastradas</p><p className="mt-1 text-sm text-ink-muted">Espaço reservado às metas de VGV, VGC e quantidade de vendas, com resultado da equipe e por corretor.</p></div></div></Secao>
      <Secao titulo="Vendas em andamento" descricao="Visão dos negócios que ainda estão em processo."><dl className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-background p-4"><dt className="text-xs text-ink-muted">Quantidade de processos</dt><dd className="mt-2 text-xl font-bold">—</dd></div><div className="rounded-xl bg-background p-4"><dt className="text-xs text-ink-muted">Volume em andamento</dt><dd className="mt-2 text-xl font-bold">—</dd></div></dl><p className="mt-3 text-xs text-ink-muted">Dados pendentes. Este volume será apresentado separadamente das vendas realizadas.</p></Secao>
    </div>
    <p className="text-xs leading-5 text-ink-muted">Fonte dos indicadores: planilha a ser enviada e validada. Nenhum resultado comercial foi calculado nesta etapa.</p>
  </div>;
}
