import type { mediaCorretagem } from "@/lib/media-corretagem";
import { Flag, House, Target, TrendingUp, Trophy, Wallet } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { CartaoKpi } from "@/components/cartao-kpi";
import type { LinhaRankingVgv } from "@/lib/vgv-empresa";
import type { somarVgcEmpresa } from "@/lib/vgc-empresa";
import { progressoVgv } from "@/lib/metricas-empresa";

const moeda = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type DadosVgv = { corretagem: ReturnType<typeof mediaCorretagem>; ano: number; numeroVendas: number; realizadoCentavos: number; metaCentavos: number; cadastradoCentavos: number; historicoCentavos: number; semValor: number; ranking: LinhaRankingVgv[]; semParticipacao: number; vgc: ReturnType<typeof somarVgcEmpresa> };

export function PainelSacra({ dados }: { dados: DadosVgv }) {
  const progresso = progressoVgv(dados.realizadoCentavos, dados.metaCentavos);
  const percentual = progresso.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return <div className="w-full min-w-0 space-y-6">
    <CabecalhoPagina titulo="Resultados" descricao="Vendas, comissões geradas e o caminho até a meta anual." acao={<span className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold">Ano {dados.ano}</span>} />

    <section aria-labelledby="vgv-titulo" className="relative overflow-hidden rounded-2xl bg-brand p-6 text-white shadow-sm sm:p-8 lg:p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <h2 id="vgv-titulo" className="flex items-center gap-2 text-sm font-medium text-white/80"><House size={18} aria-hidden="true" />VGV realizado em {dados.ano}</h2>
          <p className="mt-4 break-words text-3xl font-bold tracking-tight tabular-nums sm:text-4xl xl:text-5xl">{moeda(dados.realizadoCentavos)}</p>
          <p className="mt-3 text-sm text-white/80">Valor geral de vendas dos imóveis da empresa.</p>
        </div>
        <div className="flex flex-wrap gap-4">
        <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4">
          <House size={22} aria-hidden="true" className="mb-3 text-white/80" />
          <p className="text-3xl font-bold tabular-nums">{dados.numeroVendas.toLocaleString("pt-BR")}</p>
          <p className="mt-1 text-sm text-white/80">{dados.numeroVendas === 1 ? "venda no ano" : "vendas no ano"}</p>
        </div>
        <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4">
          <TrendingUp size={22} aria-hidden="true" className="mb-3 text-white/80" />
          <p className="text-3xl font-bold tabular-nums">{percentual}%</p>
          <p className="mt-1 text-sm text-white/80">da meta anual atingida</p>
        </div>
        </div>
      </div>
      <div className="mt-8">
        <div className="mb-3 flex flex-wrap justify-between gap-2 text-sm text-white/90"><span>Progresso da meta</span><span>Meta: {moeda(dados.metaCentavos)}</span></div>
        <div role="progressbar" aria-label="Progresso da meta anual de VGV" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progresso.percentualBarra} aria-valuetext={`${percentual}% da meta anual atingida`} className="h-4 overflow-hidden rounded-full bg-black/20">
          <div className="h-full rounded-full bg-amber-300" style={{ width: `${progresso.percentualBarra}%` }} />
        </div>
        <div aria-hidden="true" className="mt-2 flex justify-between text-xs text-white/70"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
      </div>
    </section>

    <div className="grid gap-4 md:grid-cols-3">
      <CartaoKpi label="VGV realizado" valor={moeda(dados.realizadoCentavos)} icon={House} tom="marca" rodape={<p className="mt-3 text-sm text-ink-muted">Vendas cadastradas + histórico complementar.</p>} />
      <CartaoKpi label="Meta anual de VGV" valor={moeda(dados.metaCentavos)} icon={Target} tom="info" rodape={<p className="mt-3 text-sm text-ink-muted">Objetivo da empresa para {dados.ano}.</p>} />
      <CartaoKpi label={progresso.restanteCentavos > 0 ? "Falta para a meta" : "Meta alcançada"} valor={moeda(progresso.restanteCentavos)} icon={Flag} tom="sucesso" rodape={<p className="mt-3 text-sm text-ink-muted">{progresso.restanteCentavos > 0 ? "Volume de vendas necessário para atingir o objetivo." : "O VGV realizado atingiu o objetivo anual."}</p>} />
    </div>

    <section aria-label="Comissões">
      <div className="grid gap-4 md:grid-cols-2">
        <CartaoKpi label="VGC total" valor={moeda(dados.vgc.apuradoCentavos)} icon={Wallet} tom="marca" rodape={<p className="mt-3 text-xs text-ink-muted">Sacra + equipe · comissões geradas</p>} />
        <CartaoKpi label="Média de comissão" valor={dados.corretagem.percentual === null ? "Sem dados" : `${dados.corretagem.percentual.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`} icon={TrendingUp} tom="info" rodape={<p className="mt-3 text-xs text-ink-muted">Comissão total dos contratos · {dados.corretagem.quantidade} vendas</p>} />
      </div>
      {dados.corretagem.pendentes.length > 0 && <details className="mt-3 rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm">{dados.corretagem.pendentes.length} vendas fora da média por falta de dados</summary><ul className="mt-3 space-y-1 text-sm text-ink-muted">{dados.corretagem.pendentes.map(p => <li key={p.id}>{p.imovel}</li>)}</ul></details>}
    </section>

    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6" aria-labelledby="ranking-titulo">
      <h2 id="ranking-titulo" className="flex items-center gap-2 font-semibold"><Trophy size={20} className="text-brand" aria-hidden="true" />Ranking de corretores por VGV</h2>
      <p className="mt-2 text-sm leading-6 text-ink-muted">VGV das vendas em que cada corretor participa, como captador ou vendedor.</p>
      {dados.ranking.length > 0 ? <ol className="mt-5 divide-y divide-border">
        {dados.ranking.map(linha => <li key={linha.id} className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${linha.posicao === 1 ? "bg-brand text-white" : "bg-brand-soft text-brand"}`}>{linha.posicao}º</span>
          <div className="min-w-0"><p className="font-semibold">{linha.nome}</p><p className="mt-1 text-xs text-ink-muted">{linha.vendas} {linha.vendas === 1 ? "venda com participação" : "vendas com participação"}</p><div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-brand/70" style={{ width: `${linha.valorCentavos / dados.ranking[0].valorCentavos * 100}%` }} /></div></div>
          <p className="col-start-2 break-words text-lg font-bold tabular-nums text-brand sm:col-start-3">{moeda(linha.valorCentavos)}</p>
        </li>)}
      </ol> : <p className="mt-5 rounded-xl bg-background p-4 text-sm text-ink-muted">Ainda não há vendas com participação da equipe identificada.</p>}
      {dados.semParticipacao > 0 && <p className="mt-2 text-sm text-ink-muted">{dados.semParticipacao} venda(s) ainda sem participação informada: entram no VGV geral e aguardam identificação para o ranking.</p>}
    </section>


  </div>;
}
