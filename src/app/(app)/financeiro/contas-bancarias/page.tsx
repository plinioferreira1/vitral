import { createClient } from "@/lib/supabase/server";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { Landmark } from "lucide-react";
import { identidadeBanco } from "@/lib/bancos";
import { criarContaBancaria, arquivarContaBancaria } from "./actions";

const campoClasse =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ContasBancariasPage() {
  const supabase = await createClient();
  const { data: contas } = await supabase
    .from("financeiro_contas_bancarias")
    .select("id, nome, banco, agencia, numero_conta, tipo, saldo_inicial, ativa")
    .order("ativa", { ascending: false })
    .order("nome");

  // Saldo atual = saldo inicial + baixas de receita - baixas de despesa
  // registradas nessa conta.
  const { data: baixas } = await supabase
    .from("financeiro_baixas")
    .select("conta_bancaria_id, valor, financeiro_lancamentos ( tipo )");

  const movimentoPorConta = new Map<string, number>();
  (baixas ?? []).forEach((b) => {
    const tipo = (b as unknown as { financeiro_lancamentos: { tipo: string } | null }).financeiro_lancamentos
      ?.tipo;
    if (!b.conta_bancaria_id) return;
    const delta = tipo === "receita" ? Number(b.valor) : -Number(b.valor);
    movimentoPorConta.set(b.conta_bancaria_id, (movimentoPorConta.get(b.conta_bancaria_id) ?? 0) + delta);
  });

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Contas Bancárias</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Saldo calculado a partir do saldo inicial + pagamentos e recebimentos registrados.
          </p>
        </div>
        <span
          title="Importação de extratos OFX ainda não foi implementada"
          className="cursor-not-allowed rounded-md border border-border/60 px-3 py-2 text-sm text-ink-muted opacity-60"
        >
          Importar OFX (em breve)
        </span>
      </div>

      <form
        action={criarContaBancaria}
        className="space-y-3 rounded-xl border border-border/60 bg-surface p-5 shadow-sm"
      >
        <CabecalhoSecao icon={Landmark} titulo="Nova conta bancária" />
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
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <input name="titular" placeholder="Titular" className={campoClasse} />
          <input name="saldo_inicial" type="number" step="0.01" placeholder="Saldo inicial (R$)" className={campoClasse} />
          <input name="data_abertura" type="date" className={campoClasse} />
        </div>
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Adicionar
        </button>
      </form>

      <div className="space-y-3">
        {(contas ?? []).length === 0 ? (
          <p className="rounded-xl border border-border/60 bg-surface p-8 text-center text-sm text-ink-muted shadow-sm">
            Nenhuma conta bancária cadastrada ainda.
          </p>
        ) : (
          (contas ?? []).map((c) => {
            const saldoAtual = Number(c.saldo_inicial) + (movimentoPorConta.get(c.id) ?? 0);
            const id = identidadeBanco(c.banco);
            return (
              <div
                key={c.id}
                className={`flex items-center justify-between rounded-xl border border-border/60 bg-surface p-4 shadow-sm ${
                  c.ativa ? "" : "opacity-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
                    style={{ backgroundColor: id.bg, color: id.fg }}
                  >
                    {id.sigla.length <= 3 ? id.sigla.toUpperCase() : id.sigla.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {c.nome} {!c.ativa && <span className="text-xs text-ink-muted">(arquivada)</span>}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {[c.banco, c.agencia && `Ag. ${c.agencia}`, c.numero_conta].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className={`num text-lg font-semibold ${saldoAtual < 0 ? "text-rose-600" : "text-ink"}`}>
                    {brl(saldoAtual)}
                  </p>
                  {c.ativa && (
                    <form action={arquivarContaBancaria}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="text-xs text-ink-muted hover:text-rose-600">
                        arquivar
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
