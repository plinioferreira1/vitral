import { ArrowRight, ArrowRightLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { CampoMoeda } from "@/components/financeiro/campo-moeda";
import { BotaoEnviar } from "@/components/botao-enviar";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { hojeISO } from "@/lib/data-br";
import { apagarTransferencia, criarTransferencia } from "./actions";

const campoClasse =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10";

function brl(v: number): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBR(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

export default async function TransferenciasPage() {
  const supabase = await createClient();
  const [{ data: contas }, { data: transferencias }] = await Promise.all([
    supabase.from("financeiro_contas_bancarias").select("id, nome, ativa").order("nome"),
    supabase
      .from("financeiro_transferencias")
      .select("id, conta_origem_id, conta_destino_id, valor, data, descricao")
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false })
      .limit(200),
  ]);

  const nomeConta = new Map((contas ?? []).map((c) => [c.id, c.nome]));
  const contasAtivas = (contas ?? []).filter((c) => c.ativa);

  return (
    <div className="financeiro-ui mx-auto max-w-[1180px] space-y-5">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Transferências entre contas</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Pagar a fatura do cartão com a conta corrente, aplicar ou resgatar investimento, mover dinheiro entre bancos.
          Não conta como receita nem despesa — só tira de uma conta e põe na outra.
        </p>
      </div>

      <form action={criarTransferencia} className="space-y-4 rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <CabecalhoSecao icon={ArrowRightLeft} titulo="Nova transferência" descricao="O saldo das duas contas é atualizado na hora." />
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Sai de *</label>
            <select name="conta_origem_id" required defaultValue="" className={campoClasse}>
              <option value="" disabled>
                Conta de origem
              </option>
              {contasAtivas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <ArrowRight className="mx-auto hidden text-ink-muted lg:mb-3 lg:block" size={18} />
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Entra em *</label>
            <select name="conta_destino_id" required defaultValue="" className={campoClasse}>
              <option value="" disabled>
                Conta de destino
              </option>
              {contasAtivas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[180px_170px_1fr]">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Valor *</label>
            <CampoMoeda name="valor" required className={campoClasse} placeholder="0,00" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Data *</label>
            <input name="data" type="date" required defaultValue={hojeISO()} className={campoClasse} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Descrição</label>
            <input name="descricao" placeholder="Ex: Pagamento da fatura do cartão de outubro" className={campoClasse} />
          </div>
        </div>
        <BotaoEnviar className="rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white hover:opacity-90">
          Registrar transferência
        </BotaoEnviar>
      </form>

      <div className="rounded-xl border border-border/60 bg-surface shadow-sm">
        <div className="border-b border-border p-4">
          <CabecalhoSecao icon={ArrowRightLeft} titulo="Transferências registradas" descricao="As mais recentes primeiro." />
        </div>
        {(transferencias ?? []).length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">Nenhuma transferência registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
                  <th className="px-4 py-2.5 font-medium">Data</th>
                  <th className="px-4 py-2.5 font-medium">De → Para</th>
                  <th className="px-4 py-2.5 font-medium">Descrição</th>
                  <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(transferencias ?? []).map((t) => (
                  <tr key={t.id}>
                    <td className="num whitespace-nowrap px-4 py-2.5 text-ink-muted">{dataBR(t.data)}</td>
                    <td className="px-4 py-2.5 text-ink">
                      {nomeConta.get(t.conta_origem_id) ?? "—"}
                      <ArrowRight size={13} className="mx-1.5 inline text-ink-muted" />
                      {nomeConta.get(t.conta_destino_id) ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">{t.descricao ?? "—"}</td>
                    <td className="num whitespace-nowrap px-4 py-2.5 text-right font-semibold text-ink">{brl(Number(t.valor))}</td>
                    <td className="px-4 py-2.5 text-right">
                      <form action={apagarTransferencia}>
                        <input type="hidden" name="id" value={t.id} />
                        <BotaoComConfirmacao
                          mensagem="Excluir esta transferência? O saldo das duas contas volta ao que era antes."
                          className="text-xs text-ink-muted hover:text-rose-600"
                        >
                          excluir
                        </BotaoComConfirmacao>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
