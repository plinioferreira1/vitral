import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { CartaoIndicador } from "@/components/cartao-indicador";
import { GraficoFluxoCaixa } from "@/components/grafico-fluxo-caixa";
import { identidadeBanco } from "@/lib/bancos";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CalendarClock,
  Clock,
  Landmark,
  LineChart,
  FileText,
  Users,
  ListTree,
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

const PERIODOS = { "7": "Últimos 7 dias", "30": "Últimos 30 dias", "90": "Últimos 90 dias" } as const;

export default async function FinanceiroDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo: periodoParam } = await searchParams;
  const periodoDias = periodoParam && periodoParam in PERIODOS ? periodoParam : "30";
  const supabase = await createClient();
  const hoje = hojeISO();
  const em7dias = new Date();
  em7dias.setDate(em7dias.getDate() + 7);
  const em7diasStr = em7dias.toISOString().slice(0, 10);
  const em30dias = new Date();
  em30dias.setDate(em30dias.getDate() + 30);
  const em30diasStr = em30dias.toISOString().slice(0, 10);
  const inicioPeriodo = new Date();
  inicioPeriodo.setDate(inicioPeriodo.getDate() - Number(periodoDias));
  const inicioPeriodoStr = inicioPeriodo.toISOString().slice(0, 10);

  const [{ data: contas }, { data: baixasPeriodo }, { data: pendentes }, { data: todasBaixas }] = await Promise.all([
    supabase
      .from("financeiro_contas_bancarias")
      .select("id, nome, banco, saldo_inicial, ativa")
      .eq("ativa", true),
    supabase
      .from("financeiro_baixas")
      .select("valor, data, financeiro_lancamentos ( tipo )")
      .gte("data", inicioPeriodoStr),
    supabase
      .from("financeiro_lancamentos")
      .select("id, tipo, descricao, valor, vencimento, status, financeiro_pessoas ( nome )")
      .in("status", ["pendente", "pago_parcial"])
      .order("vencimento"),
    supabase.from("financeiro_baixas").select("conta_bancaria_id, valor, financeiro_lancamentos ( tipo )"),
  ]);

  type BaixaComTipo = { valor: number; financeiro_lancamentos: { tipo: string } | null };

  const saldoInicialTotal = (contas ?? []).reduce((soma, c) => soma + Number(c.saldo_inicial), 0);
  const movimentoTotal = ((todasBaixas ?? []) as unknown as BaixaComTipo[]).reduce((soma, b) => {
    const tipo = b.financeiro_lancamentos?.tipo;
    return soma + (tipo === "receita" ? Number(b.valor) : -Number(b.valor));
  }, 0);
  const saldoConsolidado = saldoInicialTotal + movimentoTotal;

  const movimentoPorConta = new Map<string, number>();
  ((todasBaixas ?? []) as unknown as (BaixaComTipo & { conta_bancaria_id: string | null })[]).forEach((b) => {
    if (!b.conta_bancaria_id) return;
    const tipo = b.financeiro_lancamentos?.tipo;
    const delta = tipo === "receita" ? Number(b.valor) : -Number(b.valor);
    movimentoPorConta.set(b.conta_bancaria_id, (movimentoPorConta.get(b.conta_bancaria_id) ?? 0) + delta);
  });

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

  const totalAPagar = aPagar.reduce((s, l) => s + Number(l.valor), 0);
  const totalAReceber = aReceber.reduce((s, l) => s + Number(l.valor), 0);

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
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Financeiro</h1>
          <p className="mt-1 text-sm text-ink-muted">Visão geral — Sacra Netimóveis e Sacra Cred.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border/60 bg-surface p-1 text-sm">
          {Object.entries(PERIODOS).map(([valor, label]) => (
            <Link
              key={valor}
              href={valor === "30" ? "/financeiro" : `/financeiro?periodo=${valor}`}
              className={`rounded-md px-3 py-1.5 transition ${
                periodoDias === valor ? "bg-brand text-white" : "text-ink-muted hover:bg-background"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CartaoIndicador
          icon={Wallet}
          valor={brl(saldoConsolidado)}
          label="Saldo bancário consolidado"
          href="/financeiro/contas-bancarias"
        />
        <CartaoIndicador icon={TrendingUp} valor={brl(recebidoNoPeriodo)} label={`Recebido — ${PERIODOS[periodoDias as keyof typeof PERIODOS].toLowerCase()}`} tom="sucesso" />
        <CartaoIndicador icon={TrendingDown} valor={brl(pagoNoPeriodo)} label={`Pago — ${PERIODOS[periodoDias as keyof typeof PERIODOS].toLowerCase()}`} tom="perigo" />
        <CartaoIndicador
          icon={Clock}
          valor={brl(totalAPagar)}
          label={`Contas a pagar (${aPagar.length})`}
          href="/financeiro/contas-a-pagar"
        />
        <CartaoIndicador
          icon={Clock}
          valor={brl(totalAReceber)}
          label={`Contas a receber (${aReceber.length})`}
          href="/financeiro/contas-a-receber"
        />
        <CartaoIndicador
          icon={AlertTriangle}
          valor={vencidos.length}
          label="Lançamentos vencidos"
          tom={vencidos.length > 0 ? "perigo" : "neutro"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
          <CabecalhoSecao
            icon={AlertTriangle}
            titulo="Vencidos"
            descricao="Ainda não liquidados, com vencimento no passado."
            acao={
              <Link href="/financeiro/agenda" className="text-xs font-medium text-brand hover:underline">
                Ver todos ({vencidos.length})
              </Link>
            }
          />
          {vencidos.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum lançamento vencido. ✅</p>
          ) : (
            <ul className="space-y-2">
              {vencidos.slice(0, 6).map((l) => {
                const pessoa = (l as unknown as { financeiro_pessoas: { nome: string } | null }).financeiro_pessoas;
                return (
                  <li key={l.id} className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-ink">
                        {l.tipo === "despesa" ? "Pagar" : "Receber"}: {l.descricao}
                      </p>
                      <p className="num font-semibold text-rose-700">{brl(l.valor)}</p>
                    </div>
                    <p className="text-xs text-rose-700">
                      {pessoa?.nome ?? "—"} · venceu em {dataBR(l.vencimento)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
          <CabecalhoSecao
            icon={CalendarClock}
            titulo="Próximos vencimentos"
            descricao="Nos próximos 7 dias."
            acao={
              <Link href="/financeiro/agenda" className="text-xs font-medium text-brand hover:underline">
                Ver todos ({proximosVencimentos.length})
              </Link>
            }
          />
          {proximosVencimentos.length === 0 ? (
            <p className="text-sm text-ink-muted">Nada vencendo nos próximos 7 dias.</p>
          ) : (
            <ul className="space-y-2">
              {proximosVencimentos.slice(0, 6).map((l) => {
                const pessoa = (l as unknown as { financeiro_pessoas: { nome: string } | null }).financeiro_pessoas;
                return (
                  <li key={l.id} className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-ink">
                        {l.tipo === "despesa" ? "Pagar" : "Receber"}: {l.descricao}
                      </p>
                      <p className="num font-semibold text-amber-700">{brl(l.valor)}</p>
                    </div>
                    <p className="text-xs text-amber-700">
                      {pessoa?.nome ?? "—"} · vence em {dataBR(l.vencimento)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
          <CabecalhoSecao icon={LineChart} titulo="Fluxo de caixa (próximos 30 dias)" descricao="Com base nos lançamentos pendentes." />
          <GraficoFluxoCaixa dias={diasChart} />
        </div>
        <div className="grid grid-rows-3 gap-3">
          <div className="rounded-xl border border-border/60 bg-surface p-4 shadow-sm">
            <p className="text-xs text-ink-muted">Saldo previsto (30 dias)</p>
            <p className={`num text-xl font-bold ${saldoPrevisto < 0 ? "text-rose-600" : "text-ink"}`}>{brl(saldoPrevisto)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-surface p-4 shadow-sm">
            <p className="text-xs text-ink-muted">Total de entradas previstas</p>
            <p className="num text-xl font-bold text-emerald-700">{brl(totalEntradas30)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-surface p-4 shadow-sm">
            <p className="text-xs text-ink-muted">Total de saídas previstas</p>
            <p className="num text-xl font-bold text-rose-700">{brl(totalSaidas30)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <CabecalhoSecao
          icon={Landmark}
          titulo="Saldos por conta bancária"
          acao={
            <Link href="/financeiro/contas-bancarias" className="text-xs font-medium text-brand hover:underline">
              Ver todas
            </Link>
          }
        />
        {(contas ?? []).length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhuma conta bancária cadastrada ainda.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(contas ?? []).map((c) => {
              const saldo = Number(c.saldo_inicial) + (movimentoPorConta.get(c.id) ?? 0);
              const id = identidadeBanco(c.banco);
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
                    style={{ backgroundColor: id.bg, color: id.fg }}
                  >
                    {id.sigla.length <= 3 ? id.sigla.toUpperCase() : id.sigla.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-ink-muted">{c.nome}</p>
                    <p className={`num text-sm font-semibold ${saldo < 0 ? "text-rose-600" : "text-ink"}`}>{brl(saldo)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-ink">Acessos rápidos</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Link href="/financeiro/contas-a-pagar" className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm hover:opacity-90">
            <FileText size={18} className="mb-2 text-rose-700" />
            <p className="font-medium text-ink">Contas a Pagar</p>
            <p className="text-xs text-ink-muted">Cadastrar e gerenciar títulos</p>
          </Link>
          <Link href="/financeiro/contas-a-receber" className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm hover:opacity-90">
            <TrendingUp size={18} className="mb-2 text-emerald-700" />
            <p className="font-medium text-ink">Contas a Receber</p>
            <p className="text-xs text-ink-muted">Acompanhar recebimentos</p>
          </Link>
          <Link href="/financeiro/contas-bancarias" className="rounded-xl border border-border/60 bg-background p-4 text-sm hover:opacity-90">
            <Landmark size={18} className="mb-2 text-ink-muted" />
            <p className="font-medium text-ink">Contas Bancárias</p>
            <p className="text-xs text-ink-muted">Saldos e extratos</p>
          </Link>
          <Link href="/financeiro/pessoas" className="rounded-xl border border-border/60 bg-background p-4 text-sm hover:opacity-90">
            <Users size={18} className="mb-2 text-ink-muted" />
            <p className="font-medium text-ink">Clientes e Fornecedores</p>
            <p className="text-xs text-ink-muted">Cadastros e relacionamento</p>
          </Link>
          <Link href="/financeiro/categorias" className="rounded-xl border border-border/60 bg-background p-4 text-sm hover:opacity-90">
            <ListTree size={18} className="mb-2 text-ink-muted" />
            <p className="font-medium text-ink">Categorias e Centros</p>
            <p className="text-xs text-ink-muted">Estruturar e organizar</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
