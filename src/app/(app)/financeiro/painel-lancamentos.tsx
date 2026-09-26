import { createClient } from "@/lib/supabase/server";
import { Repeat } from "lucide-react";
import { CartaoIndicador } from "@/components/cartao-indicador";
import { Wallet, AlertTriangle, RefreshCcw, CheckCircle2 } from "lucide-react";
import { criarLancamento, registrarBaixa, cancelarLancamento, editarLancamento } from "./lancamentos-actions";
import { hojeISO } from "@/lib/data-br";

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

type Filtros = { status?: string; categoria?: string; pessoa?: string; q?: string };

export async function PainelLancamentos({ tipo, searchParams }: { tipo: "receita" | "despesa"; searchParams?: Filtros }) {
  const supabase = await createClient();
  const hoje = hojeISO();
  const inicioMes = `${hoje.slice(0, 7)}-01`;
  const fim = new Date(Number(hoje.slice(0, 4)), Number(hoje.slice(5, 7)), 0).toISOString().slice(0, 10);

  const [{ data: pessoas }, { data: categorias }, { data: centros }, { data: unidades }, { data: contas }] =
    await Promise.all([
      supabase.from("financeiro_pessoas").select("id, nome").order("nome"),
      supabase.from("financeiro_categorias").select("id, nome").eq("tipo", tipo).order("nome"),
      supabase.from("financeiro_centros_custo").select("id, nome").order("nome"),
      supabase.from("financeiro_unidades").select("id, nome").order("nome"),
      supabase.from("financeiro_contas_bancarias").select("id, nome").eq("ativa", true).order("nome"),
    ]);

  const { data: lancamentosTodos } = await supabase
    .from("financeiro_lancamentos")
    .select(
      "id, descricao, valor, vencimento, competencia, status, recorrencia_id, pessoa_id, categoria_id, centro_custo_id, unidade_id, conta_bancaria_id, forma_pagamento, numero_documento, observacoes, financeiro_pessoas ( nome ), financeiro_categorias ( nome ), financeiro_unidades ( nome )"
    )
    .eq("tipo", tipo)
    .order("vencimento");

  const { data: baixasRaw } = await supabase
    .from("financeiro_baixas")
    .select("lancamento_id, valor, data");
  const baixadoPorLancamento = new Map<string, number>();
  (baixasRaw ?? []).forEach((b) => {
    baixadoPorLancamento.set(b.lancamento_id, (baixadoPorLancamento.get(b.lancamento_id) ?? 0) + Number(b.valor));
  });

  const todos = lancamentosTodos ?? [];

  // KPIs do mês corrente, calculados sobre a lista completa (não filtrada).
  const noMes = todos.filter((l) => l.vencimento >= inicioMes && l.vencimento <= fim);
  const pendentesNoMes = noMes.filter((l) => l.status === "pendente" || l.status === "pago_parcial");
  const totalNoMes = pendentesNoMes.reduce((s, l) => s + Number(l.valor), 0);
  const vencidos = todos.filter((l) => (l.status === "pendente" || l.status === "pago_parcial") && l.vencimento < hoje);
  const totalVencidos = vencidos.reduce((s, l) => s + Number(l.valor), 0);
  const recorrentes = todos.filter((l) => l.recorrencia_id && (l.status === "pendente" || l.status === "pago_parcial"));
  const baixasNoMes = (baixasRaw ?? []).filter((b) => b.data >= inicioMes && b.data <= fim);
  const totalBaixadoNoMes = baixasNoMes
    .filter((b) => todos.some((l) => l.id === b.lancamento_id))
    .reduce((s, b) => s + Number(b.valor), 0);

  // Filtros (via querystring, navegação simples sem JS).
  const f = searchParams ?? {};
  const lancamentos = todos.filter((l) => {
    if (f.status && l.status !== f.status) return false;
    if (f.categoria && l.categoria_id !== f.categoria) return false;
    if (f.pessoa && l.pessoa_id !== f.pessoa) return false;
    if (f.q && !l.descricao.toLowerCase().includes(f.q.toLowerCase())) return false;
    return true;
  });

  const titulo = tipo === "receita" ? "Contas a Receber" : "Contas a Pagar";
  const rotuloPessoa = tipo === "receita" ? "Cliente" : "Fornecedor";
  const rota = tipo === "receita" ? "/financeiro/contas-a-receber" : "/financeiro/contas-a-pagar";
  const temFiltro = !!(f.status || f.categoria || f.pessoa || f.q);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">{titulo}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Lançamentos manuais e recorrentes — marque como recorrente pra gerar as próximas ocorrências
          automaticamente, sem precisar cadastrar uma por uma.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CartaoIndicador
          icon={Wallet}
          valor={brl(totalNoMes)}
          label={`${tipo === "receita" ? "A receber" : "A pagar"} no mês`}
        />
        <CartaoIndicador icon={AlertTriangle} valor={brl(totalVencidos)} label={`Vencidos (${vencidos.length})`} tom={vencidos.length > 0 ? "perigo" : "neutro"} />
        <CartaoIndicador icon={RefreshCcw} valor={recorrentes.length} label="Recorrentes em aberto" />
        <CartaoIndicador icon={CheckCircle2} valor={brl(totalBaixadoNoMes)} label={`${tipo === "receita" ? "Recebidos" : "Pagos"} no mês`} tom="sucesso" />
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-surface p-4 shadow-sm">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Buscar por descrição</label>
          <input name="q" defaultValue={f.q ?? ""} placeholder="Descrição..." className={campoClasse} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Status</label>
          <select name="status" defaultValue={f.status ?? ""} className={campoClasse}>
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="pago_parcial">Pago parcial</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Categoria</label>
          <select name="categoria" defaultValue={f.categoria ?? ""} className={campoClasse}>
            <option value="">Todas</option>
            {(categorias ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">{rotuloPessoa}</label>
          <select name="pessoa" defaultValue={f.pessoa ?? ""} className={campoClasse}>
            <option value="">Todos</option>
            {(pessoas ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          Filtrar
        </button>
        {temFiltro && (
          <a href={rota} className="text-xs text-ink-muted hover:text-brand hover:underline">
            Limpar filtros
          </a>
        )}
      </form>

      <details className="rounded-xl border border-border/60 bg-surface shadow-sm">
        <summary className="cursor-pointer list-none p-5 text-sm font-semibold text-ink">
          + Novo lançamento
        </summary>
        <form action={criarLancamento} className="space-y-5 border-t border-border p-5">
          <input type="hidden" name="tipo" value={tipo} />

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">1. Dados principais</p>
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
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">2. Datas e pagamento</p>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="forma_pagamento" placeholder="Forma de pagamento (opcional)" className={campoClasse} />
              <input name="numero_documento" placeholder="Número do documento (opcional)" className={campoClasse} />
            </div>
          </div>

          <div className="space-y-3 rounded-lg bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              3. Recorrência (se marcou o campo acima)
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
            <p className="text-[11px] text-ink-muted">
              Preencha &quot;repetir até&quot; OU &quot;quantas vezes&quot; — só precisa de um dos dois. As
              ocorrências já são criadas todas de uma vez (limite de 60 lançamentos por recorrência).
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">4. Observações</p>
            <textarea name="observacoes" rows={2} placeholder="Observações (opcional)" className={campoClasse} />
          </div>

          <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Criar lançamento
          </button>
        </form>
      </details>

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-surface shadow-sm">
        {lancamentos.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">
            {temFiltro ? "Nenhum lançamento encontrado com esses filtros." : "Nenhum lançamento ainda."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
                <th className="px-4 py-2.5 font-medium">Descrição</th>
                <th className="px-4 py-2.5 font-medium">{rotuloPessoa}</th>
                <th className="px-4 py-2.5 font-medium">Categoria</th>
                <th className="px-4 py-2.5 font-medium">Vencimento</th>
                <th className="px-4 py-2.5 font-medium">Valor</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lancamentos.map((l) => {
                const pessoa = (l as unknown as { financeiro_pessoas: { nome: string } | null }).financeiro_pessoas;
                const categoria = (l as unknown as { financeiro_categorias: { nome: string } | null })
                  .financeiro_categorias;
                const restante = Number(l.valor) - (baixadoPorLancamento.get(l.id) ?? 0);
                const editavel = l.status === "pendente" || l.status === "pago_parcial";
                return (
                  <tr key={l.id}>
                    <td className="px-4 py-2.5 text-ink">
                      {l.descricao}
                      {l.recorrencia_id && (
                        <Repeat size={11} strokeWidth={2} className="ml-1.5 inline text-ink-muted" />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">{pessoa?.nome ?? "—"}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{categoria?.nome ?? "—"}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{dataBR(l.vencimento)}</td>
                    <td className="num px-4 py-2.5 text-ink">{brl(l.valor)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COR[l.status]}`}>
                        {STATUS_LABEL[l.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editavel && (
                          <details className="relative">
                            <summary className="cursor-pointer list-none text-xs font-medium text-ink-muted hover:text-brand hover:underline">
                              editar
                            </summary>
                            <form
                              action={editarLancamento}
                              className="absolute right-0 z-20 mt-1 w-72 space-y-2 rounded-md border border-border bg-surface p-3 shadow-md"
                            >
                              <input type="hidden" name="id" value={l.id} />
                              <input
                                name="descricao"
                                defaultValue={l.descricao}
                                required
                                placeholder="Descrição"
                                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                              />
                              <input
                                name="valor"
                                type="number"
                                step="0.01"
                                defaultValue={l.valor}
                                required
                                placeholder="Valor"
                                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                              />
                              <input
                                name="vencimento"
                                type="date"
                                defaultValue={l.vencimento}
                                required
                                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                              />
                              <input
                                name="competencia"
                                type="date"
                                defaultValue={l.competencia ?? l.vencimento}
                                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                              />
                              <select
                                name="pessoa_id"
                                defaultValue={l.pessoa_id ?? ""}
                                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                              >
                                <option value="">{rotuloPessoa} (opcional)</option>
                                {(pessoas ?? []).map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.nome}
                                  </option>
                                ))}
                              </select>
                              <select
                                name="categoria_id"
                                defaultValue={l.categoria_id ?? ""}
                                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                              >
                                <option value="">Categoria (opcional)</option>
                                {(categorias ?? []).map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.nome}
                                  </option>
                                ))}
                              </select>
                              {l.recorrencia_id && (
                                <p className="text-[10px] text-ink-muted">
                                  Faz parte de uma recorrência — a edição vale só para este lançamento.
                                </p>
                              )}
                              <button
                                type="submit"
                                className="w-full rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-white hover:opacity-90"
                              >
                                Salvar alterações
                              </button>
                            </form>
                          </details>
                        )}
                        {l.status !== "pago" && l.status !== "cancelado" && (
                          <>
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
                          </>
                        )}
                      </div>
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
