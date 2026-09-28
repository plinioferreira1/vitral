import Link from "next/link";
import { ArrowDown, ArrowUp, Landmark, Layers, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { baixasParaMovimento, movimentoPorConta as calcularMovimento } from "@/lib/saldos";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { CampoMoeda } from "@/components/financeiro/campo-moeda";
import { LogoBanco } from "@/components/financeiro/logo-banco";
import { arquivarContaBancaria, criarContaBancaria, criarContasPadrao } from "./actions";

const campoClasse =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

const TIPO_LABEL: Record<string, string> = {
  corrente: "Conta corrente",
  poupanca: "Conta poupança",
  investimento: "Investimento",
  cartao_credito: "Cartão de crédito",
};

type ContaBancaria = {
  id: string;
  nome: string;
  banco: string | null;
  agencia: string | null;
  numero_conta: string | null;
  tipo: string | null;
  saldo_inicial: number;
  ativa: boolean;
};

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function variacaoAtual(saldoAtual: number, saldoHa30Dias: number) {
  return saldoHa30Dias !== 0 ? ((saldoAtual - saldoHa30Dias) / Math.abs(saldoHa30Dias)) * 100 : null;
}

function LinhaVariacao({ valor }: { valor: number | null }) {
  if (valor === null || Math.abs(valor) <= 0.05) return null;
  const subiu = valor >= 0;
  return (
    <p className={`flex items-center gap-1 text-xs ${subiu ? "text-emerald-600" : "text-rose-600"}`}>
      {subiu ? <ArrowUp size={11} strokeWidth={2.5} /> : <ArrowDown size={11} strokeWidth={2.5} />}
      {Math.abs(valor).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% em 30 dias
    </p>
  );
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

  const [{ data: baixas }, { data: transferencias }] = await Promise.all([
    supabase.from("financeiro_baixas").select("conta_bancaria_id, valor, data, financeiro_lancamentos ( tipo )"),
    supabase
      .from("financeiro_transferencias")
      .select("id, conta_origem_id, conta_destino_id, valor, data, descricao")
      .order("data", { ascending: false }),
  ]);

  const ha30dias = new Date();
  ha30dias.setDate(ha30dias.getDate() - 30);
  const ha30diasISO = ha30dias.toISOString().slice(0, 10);

  // Baixas + transferências entre contas (src/lib/saldos.ts).
  const movimentos = baixasParaMovimento(baixas);
  const movimentoPorConta = calcularMovimento(movimentos, transferencias ?? []);
  const movimentoPorContaHa30Dias = calcularMovimento(movimentos, transferencias ?? [], ha30diasISO);

  let listaContas = (contas ?? []) as ContaBancaria[];
  if (status) listaContas = listaContas.filter((c) => (status === "ativa" ? c.ativa : !c.ativa));
  if (q) {
    const termo = q.toLowerCase();
    listaContas = listaContas.filter((c) =>
      `${c.nome} ${c.banco ?? ""} ${c.numero_conta ?? ""} ${c.tipo === "investimento" ? "investimentos investimento" : ""}`
        .toLowerCase()
        .includes(termo)
    );
  }

  const contasInvestimento = listaContas.filter((c) => c.tipo === "investimento");
  const contasOperacionais = listaContas.filter((c) => c.tipo !== "investimento");
  const saldoInvestimentos = contasInvestimento.reduce(
    (soma, c) => soma + Number(c.saldo_inicial) + (movimentoPorConta.get(c.id) ?? 0),
    0
  );
  const saldoInvestimentosHa30Dias = contasInvestimento.reduce(
    (soma, c) => soma + Number(c.saldo_inicial) + (movimentoPorContaHa30Dias.get(c.id) ?? 0),
    0
  );
  const variacaoInvestimentos = variacaoAtual(saldoInvestimentos, saldoInvestimentosHa30Dias);
  const temCaixa = (contas ?? []).some((c) => `${c.nome} ${c.banco ?? ""}`.toLowerCase().includes("caixa"));
  const temBancoDoBrasil = (contas ?? []).some((c) => {
    const texto = `${c.nome} ${c.banco ?? ""}`.toLowerCase();
    return texto.includes("banco do brasil") || /\bbb\b/.test(texto);
  });

  return (
    <div className="financeiro-ui mx-auto max-w-[1480px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Contas bancárias</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Saldo calculado a partir do saldo inicial + pagamentos, recebimentos e transferências entre contas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/financeiro/transferencias"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Transferir entre contas
        </Link>
        {(!temCaixa || !temBancoDoBrasil) && (
          <form action={criarContasPadrao}>
            <button type="submit" className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-background">
              Criar Caixa e Banco do Brasil
            </button>
          </form>
        )}
        </div>
      </div>

      <form action={criarContaBancaria} className="space-y-3 rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <CabecalhoSecao
          icon={Landmark}
          titulo="Nova conta bancária"
          descricao="Cadastre uma conta para controlar lançamentos, baixas e saldos."
        />
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
          <CampoMoeda name="saldo_inicial" className={campoClasse} placeholder="0,00" />
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
          <div className="overflow-x-auto">
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
                {contasInvestimento.length > 0 && (
                  <tr>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-brand shadow-sm">
                          <Layers size={18} strokeWidth={2.2} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ink">Investimentos</p>
                          <p className="text-xs text-ink-muted">{contasInvestimento.length} contas consolidadas</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">Investimento</td>
                    <td className="px-4 py-2.5">
                      <p className={`num font-semibold ${saldoInvestimentos < 0 ? "text-rose-600" : "text-ink"}`}>
                        {brl(saldoInvestimentos)}
                      </p>
                      <LinhaVariacao valor={variacaoInvestimentos} />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Consolidado
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <details className="relative">
                        <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium text-ink-muted hover:bg-background hover:text-ink">
                          Contas
                        </summary>
                        <div className="absolute right-0 z-30 mt-1 w-72 rounded-xl border border-border bg-surface p-2 text-left shadow-lg">
                          {contasInvestimento.map((conta) => (
                            <Link
                              key={conta.id}
                              href={`/financeiro/contas-bancarias/${conta.id}/editar`}
                              className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-xs text-ink-muted hover:bg-background hover:text-brand"
                            >
                              <span className="min-w-0 truncate">{conta.nome}</span>
                              <span className="num shrink-0 font-semibold">
                                {brl(Number(conta.saldo_inicial) + (movimentoPorConta.get(conta.id) ?? 0))}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </details>
                    </td>
                  </tr>
                )}

                {contasOperacionais.map((c) => {
                  const saldoAtual = Number(c.saldo_inicial) + (movimentoPorConta.get(c.id) ?? 0);
                  const saldoHa30Dias = Number(c.saldo_inicial) + (movimentoPorContaHa30Dias.get(c.id) ?? 0);
                  const saldoNaoInformado = Number(c.saldo_inicial) === 0 && !movimentoPorConta.has(c.id);
                  const variacao = variacaoAtual(saldoAtual, saldoHa30Dias);
                  return (
                    <tr key={c.id} className={c.ativa ? "" : "opacity-60"}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <LogoBanco banco={c.banco} />
                          <div>
                            <p className="text-sm font-medium text-ink">{c.nome}</p>
                            <p className="text-xs text-ink-muted">
                              {[c.banco, c.agencia && `Ag. ${c.agencia}`, c.numero_conta].filter(Boolean).join(" · ") || "-"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-ink-muted">{TIPO_LABEL[c.tipo ?? "corrente"] ?? c.tipo}</td>
                      <td className="px-4 py-2.5">
                        {saldoNaoInformado ? (
                          <>
                            <p className="font-semibold text-ink-muted">A confirmar</p>
                            <p className="text-xs text-ink-muted">Informe o saldo inicial quando tiver o extrato.</p>
                          </>
                        ) : (
                          <p className={`num font-semibold ${saldoAtual < 0 ? "text-rose-600" : "text-ink"}`}>{brl(saldoAtual)}</p>
                        )}
                        {!saldoNaoInformado && <LinhaVariacao valor={variacao} />}
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
                        <div className="flex justify-end gap-3">
                          <Link
                            href={`/financeiro/contas-bancarias/${c.id}/editar`}
                            className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-brand"
                          >
                            <Pencil size={13} strokeWidth={2} />
                            editar
                          </Link>
                          {c.ativa && (
                            <form action={arquivarContaBancaria}>
                              <input type="hidden" name="id" value={c.id} />
                              <button type="submit" className="text-xs text-ink-muted hover:text-rose-600">
                                arquivar
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
