import { Flag, House, Target, TrendingUp } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { CartaoKpi } from "@/components/cartao-kpi";
import { progressoVgv } from "@/lib/metricas-empresa";

const moeda = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type DadosVgv = { ano: number; realizadoCentavos: number; metaCentavos: number };

export function PainelSacra({ dados }: { dados: DadosVgv }) {
  const progresso = progressoVgv(dados.realizadoCentavos, dados.metaCentavos);
  const percentual = progresso.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return <div className="w-full min-w-0 space-y-6">
    <CabecalhoPagina titulo="Métricas da empresa" descricao="O volume de vendas da Sacra e o caminho até a meta anual." acao={<span className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold">Ano {dados.ano}</span>} />

    <section aria-labelledby="vgv-titulo" className="relative overflow-hidden rounded-2xl bg-brand p-6 text-white shadow-sm sm:p-8 lg:p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <h2 id="vgv-titulo" className="flex items-center gap-2 text-sm font-medium text-white/80"><House size={18} aria-hidden="true" />VGV realizado em {dados.ano}</h2>
          <p className="mt-4 break-words text-3xl font-bold tracking-tight tabular-nums sm:text-4xl xl:text-5xl">{moeda(dados.realizadoCentavos)}</p>
          <p className="mt-3 text-sm text-white/80">Valor geral de vendas dos imóveis da empresa.</p>
        </div>
        <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4">
          <TrendingUp size={22} aria-hidden="true" className="mb-3 text-white/80" />
          <p className="text-3xl font-bold tabular-nums">{percentual}%</p>
          <p className="mt-1 text-sm text-white/80">da meta anual atingida</p>
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
      <CartaoKpi label="VGV realizado" valor={moeda(dados.realizadoCentavos)} icon={House} tom="marca" rodape={<p className="mt-3 text-sm text-ink-muted">Total da aba Comissões 2026.</p>} />
      <CartaoKpi label="Meta anual de VGV" valor={moeda(dados.metaCentavos)} icon={Target} tom="info" rodape={<p className="mt-3 text-sm text-ink-muted">Objetivo da empresa para {dados.ano}.</p>} />
      <CartaoKpi label={progresso.restanteCentavos > 0 ? "Falta para a meta" : "Meta alcançada"} valor={moeda(progresso.restanteCentavos)} icon={Flag} tom="sucesso" rodape={<p className="mt-3 text-sm text-ink-muted">{progresso.restanteCentavos > 0 ? "Volume de vendas necessário para atingir o objetivo." : "O VGV realizado atingiu o objetivo anual."}</p>} />
    </div>

    <aside className="rounded-xl border border-border bg-surface p-5 text-sm leading-6">
      <div className="flex flex-wrap items-center gap-3"><h2 className="font-semibold">Sobre estes números</h2><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">Planilha em atualização</span></div>
      <p className="mt-2 text-ink-muted">Base: planilha enviada, aba Comissões 2026. Os valores representam esse retrato e não são atualizados automaticamente.</p>
      <p className="mt-1 text-ink-muted">O total considera todas as vendas informadas na aba anual, inclusive as que ainda estão sem data preenchida.</p>
    </aside>
  </div>;
}
