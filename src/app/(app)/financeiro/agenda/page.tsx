import { createClient } from "@/lib/supabase/server";
import { AlertTriangle } from "lucide-react";
import { registrarBaixa, cancelarLancamento } from "../lancamentos-actions";
import { hojeISO } from "@/lib/data-br";

function brl(v: number): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dataBR(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export default async function AgendaFinanceiraPage() {
  const supabase = await createClient();
  const hoje = hojeISO();
  const em60dias = new Date();
  em60dias.setDate(em60dias.getDate() + 60);

  const [{ data: lancamentos }, { data: contas }] = await Promise.all([
    supabase
      .from("financeiro_lancamentos")
      .select(
        "id, tipo, descricao, valor, vencimento, status, financeiro_pessoas ( nome )"
      )
      .in("status", ["pendente", "pago_parcial"])
      .lte("vencimento", em60dias.toISOString().slice(0, 10))
      .order("vencimento"),
    supabase.from("financeiro_contas_bancarias").select("id, nome").eq("ativa", true).order("nome"),
  ]);

  const porData = new Map<string, typeof lancamentos>();
  (lancamentos ?? []).forEach((l) => {
    if (!porData.has(l.vencimento)) porData.set(l.vencimento, []);
    porData.get(l.vencimento)!.push(l);
  });
  const datasOrdenadas = Array.from(porData.keys()).sort();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">
          Agenda Financeira
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Vencimentos futuros e vencidos, pendentes de liquidação — dos próximos 60 dias.
        </p>
      </div>

      {datasOrdenadas.length === 0 ? (
        <p className="rounded-xl border border-border/60 bg-surface p-8 text-center text-sm text-ink-muted shadow-sm">
          Nada pendente nos próximos 60 dias. ✅
        </p>
      ) : (
        <div className="space-y-4">
          {datasOrdenadas.map((data) => {
            const itens = porData.get(data)!;
            const vencido = data < hoje;
            const hojeMarcador = data === hoje;
            return (
              <div key={data} className="rounded-xl border border-border/60 bg-surface shadow-sm">
                <div
                  className={`flex items-center gap-2 border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide ${
                    vencido ? "bg-rose-50 text-rose-700" : hojeMarcador ? "bg-amber-50 text-amber-700" : "text-ink-muted"
                  }`}
                >
                  {vencido && <AlertTriangle size={13} strokeWidth={2} />}
                  {dataBR(data)}
                  {hojeMarcador && " — Hoje"}
                  {vencido && " — Vencido"}
                </div>
                <ul className="divide-y divide-border">
                  {itens.map((l) => {
                    const pessoa = (l as unknown as { financeiro_pessoas: { nome: string } | null }).financeiro_pessoas;
                    return (
                      <li key={l.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="text-sm text-ink">
                            <span
                              className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                l.tipo === "receita" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {l.tipo === "receita" ? "Receber" : "Pagar"}
                            </span>
                            {l.descricao}
                          </p>
                          <p className="text-xs text-ink-muted">{pessoa?.nome ?? "—"}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="num text-sm font-medium text-ink">{brl(l.valor)}</span>
                          <details className="relative">
                            <summary className="cursor-pointer list-none text-xs font-medium text-brand hover:underline">
                              liquidar
                            </summary>
                            <form
                              action={registrarBaixa}
                              className="absolute right-0 z-10 mt-1 w-60 space-y-2 rounded-md border border-border bg-surface p-3 shadow-md"
                            >
                              <input type="hidden" name="lancamento_id" value={l.id} />
                              <input
                                name="valor"
                                type="number"
                                step="0.01"
                                required
                                defaultValue={l.valor}
                                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                              />
                              <input
                                name="data"
                                type="date"
                                required
                                defaultValue={hoje}
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
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
