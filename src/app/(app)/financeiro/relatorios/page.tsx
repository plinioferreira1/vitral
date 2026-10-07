import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { INPUT_CLASS } from "@/components/ui/styles";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ImprimirRelatorio } from "@/components/financeiro/imprimir-relatorio";
import { TrendingUp, TrendingDown, Landmark, Clock, Tag, Download } from "lucide-react";
import { CartaoKpi } from "@/components/cartao-kpi";
import { GraficoFluxoCaixa } from "@/components/grafico-fluxo-caixa";
import { GraficoDonut } from "@/components/grafico-donut";
import { GraficoLinha } from "@/components/grafico-linha";
import { hojeISO } from "@/lib/data-br";
import { BotaoEnviar } from "@/components/botao-enviar";

const campoClasse =
  INPUT_CLASS;

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function nomeMes(iso: string): string {
  return new Date(`${iso}-01T00:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

type BaixaComLancamento = {
  valor: number;
  data: string;
  financeiro_lancamentos: {
    tipo: string;
    unidade_id: string | null;
    conta_bancaria_id: string | null;
    categoria_id: string | null;
    financeiro_categorias: { nome: string } | null;
  } | null;
};

type Filtros = { unidade?: string; conta?: string; categoria?: string };

function passaFiltro(b: BaixaComLancamento, f: Filtros): boolean {
  const l = b.financeiro_lancamentos;
  if (!l) return false;
  if (f.unidade && l.unidade_id !== f.unidade) return false;
  if (f.conta && l.conta_bancaria_id !== f.conta) return false;
  if (f.categoria && l.categoria_id !== f.categoria) return false;
  return true;
}

export default async function RelatoriosFinanceirosPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; inicio?: string; fim?: string; unidade?: string; conta?: string; categoria?: string }>;
}) {
  const sp = await searchParams;
  const aba = (["despesas", "fluxo", "comparativo"].includes(sp.aba ?? "") ? sp.aba : "recebimentos") as
    | "recebimentos"
    | "despesas"
    | "fluxo"
    | "comparativo";

  const hoje = hojeISO();
  const inicioPadrao = `${hoje.slice(0, 7)}-01`;
  const fimPadrao = new Date(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)), 0).toISOString().slice(0, 10);
  const inicio = sp.inicio || inicioPadrao;
  const fim = sp.fim || fimPadrao;
  const f: Filtros = { unidade: sp.unidade, conta: sp.conta, categoria: sp.categoria };

  const supabase = await createClient();
  const [{ data: unidades }, { data: contas }, { data: categorias }] = await Promise.all([
    supabase.from("financeiro_unidades").select("id, nome").order("nome"),
    supabase.from("financeiro_contas_bancarias").select("id, nome").eq("ativa", true).order("nome"),
    supabase.from("financeiro_categorias").select("id, nome, tipo").order("nome"),
  ]);

  const doze_meses_atras = new Date();
  doze_meses_atras.setMonth(doze_meses_atras.getMonth() - 11);
  doze_meses_atras.setDate(1);
  const inicioJanela = doze_meses_atras.toISOString().slice(0, 10);

  const [{ data: baixasPeriodoRaw }, { data: baixasJanelaRaw }, { data: abertosRaw }, { data: semCategoriaRaw }] =
    await Promise.all([
      supabase
        .from("financeiro_baixas")
        .select(
          "valor, data, financeiro_lancamentos ( tipo, unidade_id, conta_bancaria_id, categoria_id, financeiro_categorias ( nome ) )"
        )
        .gte("data", inicio)
        .lte("data", fim),
      supabase
        .from("financeiro_baixas")
        .select("valor, data, financeiro_lancamentos ( tipo, unidade_id, conta_bancaria_id, categoria_id, financeiro_categorias ( nome ) )")
        .gte("data", inicioJanela),
      supabase
        .from("financeiro_lancamentos")
        .select("id, tipo, valor, unidade_id, conta_bancaria_id, categoria_id")
        .in("status", ["pendente", "pago_parcial"]),
      supabase
        .from("financeiro_lancamentos")
        .select("id, valor, unidade_id, conta_bancaria_id")
        .eq("tipo", "receita")
        .in("status", ["pago", "pago_parcial"])
        .is("categoria_id", null),
    ]);

  const baixasPeriodo = ((baixasPeriodoRaw ?? []) as unknown as BaixaComLancamento[]).filter((b) => passaFiltro(b, f));
  const baixasJanela = ((baixasJanelaRaw ?? []) as unknown as BaixaComLancamento[]).filter((b) => passaFiltro(b, f));
  const abertos = (abertosRaw ?? []).filter(
    (l) => (!f.unidade || l.unidade_id === f.unidade) && (!f.conta || l.conta_bancaria_id === f.conta) && (!f.categoria || l.categoria_id === f.categoria)
  );
  const semCategoria = (semCategoriaRaw ?? []).filter(
    (l) => (!f.unidade || l.unidade_id === f.unidade) && (!f.conta || l.conta_bancaria_id === f.conta)
  );

  // KPIs — fixos, independentes da aba selecionada.
  const totalRecebido = baixasPeriodo.filter((b) => b.financeiro_lancamentos?.tipo === "receita").reduce((s, b) => s + Number(b.valor), 0);
  const totalPago = baixasPeriodo.filter((b) => b.financeiro_lancamentos?.tipo === "despesa").reduce((s, b) => s + Number(b.valor), 0);
  const saldoPeriodo = totalRecebido - totalPago;
  const valorAbertos = abertos.reduce((s, l) => s + Number(l.valor), 0);
  const valorSemCategoria = semCategoria.reduce((s, l) => s + Number(l.valor), 0);

  // Evolução mensal (janela de 12 meses, pra atender as abas Evolução/Comparativo).
  const meses: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    meses.push(d.toISOString().slice(0, 7));
  }
  function bucketMensal(qtdMeses: number) {
    const janela = meses.slice(12 - qtdMeses);
    return janela.map((m) => {
      const doMes = baixasJanela.filter((b) => b.data.slice(0, 7) === m);
      return {
        rotulo: nomeMes(m),
        entradas: doMes.filter((b) => b.financeiro_lancamentos?.tipo === "receita").reduce((s, b) => s + Number(b.valor), 0),
        saidas: doMes.filter((b) => b.financeiro_lancamentos?.tipo === "despesa").reduce((s, b) => s + Number(b.valor), 0),
      };
    });
  }
  const evolucao6Meses = bucketMensal(6);
  const evolucao12Meses = bucketMensal(12);

  // Categoria (despesas e recebimentos) dentro do período filtrado.
  function porCategoria(tipo: "receita" | "despesa") {
    const mapa = new Map<string, number>();
    baixasPeriodo
      .filter((b) => b.financeiro_lancamentos?.tipo === tipo)
      .forEach((b) => {
        const nome = b.financeiro_lancamentos?.financeiro_categorias?.nome ?? "Sem categoria";
        mapa.set(nome, (mapa.get(nome) ?? 0) + Number(b.valor));
      });
    return Array.from(mapa.entries()).map(([nome, valor]) => ({ nome, valor }));
  }
  const despesasPorCategoria = porCategoria("despesa");
  const recebimentosPorCategoria = porCategoria("receita");

  // Fluxo de caixa: saldo acumulado dia a dia dentro do período filtrado.
  const dias: string[] = [];
  for (let d = new Date(`${inicio}T00:00:00`); d <= new Date(`${fim}T00:00:00`); d.setDate(d.getDate() + 1)) {
    dias.push(d.toISOString().slice(0, 10));
  }
  let acumulado = 0;
  const pontosFluxo = dias.map((dia) => {
    const doDia = baixasPeriodo.filter((b) => b.data === dia);
    const entradas = doDia.filter((b) => b.financeiro_lancamentos?.tipo === "receita").reduce((s, b) => s + Number(b.valor), 0);
    const saidas = doDia.filter((b) => b.financeiro_lancamentos?.tipo === "despesa").reduce((s, b) => s + Number(b.valor), 0);
    acumulado += entradas - saidas;
    return { rotulo: new Date(`${dia}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), valor: acumulado };
  });

  const ABAS = [
    { chave: "recebimentos", label: "Recebimentos" },
    { chave: "despesas", label: "Despesas" },
    { chave: "fluxo", label: "Fluxo de caixa" },
    { chave: "comparativo", label: "Comparativo" },
  ] as const;

  function urlFiltro(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { aba, inicio, fim, unidade: f.unidade, conta: f.conta, categoria: f.categoria, ...overrides };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    return `/financeiro/relatorios?${params.toString()}`;
  }
  const urlCsv = (() => {
    const params = new URLSearchParams({ inicio, fim });
    if (aba === "recebimentos") params.set("tipo", "receita");
    if (aba === "despesas") params.set("tipo", "despesa");
    if (f.unidade) params.set("unidade", f.unidade);
    if (f.conta) params.set("conta", f.conta);
    if (f.categoria) params.set("categoria", f.categoria);
    return `/api/financeiro/relatorio-csv?${params.toString()}`;
  })();

  return (
    <div className="financeiro-ui mx-auto max-w-[1480px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <CabecalhoPagina titulo="Relatórios financeiros" descricao={<> Visualize e exporte os dados de recebimentos e despesas da sua imobiliária.
           </>} />
        <ImprimirRelatorio />
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/70 bg-surface p-4 shadow-sm">
        <input type="hidden" name="aba" value={aba} />
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">De</label>
          <input name="inicio" type="date" defaultValue={inicio} className={campoClasse} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Até</label>
          <input name="fim" type="date" defaultValue={fim} className={campoClasse} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Unidade</label>
          <select name="unidade" defaultValue={f.unidade ?? ""} className={campoClasse}>
            <option value="">Todas</option>
            {(unidades ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Conta bancária</label>
          <select name="conta" defaultValue={f.conta ?? ""} className={campoClasse}>
            <option value="">Todas</option>
            {(contas ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Categoria</label>
          <select name="categoria" defaultValue={f.categoria ?? ""} className={campoClasse}>
            <option value="">Todas</option>
            {(categorias ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <BotaoEnviar className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Aplicar
        </BotaoEnviar>
        <a
          href={urlCsv}
          className="ml-auto flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-background"
        >
          <Download size={15} strokeWidth={2} />
          Exportar CSV
        </a>
      </form>

      <div className="flex flex-wrap gap-2 border-b border-border">
        {ABAS.map((a) => (
          <Link
            key={a.chave}
            href={urlFiltro({ aba: a.chave })}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              aba === a.chave ? "border-brand text-brand" : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {a.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <CartaoKpi icon={TrendingUp} tom="sucesso" label="Total recebido no período" valor={brl(totalRecebido)} />
        <CartaoKpi icon={TrendingDown} tom="perigo" label="Total pago no período" valor={brl(totalPago)} />
        <CartaoKpi icon={Landmark} tom="marca" label="Saldo do período" valor={brl(saldoPeriodo)} />
        <CartaoKpi icon={Clock} tom="info" label={`Pendências (${abertos.length} títulos)`} valor={brl(valorAbertos)} />
        <CartaoKpi icon={Tag} tom="info" label={`Sem categoria (${semCategoria.length})`} valor={brl(valorSemCategoria)} />
      </div>

      <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
        {aba === "recebimentos" && (
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-sm font-semibold text-ink">Evolução de recebimentos x despesas (últimos 6 meses)</p>
              <GraficoFluxoCaixa dias={evolucao6Meses} />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <GraficoDonut titulo="Recebimentos por categoria (no período)" fatias={recebimentosPorCategoria} />
              <GraficoDonut titulo="Despesas por categoria (no período)" fatias={despesasPorCategoria} />
            </div>
          </div>
        )}
        {aba === "despesas" && (
          <div className="grid gap-6 sm:grid-cols-2">
            <GraficoDonut titulo="Despesas por categoria (no período)" fatias={despesasPorCategoria} maxFatias={8} />
            <div>
              <p className="mb-3 text-sm font-semibold text-ink">Maiores categorias de despesa</p>
              <ul className="space-y-1.5">
                {despesasPorCategoria
                  .sort((a, b) => b.valor - a.valor)
                  .slice(0, 8)
                  .map((c) => (
                    <li key={c.nome} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-1.5 text-sm">
                      <span className="text-ink">{c.nome}</span>
                      <span className="num text-ink-muted">{brl(c.valor)}</span>
                    </li>
                  ))}
                {despesasPorCategoria.length === 0 && <p className="text-sm text-ink-muted">Sem despesas no período.</p>}
              </ul>
            </div>
          </div>
        )}
        {aba === "fluxo" && (
          <div>
            <p className="mb-3 text-sm font-semibold text-ink">Saldo acumulado no período (recebido − pago, dia a dia)</p>
            <GraficoLinha pontos={pontosFluxo} />
          </div>
        )}
        {aba === "comparativo" && (
          <div>
            <p className="mb-3 text-sm font-semibold text-ink">Recebimentos x despesas — últimos 12 meses</p>
            <GraficoFluxoCaixa dias={evolucao12Meses} />
          </div>
        )}
      </div>
    </div>
  );
}
