import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { CartaoIndicador } from "@/components/cartao-indicador";
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, CalendarClock, Clock } from "lucide-react";
import { hojeISO } from "@/lib/data-br";

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dataBR(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

export default async function FinanceiroDashboardPage() {
  const supabase = await createClient();
  const hoje = hojeISO();
  const em7dias = new Date();
  em7dias.setDate(em7dias.getDate() + 7);
  const em7diasStr = em7dias.toISOString().slice(0, 10);
  const inicioMes = `${hoje.slice(0, 7)}-01`;

  const [{ data: contas }, { data: baixasMes }, { data: pendentes }] = await Promise.all([
    supabase.from("financeiro_contas_bancarias").select("saldo_inicial").eq("ativa", true),
    supabase
      .from("financeiro_baixas")
      .select("valor, data, financeiro_lancamentos ( tipo )")
      .gte("data", inicioMes),
    supabase
      .from("financeiro_lancamentos")
      .select("id, tipo, descricao, valor, vencimento, status, financeiro_pessoas ( nome )")
      .in("status", ["pendente", "pago_parcial"])
      .order("vencimento"),
  ]);

  // Saldo consolidado = soma dos saldos iniciais + todas as baixas já
  // registradas (não só as do mês).
  const { data: todasBaixas } = await supabase
    .from("financeiro_baixas")
    .select("valor, financeiro_lancamentos ( tipo )");

  const saldoInicialTotal = (contas ?? []).reduce((soma, c) => soma + Number(c.saldo_inicial), 0);
  const movimentoTotal = (todasBaixas ?? []).reduce((soma, b) => {
    const tipo = (b as unknown as { financeiro_lancamentos: { tipo: string } | null }).financeiro_lancamentos?.tipo;
    return soma + (tipo === "receita" ? Number(b.valor) : -Number(b.valor));
  }, 0);
  const saldoConsolidado = saldoInicialTotal + movimentoTotal;

  const recebidoNoMes = (baixasMes ?? [])
    .filter((b) => (b as unknown as { financeiro_lancamentos: { tipo: string } | null }).financeiro_lancamentos?.tipo === "receita")
    .reduce((s, b) => s + Number(b.valor), 0);
  const pagoNoMes = (baixasMes ?? [])
    .filter((b) => (b as unknown as { financeiro_lancamentos: { tipo: string } | null }).financeiro_lancamentos?.tipo === "despesa")
    .reduce((s, b) => s + Number(b.valor), 0);

  const listaPendentes = pendentes ?? [];
  const aPagar = listaPendentes.filter((l) => l.tipo === "despesa");
  const aReceber = listaPendentes.filter((l) => l.tipo === "receita");
  const vencidos = listaPendentes.filter((l) => l.vencimento < hoje);
  const proximosVencimentos = listaPendentes.filter((l) => l.vencimento >= hoje && l.vencimento <= em7diasStr);

  const totalAPagar = aPagar.reduce((s, l) => s + Number(l.valor), 0);
  const totalAReceber = aReceber.reduce((s, l) => s + Number(l.valor), 0);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Financeiro</h1>
        <p className="mt-1 text-sm text-ink-muted">Visão geral — Sacra Netimóveis e Sacra Cred.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CartaoIndicador
          icon={Wallet}
          valor={brl(saldoConsolidado)}
          label="Saldo bancário consolidado"
          href="/financeiro/contas-bancarias"
        />
        <CartaoIndicador icon={TrendingUp} valor={brl(recebidoNoMes)} label="Recebido no mês" tom="sucesso" />
        <CartaoIndicador icon={TrendingDown} valor={brl(pagoNoMes)} label="Pago no mês" tom="perigo" />
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
          <CabecalhoSecao icon={AlertTriangle} titulo="Vencidos" descricao="Ainda não liquidados, com vencimento no passado." />
          {vencidos.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum lançamento vencido. ✅</p>
          ) : (
            <ul className="space-y-2">
              {vencidos.slice(0, 8).map((l) => {
                const pessoa = (l as unknown as { financeiro_pessoas: { nome: string } | null }).financeiro_pessoas;
                return (
                  <li key={l.id} className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm">
                    <p className="font-medium text-ink">
                      {l.tipo === "despesa" ? "Pagar" : "Receber"}: {l.descricao}
                    </p>
                    <p className="text-xs text-rose-700">
                      {pessoa?.nome ?? "—"} · venceu em {dataBR(l.vencimento)} · {brl(l.valor)}
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
          />
          {proximosVencimentos.length === 0 ? (
            <p className="text-sm text-ink-muted">Nada vencendo nos próximos 7 dias.</p>
          ) : (
            <ul className="space-y-2">
              {proximosVencimentos.slice(0, 8).map((l) => {
                const pessoa = (l as unknown as { financeiro_pessoas: { nome: string } | null }).financeiro_pessoas;
                return (
                  <li key={l.id} className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm">
                    <p className="font-medium text-ink">
                      {l.tipo === "despesa" ? "Pagar" : "Receber"}: {l.descricao}
                    </p>
                    <p className="text-xs text-amber-700">
                      {pessoa?.nome ?? "—"} · vence em {dataBR(l.vencimento)} · {brl(l.valor)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-ink-muted">
        <Link href="/financeiro/contas-a-pagar" className="text-brand hover:underline">
          Contas a Pagar
        </Link>
        <Link href="/financeiro/contas-a-receber" className="text-brand hover:underline">
          Contas a Receber
        </Link>
        <Link href="/financeiro/contas-bancarias" className="text-brand hover:underline">
          Contas Bancárias
        </Link>
        <Link href="/financeiro/pessoas" className="text-brand hover:underline">
          Clientes e Fornecedores
        </Link>
        <Link href="/financeiro/categorias" className="text-brand hover:underline">
          Categorias e Centros de Resultado
        </Link>
      </div>
    </div>
  );
}
