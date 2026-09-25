import { createClient } from "@/lib/supabase/server";
import { Repeat } from "lucide-react";
import { criarLancamento, registrarBaixa, cancelarLancamento } from "./lancamentos-actions";

const campoClasse =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  pago_parcial: "Pago parcial",
  pago: "Pago",
  cancelado: "Cancelado",
};
const STATUS_COR: Record<string, string> = {
  pendente: "bg-amber-50 text-amber-700 border-amber-100",
  pago_parcial: "bg-blue-50 text-blue-700 border-blue-100",
  pago: "bg-emerald-50 text-emerald-700 border-emerald-100",
  cancelado: "bg-stone-100 text-stone-500 border-stone-200",
};

function brl(v: number): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dataBR(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

export async function PainelLancamentos({ tipo }: { tipo: "receita" | "despesa" }) {
  const supabase = await createClient();

  const [{ data: pessoas }, { data: categorias }, { data: centros }, { data: unidades }, { data: contas }] =
    await Promise.all([
      supabase.from("financeiro_pessoas").select("id, nome").order("nome"),
      supabase.from("financeiro_categorias").select("id, nome").eq("tipo", tipo).order("nome"),
      supabase.from("financeiro_centros_custo").select("id, nome").order("nome"),
      supabase.from("financeiro_unidades").select("id, nome").order("nome"),
      supabase.from("financeiro_contas_bancarias").select("id, nome").eq("ativa", true).order("nome"),
    ]);

  const { data: lancamentos } = await supabase
    .from("financeiro_lancamentos")
    .select(
      "id, descricao, valor, vencimento, status, recorrencia_id, financeiro_pessoas ( nome ), financeiro_categorias ( nome ), financeiro_unidades ( nome )"
    )
    .eq("tipo", tipo)
    .order("vencimento");

  const { data: baixasRaw } = await supabase.from("financeiro_baixas").select("lancamento_id, valor");
  const baixadoPorLancamento = new Map<string, number>();
  (baixasRaw ?? []).forEach((b) => {
    baixadoPorLancamento.set(b.lancamento_id, (baixadoPorLancamento.get(b.lancamento_id) ?? 0) + Number(b.valor));
  });

  const titulo = tipo === "receita" ? "Contas a Receber" : "Contas a Pagar";
  const rotuloPessoa = tipo === "receita" ? "Cliente" : "Fornecedor";

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">{titulo}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Lançamentos manuais — marque como recorrente pra gerar as próximas ocorrências
          automaticamente, sem precisar cadastrar uma por uma.
        </p>
      </div>

      <details className="rounded-xl border border-border/60 bg-surface shadow-sm">
        <summary className="cursor-pointer list-none p-5 text-sm font-semibold text-ink">
          + Novo lançamento
        </summary>
        <form action={criarLancamento} className="space-y-4 border-t border-border p-5">
          <input type="hidden" name="tipo" value={tipo} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="descricao" required placeholder="Descrição" className={campoClasse} />
            <input name="valor" type="number" step="0.01" required placeholder="Valor (R$)" className={campoClasse} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="pessoa_id" defaultValue="" className={campoClasse}>
              <option value="">{rotuloPessoa} (opcional)</option>
              {(pessoas ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
            <select name="categoria_id" defaultValue="" className={campoClasse}>
              <option value="">Categoria (opcional)</option>
              {(categorias ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <select name="centro_custo_id" defaultValue="" className={campoClasse}>
              <option value="">Centro de resultado (opcional)</option>
              {(centros ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <select name="unidade_id" defaultValue="" className={campoClasse}>
              <option value="">Unidade (opcional)</option>
              {(unidades ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
            <select name="conta_bancaria_id" defaultValue="" className={campoClasse}>
              <option value="">Conta bancária prevista (opcional)</option>
              {(contas ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" name="recorrente" className="accent-brand" />
            <Repeat size={14} strokeWidth={2} />
            Isso é uma conta recorrente
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Vencimento (só pra lançamento avulso)
              </label>
              <input name="vencimento" type="date" className={campoClasse} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Competência (opcional)</label>
              <input name="competencia" type="date" className={campoClasse} />
            </div>
          </div>

          <div className="rounded-lg bg-background p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Se marcou recorrente, preencha isso:
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <select name="frequencia" defaultValue="mensal" className={campoClasse}>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
                <option value="trimestral">Trimestral</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
              </select>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Data da 1ª ocorrência</label>
                <input name="data_inicio" type="date" className={campoClasse} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Repetir até (data final)
                </label>
                <input name="data_fim" type="date" className={campoClasse} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  ...ou por quantas vezes
                </label>
                <input name="numero_ocorrencias" type="number" min={1} placeholder="Ex: 12" className={campoClasse} />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-ink-muted">
              Preencha &quot;repetir até&quot; OU &quot;quantas vezes&quot; — só precisa de um dos dois. As
              ocorrências já são criadas todas de uma vez (limite de 60 lançamentos por recorrência).
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input name="forma_pagamento" placeholder="Forma de pagamento (opcional)" className={campoClasse} />
            <input name="numero_documento" placeholder="Número do documento (opcional)" className={campoClasse} />
          </div>
          <textarea name="observacoes" rows={2} placeholder="Observações (opcional)" className={campoClasse} />

          <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Criar lançamento
          </button>
        </form>
      </details>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
        {(lancamentos ?? []).length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">Nenhum lançamento ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
                <th className="px-4 py-2.5 font-medium">Descrição</th>
                <th className="px-4 py-2.5 font-medium">{rotuloPessoa}</th>
                <th className="px-4 py-2.5 font-medium">Vencimento</th>
                <th className="px-4 py-2.5 font-medium">Valor</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(lancamentos ?? []).map((l) => {
                const pessoa = (l as unknown as { financeiro_pessoas: { nome: string } | null }).financeiro_pessoas;
                const restante = Number(l.valor) - (baixadoPorLancamento.get(l.id) ?? 0);
                return (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 text-ink">
                      {l.descricao}
                      {l.recorrencia_id && (
                        <Repeat size={11} strokeWidth={2} className="ml-1.5 inline text-ink-muted" />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">{pessoa?.nome ?? "—"}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{dataBR(l.vencimento)}</td>
                    <td className="num px-4 py-2.5 text-ink">{brl(l.valor)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COR[l.status]}`}>
                        {STATUS_LABEL[l.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {l.status !== "pago" && l.status !== "cancelado" && (
                        <div className="flex items-center justify-end gap-2">
                          <details className="relative">
                            <summary className="cursor-pointer list-none text-xs font-medium text-brand hover:underline">
                              {tipo === "receita" ? "receber" : "pagar"}
                            </summary>
                            <form
                              action={registrarBaixa}
                              className="absolute right-0 z-10 mt-1 w-64 space-y-2 rounded-md border border-border bg-surface p-3 shadow-md"
                            >
                              <input type="hidden" name="lancamento_id" value={l.id} />
                              <p className="text-xs text-ink-muted">Restante: {brl(restante)}</p>
                              <input
                                name="valor"
                                type="number"
                                step="0.01"
                                required
                                defaultValue={restante}
                                placeholder="Valor"
                                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                              />
                              <input
                                name="data"
                                type="date"
                                required
                                defaultValue={new Date().toISOString().slice(0, 10)}
                                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                              />
                              <select
                                name="conta_bancaria_id"
                                defaultValue=""
                                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                              >
                                <option value="">Conta bancária</option>
                                {(contas ?? []).map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.nome}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="submit"
                                className="w-full rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-white hover:opacity-90"
                              >
                                Confirmar
                              </button>
                            </form>
                          </details>
                          <form action={cancelarLancamento}>
                            <input type="hidden" name="id" value={l.id} />
                            <button type="submit" className="text-xs text-ink-muted hover:text-rose-600">
                              cancelar
                            </button>
                          </form>
                        </div>
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
