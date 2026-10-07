import { BotaoEnviar } from "@/components/botao-enviar";
import { INPUT_CLASS } from "@/components/ui/styles";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ListChecks, Wallet } from "lucide-react";
import { CampoFormaPagamento } from "@/components/financeiro/campo-forma-pagamento";
import { hojeISO } from "@/lib/data-br";
import { createClient } from "@/lib/supabase/server";
import { registrarBaixaEmLote } from "../../lancamentos-actions";

const campoClasse =
  INPUT_CLASS;

function brl(valor: number): string {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBR(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

type LancamentoLote = {
  id: string;
  tipo: "receita" | "despesa";
  descricao: string;
  valor: number;
  vencimento: string;
  status: string;
  conta_bancaria_id: string | null;
  forma_pagamento: string | null;
  financeiro_pessoas: { nome: string } | null;
  financeiro_contas_bancarias: { nome: string } | null;
};

export default async function BaixarLancamentosEmLotePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; retorno?: string }>;
}) {
  const params = await searchParams;
  const ids = [...new Set((params.ids ?? "").split(",").map((id) => id.trim()).filter(Boolean))].slice(0, 100);
  const retornoInformado = String(params.retorno ?? "");
  const retorno = retornoInformado.startsWith("/financeiro") ? retornoInformado : "/financeiro/contas-a-pagar#lista";
  if (ids.length === 0) notFound();

  const supabase = await createClient();
  const [{ data: lancamentosRaw }, { data: contas }, { data: baixas }] = await Promise.all([
    supabase
      .from("financeiro_lancamentos")
      .select(
        "id, tipo, descricao, valor, vencimento, status, conta_bancaria_id, forma_pagamento, financeiro_pessoas ( nome ), financeiro_contas_bancarias ( nome )"
      )
      .in("id", ids)
      .in("status", ["pendente", "pago_parcial"])
      .order("vencimento"),
    supabase.from("financeiro_contas_bancarias").select("id, nome").eq("ativa", true).order("nome"),
    supabase.from("financeiro_baixas").select("lancamento_id, valor").in("lancamento_id", ids),
  ]);

  const lancamentos = (lancamentosRaw ?? []) as unknown as LancamentoLote[];
  if (lancamentos.length === 0) notFound();
  const tipo = lancamentos[0].tipo;
  if (lancamentos.some((lancamento) => lancamento.tipo !== tipo)) notFound();

  const baixadoPorLancamento = new Map<string, number>();
  for (const baixa of baixas ?? []) {
    baixadoPorLancamento.set(
      baixa.lancamento_id,
      (baixadoPorLancamento.get(baixa.lancamento_id) ?? 0) + Number(baixa.valor)
    );
  }

  const itens = lancamentos
    .map((lancamento) => ({
      ...lancamento,
      saldo: Math.max(0, Number(lancamento.valor) - (baixadoPorLancamento.get(lancamento.id) ?? 0)),
    }))
    .filter((lancamento) => lancamento.saldo > 0.005);
  if (itens.length === 0) notFound();

  const total = itens.reduce((soma, lancamento) => soma + lancamento.saldo, 0);
  const acao = tipo === "receita" ? "recebimentos" : "pagamentos";

  return (
    <form action={registrarBaixaEmLote} className="financeiro-ui mx-auto max-w-[1180px] space-y-5 pb-24">
      {itens.map((lancamento) => (
        <input key={lancamento.id} type="hidden" name="ids" value={lancamento.id} />
      ))}
      <input type="hidden" name="return_to" value={retorno} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={retorno} className="mb-2 inline-flex items-center text-sm font-medium text-brand hover:underline">
            Voltar para a lista
          </Link>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">
            Registrar {acao} em lote
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Confira os lançamentos e confirme a baixa integral do saldo em aberto de cada item.
          </p>
        </div>
        <BotaoEnviar className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700">
          Confirmar {itens.length} {itens.length === 1 ? "baixa" : "baixas"}
        </BotaoEnviar>
      </div>

      <section className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <ListChecks size={18} className="text-brand" />
          <h2 className="text-base font-bold text-ink">Lançamentos selecionados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-ink-muted">
                <th className="px-2 py-2 font-medium">Descrição</th>
                <th className="px-2 py-2 font-medium">Pessoa</th>
                <th className="px-2 py-2 font-medium">Vencimento</th>
                <th className="px-2 py-2 font-medium">Conta atual</th>
                <th className="px-2 py-2 text-right font-medium">Saldo em aberto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {itens.map((lancamento) => (
                <tr key={lancamento.id}>
                  <td className="px-2 py-3 font-semibold text-ink">{lancamento.descricao}</td>
                  <td className="px-2 py-3 text-ink-muted">{lancamento.financeiro_pessoas?.nome ?? "Sem pessoa vinculada"}</td>
                  <td className="px-2 py-3 text-ink-muted">{dataBR(lancamento.vencimento)}</td>
                  <td className="px-2 py-3 text-ink-muted">{lancamento.financeiro_contas_bancarias?.nome ?? "Sem conta"}</td>
                  <td className="num px-2 py-3 text-right font-bold text-ink">{brl(lancamento.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex justify-end border-t border-border pt-3">
          <div className="text-right">
            <p className="text-xs text-ink-muted">Total das baixas</p>
            <p className="num text-2xl font-bold text-ink">{brl(total)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <Wallet size={18} className="text-brand" />
          <h2 className="text-base font-bold text-ink">Dados da baixa</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Data *</label>
            <input name="data" type="date" defaultValue={hojeISO()} required className={campoClasse} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Forma de pagamento</label>
            <CampoFormaPagamento className={campoClasse} placeholder="Manter a de cada lançamento" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Conta bancária</label>
            <select name="conta_bancaria_id" defaultValue="" className={campoClasse}>
              <option value="">Manter a de cada lançamento</option>
              {(contas ?? []).map((conta) => (
                <option key={conta.id} value={conta.id}>{conta.nome}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Observações</label>
          <textarea
            name="observacoes"
            rows={3}
            placeholder="Observação aplicada a todas as baixas selecionadas"
            className={campoClasse}
          />
        </div>
      </section>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <div className="flex items-start gap-2">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <p>Ao confirmar, o saldo integral em aberto de cada lançamento será registrado. Nenhum lançamento já quitado ou cancelado será alterado.</p>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] justify-between gap-3">
          <Link href={retorno} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink-muted hover:bg-background">
            Cancelar
          </Link>
          <BotaoEnviar className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
            Confirmar {itens.length} {itens.length === 1 ? "baixa" : "baixas"}
          </BotaoEnviar>
        </div>
      </div>
    </form>
  );
}
