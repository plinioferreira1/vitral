import Link from "next/link";
import { Flag, House, Target, TrendingUp, Trophy, Wallet } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { CartaoKpi } from "@/components/cartao-kpi";
import type { LinhaRankingVgv } from "@/lib/vgv-empresa";
import type { somarVgcEmpresa } from "@/lib/vgc-empresa";
import { progressoVgv } from "@/lib/metricas-empresa";

const moeda = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type DadosVgv = { ano: number; numeroVendas: number; realizadoCentavos: number; metaCentavos: number; cadastradoCentavos: number; historicoCentavos: number; semValor: number; ranking: LinhaRankingVgv[]; semParticipacao: number; vgc: ReturnType<typeof somarVgcEmpresa> };

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

    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6" aria-labelledby="vgc-titulo">
      <h2 id="vgc-titulo" className="flex items-center gap-2 font-semibold"><Wallet size={20} className="text-brand" aria-hidden="true" />VGC — comissões geradas</h2>
      <p className="mt-2 text-sm leading-6 text-ink-muted">Comissões destinadas à Sacra e aos corretores que faziam parte da equipe na venda. Parcelas de parceiros externos ficam fora. Valores gerados, sem indicar que já foram recebidos.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <CartaoKpi label="VGC apurado" valor={moeda(dados.vgc.apuradoCentavos)} icon={Wallet} tom="marca" rodape={<p className="mt-3 text-sm text-ink-muted">{dados.vgc.vendasConferidas} vendas conferidas. Base revisada em 10/10/2026.</p>} />
        <CartaoKpi label="VGC aguardando confirmação" valor={moeda(dados.vgc.pendenteCentavos)} icon={Flag} tom="info" rodape={<p className="mt-3 text-sm text-ink-muted">{dados.vgc.pendencias.length} vendas com rateios pendentes. Este valor não está somado ao VGC apurado.</p>} />
      </div>
      <p className="mt-4 text-xs leading-5 text-ink-muted">O VGC usa os valores contratuais conferidos; não é estimado pelo preço do imóvel. Novas vendas e alterações de comissão precisam de nova conferência.</p>
      {dados.vgc.semConferencia > 0 && <p className="mt-3 text-sm text-ink-muted">{dados.vgc.semConferencia} venda(s) cadastrada(s) ainda sem comissão conferida.</p>}
      {dados.vgc.pendencias.length > 0 && <details className="mt-5 rounded-xl border border-border p-4">
        <summary className="cursor-pointer font-medium">Ver pendências do VGC</summary>
        <ul className="mt-4 space-y-4">{dados.vgc.pendencias.map(p => <li key={p.id} className="text-sm leading-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><span className="font-semibold">{p.imovel}</span><span className="tabular-nums">{moeda(p.valorCentavos)}</span></div>
          <p className="text-ink-muted">{p.pendencia}</p>
          <div className="mt-1 flex flex-wrap gap-4"><a className="text-brand underline underline-offset-4" href={p.fonte} target="_blank" rel="noreferrer">Ver contrato</a>{p.processoId && <Link className="text-brand underline underline-offset-4" href={`/processos/${p.processoId}`}>Abrir venda</Link>}</div>
        </li>)}</ul>
      </details>}
    </section>

    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6" aria-labelledby="ranking-titulo">
      <h2 id="ranking-titulo" className="flex items-center gap-2 font-semibold"><Trophy size={20} className="text-brand" aria-hidden="true" />Ranking de corretores por VGV</h2>
      <p className="mt-2 text-sm leading-6 text-ink-muted">Cada corretor da Sacra recebe o VGV integral das vendas em que participa como captador ou vendedor. Uma venda compartilhada conta para os dois; no total da empresa, conta uma única vez.</p>
      {dados.ranking.length > 0 ? <ol className="mt-5 divide-y divide-border">
        {dados.ranking.map(linha => <li key={linha.id} className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-4 gap-y-2 py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${linha.posicao === 1 ? "bg-brand text-white" : "bg-brand-soft text-brand"}`}>{linha.posicao}º</span>
          <div className="min-w-0"><p className="font-semibold">{linha.nome}</p><p className="mt-1 text-xs text-ink-muted">{linha.vendas} {linha.vendas === 1 ? "venda com participação" : "vendas com participação"}</p><div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-brand/70" style={{ width: `${linha.valorCentavos / dados.ranking[0].valorCentavos * 100}%` }} /></div></div>
          <p className="col-start-2 break-words text-lg font-bold tabular-nums text-brand sm:col-start-3">{moeda(linha.valorCentavos)}</p>
        </li>)}
      </ol> : <p className="mt-5 rounded-xl bg-background p-4 text-sm text-ink-muted">Ainda não há vendas com participação da equipe identificada.</p>}
      <p className="mt-4 text-xs leading-5 text-ink-muted">O ranking considera Amanda, Camila, Michele, Plínio e Ricardo. A soma dos resultados individuais pode superar o VGV geral por causa das vendas compartilhadas.</p>
      {dados.semParticipacao > 0 && <p className="mt-2 text-sm text-ink-muted">{dados.semParticipacao} venda(s) ainda sem participação informada: entram no VGV geral e aguardam identificação para o ranking.</p>}
    </section>

    <aside className="rounded-xl border border-border bg-surface p-5 text-sm leading-6">
      <h2 className="font-semibold">Como o VGV é atualizado</h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2"><div><dt className="text-ink-muted">Vendas cadastradas em {dados.ano}</dt><dd className="font-semibold tabular-nums">{moeda(dados.cadastradoCentavos)}</dd></div><div><dt className="text-ink-muted">Histórico complementar conferido</dt><dd className="font-semibold tabular-nums">{moeda(dados.historicoCentavos)}</dd></div></dl>
      <p className="mt-3 text-ink-muted">Uma nova venda entra automaticamente pelo valor e pelo ano da data base do cadastro. Alterações de valor e cancelamentos também atualizam o painel ao abri-lo novamente.</p>
      <p className="mt-1 text-ink-muted">O histórico da aba Comissões 2026 e os contratos conferidos complementam as vendas anteriores. O Reserva Parque Clube está incluído pelo contrato, com R$ 620 mil. As vendas já vinculadas ao Vitral usam o valor do cadastro e entram uma única vez.</p>
      <p className="mt-1 text-ink-muted">Segunda QI 10, Golden Park, Costa Verde, Reserva Parque Clube, L’Essence du Parc e os dois imóveis da permuta foram pré-cadastrados. Os vínculos com o histórico mantêm cada venda uma única vez no total.</p>
      {dados.semValor > 0 && <p className="mt-2 text-xs text-ink-muted">{dados.semValor} processo(s) de venda sem valor informado não acrescentam volume ao VGV.</p>}
    </aside>
  </div>;
}
