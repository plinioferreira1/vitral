import { createClient } from "@/lib/supabase/server";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { Landmark, ArrowUp, ArrowDown } from "lucide-react";
import { LogoBanco } from "@/components/financeiro/logo-banco";
import { criarContaBancaria, arquivarContaBancaria } from "./actions";

const campoClasse =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";
const TIPO_LABEL: Record<string, string> = {
  corrente: "Conta corrente",
  poupanca: "Conta poupança",
  investimento: "Investimento",
  cartao_credito: "Cartão de crédito",
};

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ContasBancariasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const supabase = await createClient();
  const { data: contas } = await supabase
    .from("financeiro_contas_bancarias")
    .select("id, nome, banco, agencia, numero_conta, tipo, saldo_inicial, ativa")
    .order("ativa", { ascending: false })
    .order("nome");

  // Saldo atual = saldo inicial + baixas de receita - baixas de despesa
  // registradas nessa conta. A variação compara com o saldo de 30 dias atrás,
  // calculado da mesma forma até aquela data (dado real, não estimado).
  const { data: baixas } = await supabase
    .from("financeiro_baixas")
    .select("conta_bancaria_id, valor, data, financeiro_lancamentos ( tipo )");

  const ha30dias = new Date();
  ha30dias.setDate(ha30dias.getDate() - 30);
  const ha30diasISO = ha30dias.toISOString().slice(0, 10);

  const movimentoPorConta = new Map<string, number>();
  const movimentoPorContaHa30Dias = new Map<string, number>();
  (baixas ?? []).forEach((b) => {
    const tipo = (b as unknown as { financeiro_lancamentos: { tipo: string } | null }).financeiro_lancamentos
      ?.tipo;
    if (!b.conta_bancaria_id) return;
    const delta = tipo === "receita" ? Number(b.valor) : -Number(b.valor);
    movimentoPorConta.set(b.conta_bancaria_id, (movimentoPorConta.get(b.conta_bancaria_id) ?? 0) + delta);
    if (b.data <= ha30diasISO) {
      movimentoPorContaHa30Dias.set(b.conta_bancaria_id, (movimentoPorContaHa30Dias.get(b.conta_bancaria_id) ?? 0) + delta);
    }
  });

  let listaContas = contas ?? [];
  if (status) listaContas = listaContas.filter((c) => (status === "ativa" ? c.ativa : !c.ativa));
  if (q) {
    const termo = q.toLowerCase();
    listaContas = listaContas.filter((c) =>
      `${c.nome} ${c.banco ?? ""} ${c.numero_conta ?? ""}`.toLowerCase().includes(termo)
    );
  }

  return (
    <div className="financeiro-ui mx-auto max-w-[1480px] space-y-5">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Contas bancárias</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Saldo calculado a partir do saldo inicial + pagamentos e recebimentos registrados.
        </p>
      </div>

      <form
        action={criarContaBancaria}
        className="space-y-3 rounded-xl border border-border/60 bg-surface p-5 shadow-sm"
      >
        <CabecalhoSecao icon={Landmark} titulo="Nova conta bancária" descricao="Cadastre uma nova conta pra controlar seus lançamentos financeiros." />
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="nome" required placeholder="Nome (ex: Sacra Netimóveis - Itaú)" className={campoClasse} />
          <input name="banco" placeholder="Banco" className={campoClasse} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <input name="agencia" placeholder="Agência" className={campoClasse} />
          <input name="numero_conta" placeholder="Número da conta" className={campoClasse} />
          <select name="tipo" defaultValue="corrente" className={campoClasse}>
            <option value="corrente">Conta corrente</option>
            <option value="poupanca">Poupança</option>
            <option value="investimento">Investimento</option>
            <option value="cartao_credito">Cartão de crédito</option>
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <input name="titular" placeholder="Titular" className={campoClasse} />
          <input name="saldo_inicial" type="number" step="0.01" placeholder="Saldo inicial (R$) — cartão: negativo" className={campoClasse} />
          <input name="data_abertura" type="date" className={campoClasse} />
        </div>
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Adicionar
        </button>
      </form>

      <div className="rounded-xl border border-border/60 bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <CabecalhoSecao icon={Landmark} titulo="Contas cadastradas" descricao="Visualize e gerencie suas contas bancárias." />
          <div className="flex flex-wrap items-center gap-2">
            <form method="get" className="flex items-center gap-2">
              <input name="q" defaultValue={q ?? ""} placeholder="Buscar conta, banco ou titular..." className={`${campoClasse} w-56`} />
              <select name="status" defaultValue={status ?? ""} className={campoClasse}>
                <option value="">Todos os status</option>
                <option value="ativa">Ativas</option>
                <option value="arquivada">Arquivadas</option>
              </select>
              <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm text-ink-muted hover:bg-background">
                Filtrar
              </button>
            </form>
            <span
              title="Importação de extratos OFX ainda não foi implementada"
              className="cursor-not-allowed whitespace-nowrap rounded-md border border-border/60 px-3 py-2 text-sm text-ink-muted opacity-60"
            >
              Importar OFX (em breve)
            </span>
          </div>
        </div>

        {listaContas.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">Nenhuma conta bancária encontrada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
                <th className="px-4 py-2.5 font-medium">Banco / Conta</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 font-medium">Saldo atual</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listaContas.map((c) => {
                const saldoAtual = Number(c.saldo_inicial) + (movimentoPorConta.get(c.id) ?? 0);
                const saldoHa30Dias = Number(c.saldo_inicial) + (movimentoPorContaHa30Dias.get(c.id) ?? 0);
                const variacao = saldoHa30Dias !== 0 ? ((saldoAtual - saldoHa30Dias) / Math.abs(saldoHa30Dias)) * 100 : null;
                return (
                  <tr key={c.id} className={c.ativa ? "" : "opacity-60"}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <LogoBanco banco={c.banco} />
                        <div>
                          <p className="text-sm font-medium text-ink">{c.nome}</p>
                          <p className="text-xs text-ink-muted">
                            {[c.banco, c.agencia && `Ag. ${c.agencia}`, c.numero_conta].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">{TIPO_LABEL[c.tipo ?? "corrente"] ?? c.tipo}</td>
                    <td className="px-4 py-2.5">
                      <p className={`num font-semibold ${saldoAtual < 0 ? "text-rose-600" : "text-ink"}`}>{brl(saldoAtual)}</p>
                      {variacao !== null && Math.abs(variacao) > 0.05 && (
                        <p className={`flex items-center gap-1 text-xs ${variacao >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {variacao >= 0 ? <ArrowUp size={11} strokeWidth={2.5} /> : <ArrowDown size={11} strokeWidth={2.5} />}
                          {Math.abs(variacao).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% em 30 dias
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                          c.ativa ? "text-emerald-700" : "text-stone-500"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${c.ativa ? "bg-emerald-500" : "bg-stone-400"}`} />
                        {c.ativa ? "Ativa" : "Arquivada"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {c.ativa && (
                        <form action={arquivarContaBancaria}>
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className="text-xs text-ink-muted hover:text-rose-600">
                            arquivar
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
