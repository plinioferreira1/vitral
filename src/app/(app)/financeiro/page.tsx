import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { baixasParaMovimento, movimentoPorConta as calcularMovimento } from "@/lib/saldos";
import { GraficoFluxoCaixa } from "@/components/grafico-fluxo-caixa";
import { LogoBanco } from "@/components/financeiro/logo-banco";
import {
  AlertTriangle,
  CalendarClock,
  Landmark,
  Layers,
  LineChart,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { hojeISO } from "@/lib/data-br";

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dataBR(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}
function diaMes(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}


export default async function FinanceiroDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const hojeAtual = hojeISO();
  const mesAtual = hojeAtual.slice(0, 7);
  const mesSelecionado = mesParam && /^20\d{2}-(0[1-9]|1[0-2])$/.test(mesParam) ? mesParam : mesAtual;
  const [anoMes, numeroMes] = mesSelecionado.split("-").map(Number);
  const inicioMes = `${mesSelecionado}-01`;
  const fimMes = new Date(Date.UTC(anoMes, numeroMes, 0)).toISOString().slice(0, 10);
  const mudarMes = (delta: number) => {
    const destino = new Date(Date.UTC(anoMes, numeroMes - 1 + delta, 1)).toISOString().slice(0, 7);
    return destino === mesAtual ? "/financeiro" : `/financeiro?mes=${destino}`;
  };
  const rotuloMes = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(anoMes, numeroMes - 1, 1)))
    .replace(/^./, primeira => primeira.toUpperCase()).replace(" de ", "/");
  const supabase = await createClient();
  const hoje = hojeISO();
  const em7dias = new Date();
  em7dias.setDate(em7dias.getDate() + 7);
  const em7diasStr = em7dias.toISOString().slice(0, 10);
  const em30dias = new Date();
  em30dias.setDate(em30dias.getDate() + 30);
  const em30diasStr = em30dias.toISOString().slice(0, 10);

  const [{ data: contas }, { data: baixasPeriodo }, { data: pendentes }, { data: todasBaixas }, { data: transferencias }, { data: titulosMes }] = await Promise.all([
    supabase
      .from("financeiro_contas_bancarias")
      .select("id, nome, banco, tipo, saldo_inicial, ativa")
      .eq("ativa", true),
    supabase
      .from("financeiro_baixas")
      .select("valor, data, financeiro_lancamentos ( tipo )")
      .gte("data", inicioMes)
      .lte("data", fimMes),
    supabase
      .from("financeiro_lancamentos")
      .select("id, tipo, descricao, valor, vencimento, status, financeiro_pessoas ( nome )")
      .in("status", ["pendente", "pago_parcial"])
      .order("vencimento"),
    supabase.from("financeiro_baixas").select("conta_bancaria_id, valor, financeiro_lancamentos ( tipo )"),
    supabase.from("financeiro_transferencias").select("conta_origem_id, conta_destino_id, valor, data"),
    supabase.from("financeiro_lancamentos").select("tipo, valor, vencimento, status")
      .gte("vencimento", inicioMes).lte("vencimento", fimMes).neq("status", "cancelado"),
  ]);

  type ContaResumo = { id: string; nome: string; banco: string | null; tipo: string | null; saldo_inicial: number };
  type BaixaComTipo = { valor: number; financeiro_lancamentos: { tipo: string } | null };

  const saldoInicialTotal = (contas ?? []).reduce((soma, c) => soma + Number(c.saldo_inicial), 0);
  const movimentoTotal = ((todasBaixas ?? []) as unknown as BaixaComTipo[]).reduce((soma, b) => {
    const tipo = b.financeiro_lancamentos?.tipo;
    return soma + (tipo === "receita" ? Number(b.valor) : -Number(b.valor));
  }, 0);
  const saldoConsolidado = saldoInicialTotal + movimentoTotal;

  // Baixas + transferências entre contas (src/lib/saldos.ts).
  const movimentoPorConta = calcularMovimento(baixasParaMovimento(todasBaixas), transferencias ?? []);

  const contasAtivas = (contas ?? []) as unknown as ContaResumo[];
  const contasInvestimento = contasAtivas.filter((c) => c.tipo === "investimento");
  const contasOperacionais = contasAtivas.filter((c) => c.tipo !== "investimento");
  const saldoInvestimentos = contasInvestimento.reduce(
    (soma, c) => soma + Number(c.saldo_inicial) + (movimentoPorConta.get(c.id) ?? 0),
    0
  );
  const investimentoSemSaldo = contasInvestimento.every((c) => Number(c.saldo_inicial) === 0 && !movimentoPorConta.has(c.id));
  const saldosContas = [
    ...(contasInvestimento.length > 0
      ? [
          {
            id: "investimentos",
            nome: "Investimentos",
            banco: null,
            saldo: saldoInvestimentos,
            saldoNaoInformado: investimentoSemSaldo,
            investimentos: true,
          },
        ]
      : []),
    ...contasOperacionais.map((c) => ({
      id: c.id,
      nome: c.nome,
      banco: c.banco,
      saldo: Number(c.saldo_inicial) + (movimentoPorConta.get(c.id) ?? 0),
      saldoNaoInformado: Number(c.saldo_inicial) === 0 && !movimentoPorConta.has(c.id),
      investimentos: false,
    })),
  ];

  const recebidoNoPeriodo = ((baixasPeriodo ?? []) as unknown as BaixaComTipo[])
    .filter((b) => b.financeiro_lancamentos?.tipo === "receita")
    .reduce((s, b) => s + Number(b.valor), 0);
  const pagoNoPeriodo = ((baixasPeriodo ?? []) as unknown as BaixaComTipo[])
    .filter((b) => b.financeiro_lancamentos?.tipo === "despesa")
    .reduce((s, b) => s + Number(b.valor), 0);

  const listaPendentes = pendentes ?? [];
  const aPagar = listaPendentes.filter((l) => l.tipo === "despesa");
  const aReceber = listaPendentes.filter((l) => l.tipo === "receita");
  const vencidos = listaPendentes.filter((l) => l.vencimento < hoje);
  const proximosVencimentos = listaPendentes.filter((l) => l.vencimento >= hoje && l.vencimento <= em7diasStr);

  const pagarNoMes = aPagar.filter(l => l.vencimento >= inicioMes && l.vencimento <= fimMes);
  const receberNoMes = aReceber.filter(l => l.vencimento >= inicioMes && l.vencimento <= fimMes);
  const totalAPagar = pagarNoMes.reduce((s, l) => s + Number(l.valor), 0);
  const totalAReceber = receberNoMes.reduce((s, l) => s + Number(l.valor), 0);
  const totalDespesasMes = (titulosMes ?? []).filter(l => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0);
  const totalReceitasMes = (titulosMes ?? []).filter(l => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0);

  // Fluxo de caixa projetado (próximos 30 dias), a partir dos
  // lançamentos pendentes agrupados por dia de vencimento.
  const proximos30 = listaPendentes.filter((l) => l.vencimento >= hoje && l.vencimento <= em30diasStr);
  const diasMap = new Map<string, { entradas: number; saidas: number }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    diasMap.set(d.toISOString().slice(0, 10), { entradas: 0, saidas: 0 });
  }
  proximos30.forEach((l) => {
    const bucket = diasMap.get(l.vencimento);
    if (!bucket) return;
    if (l.tipo === "receita") bucket.entradas += Number(l.valor);
    else bucket.saidas += Number(l.valor);
  });
  const diasChart = Array.from(diasMap.entries()).map(([iso, v]) => ({
    rotulo: diaMes(iso),
    entradas: v.entradas,
    saidas: v.saidas,
  }));
  const totalEntradas30 = diasChart.reduce((s, d) => s + d.entradas, 0);
  const totalSaidas30 = diasChart.reduce((s, d) => s + d.saidas, 0);
  const saldoPrevisto = saldoConsolidado + totalEntradas30 - totalSaidas30;

  return (
    <div className="financeiro-ui mx-auto w-full min-w-0 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <CabecalhoPagina titulo="Financeiro" descricao="Despesas, receitas e compromissos do mês, com uma visão rápida do que precisa de atenção." />
        <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1" aria-label="Selecionar mês financeiro">
          <Link href={mudarMes(-1)} aria-label="Mês anterior" className="rounded-lg p-2 text-ink-muted hover:bg-background"><ChevronLeft size={16} /></Link>
          <span className="min-w-[134px] text-center text-sm font-semibold text-ink">{rotuloMes}</span>
          <Link href={mudarMes(1)} aria-label="Próximo mês" className="rounded-lg p-2 text-ink-muted hover:bg-background"><ChevronRight size={16} /></Link>
          {mesSelecionado !== mesAtual && <Link href="/financeiro" className="rounded-lg px-2 py-1.5 text-xs font-medium text-brand hover:bg-background">Mês atual</Link>}
        </div>
      </div>

      <section aria-label="Ações rápidas do Financeiro" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/financeiro/lancamentos/novo?tipo=despesa", titulo: "Nova despesa", descricao: "Registrar conta a pagar" },
          { href: "/financeiro/lancamentos/novo?tipo=receita", titulo: "Nova receita", descricao: "Registrar conta a receber" },
          { href: "/financeiro/lancamentos?referencia=hoje", titulo: "Vencimentos de hoje", descricao: "Conferir lançamentos" },
          { href: "/financeiro/contas-e-cartoes", titulo: "Contas e cartões", descricao: "Bancos, cartões e conciliação" },
        ].map(acao => (
          <Link href={acao.href} key={acao.href}
            className="rounded-xl border border-border bg-surface px-4 py-3 shadow-sm transition hover:border-brand/50 hover:bg-background">
            <span className="block text-sm font-semibold text-ink">{acao.titulo}</span>
            <span className="mt-1 block text-xs text-ink-muted">{acao.descricao}</span>
          </Link>
        ))}
      </section>

      <section aria-label={"Indicadores de " + rotuloMes} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: "Despesas do mês", value: brl(totalDespesasMes), detail: `${brl(totalAPagar)} em aberto no período`, href: `/financeiro/lancamentos?tipo=despesa&referencia=mes&mes=${mesSelecionado}` },
          { label: "Receitas do mês", value: brl(totalReceitasMes), detail: `${brl(totalAReceber)} em aberto no período`, href: `/financeiro/lancamentos?tipo=receita&referencia=mes&mes=${mesSelecionado}` },
          { label: "Pago no mês", value: brl(pagoNoPeriodo), detail: "Pagamentos realizados no período", href: `/financeiro/lancamentos?tipo=despesa&referencia=mes&mes=${mesSelecionado}` },
          { label: "Recebido no mês", value: brl(recebidoNoPeriodo), detail: "Recebimentos realizados no período", href: `/financeiro/lancamentos?tipo=receita&referencia=mes&mes=${mesSelecionado}` },
          { label: "Saldo bancário atual", value: brl(saldoConsolidado), detail: "Saldo consolidado de todas as contas", href: "/financeiro/contas-e-cartoes" },
          { label: "Vencidos até hoje", value: String(vencidos.length), detail: "Pendências de todos os meses", href: "/financeiro/lancamentos?referencia=todos&status=vencido", alert: vencidos.length > 0 },
        ].map(card => (
          <Link key={card.label} href={card.href}
            className="group flex min-h-[112px] flex-col justify-between rounded-xl border border-border bg-surface px-4 py-3.5 transition hover:border-brand/40 hover:bg-background">
            <span className="text-xs font-medium text-ink-muted">{card.label}</span>
            <div className="mt-2 min-w-0">
              <p className={`num break-words text-xl font-semibold tracking-tight sm:text-2xl ${card.alert ? "text-rose-700" : "text-ink"}`}>{card.value}</p>
              <p className="mt-1 text-xs text-ink-muted">{card.detail}</p>
            </div>
          </Link>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
          <CabecalhoSecao
            icon={AlertTriangle}
            titulo="Vencidos"
            descricao="Ainda não liquidados, com vencimento no passado."
            acao={
              <div className="flex gap-2 text-xs font-medium">
                <Link href="/financeiro/contas-a-pagar?status=vencido#lista" className="text-brand hover:underline">
                  A pagar
                </Link>
                <span className="text-ink-muted">·</span>
                <Link href="/financeiro/contas-a-receber?status=vencido#lista" className="text-brand hover:underline">
                  A receber
                </Link>
              </div>
            }
          />
          {vencidos.length === 0 ? (
            <p className="rounded-lg bg-background px-4 py-6 text-center text-sm text-ink-muted">Nenhum lançamento vencido.</p>
          ) : (
            <ul className="divide-y divide-border">
              {vencidos.slice(0, 6).map((l) => {
                const pessoa = (l as unknown as { financeiro_pessoas: { nome: string } | null }).financeiro_pessoas;
                return (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{l.descricao}</p>
                      <p className="text-xs text-ink-muted">{pessoa?.nome ?? "Sem pessoa vinculada"} · {dataBR(l.vencimento)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${l.tipo === "despesa" ? "text-rose-700" : "text-emerald-700"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${l.tipo === "despesa" ? "bg-rose-600" : "bg-emerald-600"}`} />
                        {l.tipo === "despesa" ? "A pagar" : "A receber"}
                      </span>
                      <p className="num font-semibold text-rose-700">{brl(l.valor)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
          <CabecalhoSecao
            icon={CalendarClock}
            titulo="Próximos vencimentos"
            descricao="Nos próximos 7 dias."
            acao={
              <div className="flex gap-2 text-xs font-medium">
                <Link href="/financeiro/contas-a-pagar?status=em_aberto#lista" className="text-brand hover:underline">
                  A pagar
                </Link>
                <span className="text-ink-muted">·</span>
                <Link href="/financeiro/contas-a-receber?status=em_aberto#lista" className="text-brand hover:underline">
                  A receber
                </Link>
              </div>
            }
          />
          {proximosVencimentos.length === 0 ? (
            <p className="rounded-lg bg-background px-4 py-6 text-center text-sm text-ink-muted">Nada vencendo nos próximos 7 dias.</p>
          ) : (
            <ul className="divide-y divide-border">
              {proximosVencimentos.slice(0, 6).map((l) => {
                const pessoa = (l as unknown as { financeiro_pessoas: { nome: string } | null }).financeiro_pessoas;
                return (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{l.descricao}</p>
                      <p className="text-xs text-ink-muted">{pessoa?.nome ?? "Sem pessoa vinculada"} · {dataBR(l.vencimento)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${l.tipo === "despesa" ? "text-rose-700" : "text-emerald-700"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${l.tipo === "despesa" ? "bg-rose-600" : "bg-emerald-600"}`} />
                        {l.tipo === "despesa" ? "A pagar" : "A receber"}
                      </span>
                      <p className="num font-semibold text-ink">{brl(l.valor)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
          <CabecalhoSecao icon={LineChart} titulo="Fluxo de caixa (próximos 30 dias)" descricao="Com base nos lançamentos pendentes." />
          <GraficoFluxoCaixa dias={diasChart} />
        </div>
        <div className="grid grid-rows-3 gap-3 financeiro-projecao">
          <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-sm">
            <p className="text-xs text-ink-muted">Saldo previsto (30 dias)</p>
            <p className={`num text-xl font-bold ${saldoPrevisto < 0 ? "text-rose-600" : "text-ink"}`}>{brl(saldoPrevisto)}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-sm">
            <p className="text-xs text-ink-muted">Total de entradas previstas</p>
            <p className="num text-xl font-bold text-emerald-700">{brl(totalEntradas30)}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-sm">
            <p className="text-xs text-ink-muted">Total de saídas previstas</p>
            <p className="num text-xl font-bold text-rose-700">{brl(totalSaidas30)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
        <CabecalhoSecao
          icon={Landmark}
          titulo="Saldos por conta bancária"
          acao={
            <Link href="/financeiro/contas-bancarias" className="text-xs font-medium text-brand hover:underline">
              Ver todas
            </Link>
          }
        />
        {contasAtivas.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhuma conta bancária cadastrada ainda.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {saldosContas.map((c) => {
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                  {c.investimentos ? (
                    <div className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-background text-brand">
                      <Layers size={16} strokeWidth={2.2} />
                    </div>
                  ) : (
                    <LogoBanco banco={c.banco} size="sm" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-ink-muted">{c.nome}</p>
                    {c.saldoNaoInformado ? (
                      <p className="text-sm font-semibold text-ink-muted">A confirmar</p>
                    ) : (
                      <p className={`num text-sm font-semibold ${c.saldo < 0 ? "text-rose-600" : "text-ink"}`}>{brl(c.saldo)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


    </div>
  );
}
