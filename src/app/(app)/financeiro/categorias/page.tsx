import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TrendingUp, TrendingDown, Landmark, Pencil } from "lucide-react";
import { criarCategoria, editarCategoria, apagarCategoria, criarCentroCusto, apagarCentroCusto } from "./actions";

const campoClasse =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

type Categoria = {
  id: string;
  nome: string;
  tipo: string;
  grupo: string | null;
  centro_custo_padrao_id: string | null;
  financeiro_centros_custo: { nome: string } | null;
};

function agruparPorGrupo(categorias: Categoria[]) {
  const grupos = new Map<string, Categoria[]>();
  for (const c of categorias) {
    const chave = c.grupo ?? "Outras";
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(c);
  }
  return Array.from(grupos.entries());
}

export default async function FinanceiroCategoriasPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; q?: string }>;
}) {
  const { aba: abaParam, q: busca } = await searchParams;
  const aba = abaParam === "despesas" || abaParam === "centros" ? abaParam : "receitas";

  const supabase = await createClient();
  const [{ data: categoriasRaw }, { data: centros }] = await Promise.all([
    supabase
      .from("financeiro_categorias")
      .select("id, nome, tipo, grupo, centro_custo_padrao_id, financeiro_centros_custo ( nome )")
      .order("grupo")
      .order("nome"),
    supabase.from("financeiro_centros_custo").select("id, nome").order("nome"),
  ]);
  const categorias = (categoriasRaw ?? []) as unknown as Categoria[];

  const receitas = categorias.filter((c) => c.tipo === "receita");
  const despesas = categorias.filter((c) => c.tipo === "despesa");
  const categoriasAtivas = aba === "receitas" ? receitas : despesas;
  const gruposAtivos = aba === "centros" ? [] : agruparPorGrupo(
    busca ? categoriasAtivas.filter((c) => `${c.nome} ${c.grupo ?? ""}`.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR"))) : categoriasAtivas,
  );
  const centrosVisiveis = busca
    ? (centros ?? []).filter((c) => c.nome.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR")))
    : (centros ?? []);

  return (
    <div className="financeiro-ui mx-auto max-w-[1480px] space-y-5">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">
          Categorias e centros de resultado
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Organize as contas a pagar e a receber para que cada lançamento pertença a uma categoria e,
          opcionalmente, a um centro de resultado.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/financeiro/categorias?aba=receitas"
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm ${
            aba === "receitas" ? "border-brand bg-brand text-white" : "border-border/60 bg-surface text-ink hover:bg-background"
          }`}
        >
          <TrendingUp size={16} strokeWidth={2} />
          Receitas ({receitas.length})
        </Link>
        <Link
          href="/financeiro/categorias?aba=despesas"
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm ${
            aba === "despesas" ? "border-brand bg-brand text-white" : "border-border/60 bg-surface text-ink hover:bg-background"
          }`}
        >
          <TrendingDown size={16} strokeWidth={2} />
          Despesas ({despesas.length})
        </Link>
        <Link
          href="/financeiro/categorias?aba=centros"
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm ${
            aba === "centros" ? "border-brand bg-brand text-white" : "border-border/60 bg-surface text-ink hover:bg-background"
          }`}
        >
          <Landmark size={16} strokeWidth={2} />
          Centros de Resultado ({(centros ?? []).length})
        </Link>
        <form method="get" className="flex min-w-[220px] flex-1 gap-2 lg:ml-auto lg:max-w-sm">
          <input type="hidden" name="aba" value={aba} />
          <input name="q" defaultValue={busca ?? ""} placeholder={aba === "centros" ? "Buscar centro..." : "Buscar categoria ou grupo..."} className={campoClasse} />
          <button type="submit" className="rounded-lg border border-border px-3 text-sm font-medium text-ink hover:bg-background">Buscar</button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {aba === "centros" ? (
            <div className="rounded-xl border border-border/60 bg-surface shadow-sm">
              {centrosVisiveis.length === 0 ? (
                <p className="p-8 text-center text-sm text-ink-muted">{busca ? "Nenhum centro encontrado." : "Nenhum centro de resultado ainda."}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {centrosVisiveis.map((c) => (
                    <li key={c.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="text-ink">{c.nome}</span>
                      <form action={apagarCentroCusto}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="text-xs text-ink-muted hover:text-rose-600">
                          apagar
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : gruposAtivos.length === 0 ? (
            <p className="rounded-xl border border-border/60 bg-surface p-8 text-center text-sm text-ink-muted shadow-sm">
              {busca ? "Nenhuma categoria encontrada." : `Nenhuma categoria de ${aba === "receitas" ? "receita" : "despesa"} ainda.`}
            </p>
          ) : (
            gruposAtivos.map(([grupo, itens], index) => (
              <details key={grupo} open={Boolean(busca) || index === 0} className="rounded-xl border border-border/60 bg-surface shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between p-4">
                  <span className="text-sm font-semibold text-ink">
                    {grupo} <span className="text-ink-muted">({itens.length})</span>
                  </span>
                </summary>
                <table className="w-full border-t border-border text-sm">
                  <thead>
                    <tr className="bg-background text-left text-xs text-ink-muted">
                      <th className="px-4 py-2 font-medium">Nome da categoria</th>
                      <th className="px-4 py-2 font-medium">Centro de resultado padrão</th>
                      <th className="px-4 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {itens.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-2 text-ink">{c.nome}</td>
                        <td className="px-4 py-2 text-ink-muted">{c.financeiro_centros_custo?.nome ?? "—"}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <details className="relative">
                              <summary
                                className="cursor-pointer list-none rounded-md p-1.5 text-ink-muted hover:bg-background hover:text-brand"
                                title="Editar"
                              >
                                <Pencil size={14} strokeWidth={2} />
                              </summary>
                              <form
                                action={editarCategoria}
                                className="absolute right-0 z-20 mt-1 w-64 space-y-2 rounded-md border border-border bg-surface p-3 shadow-md"
                              >
                                <input type="hidden" name="id" value={c.id} />
                                <input
                                  name="nome"
                                  defaultValue={c.nome}
                                  required
                                  className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                                />
                                <input
                                  name="grupo"
                                  defaultValue={c.grupo ?? ""}
                                  placeholder="Grupo (opcional)"
                                  className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                                />
                                <select
                                  name="centro_custo_padrao_id"
                                  defaultValue={c.centro_custo_padrao_id ?? ""}
                                  className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                                >
                                  <option value="">Centro de resultado padrão (opcional)</option>
                                  {(centros ?? []).map((cc) => (
                                    <option key={cc.id} value={cc.id}>
                                      {cc.nome}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="submit"
                                  className="w-full rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-white hover:opacity-90"
                                >
                                  Salvar
                                </button>
                              </form>
                            </details>
                            <form action={apagarCategoria}>
                              <input type="hidden" name="id" value={c.id} />
                              <button type="submit" className="text-xs text-ink-muted hover:text-rose-600">
                                apagar
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            ))
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-surface p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-ink">Resumo de cadastros</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="num text-lg font-bold text-emerald-700">{receitas.length}</p>
                <p className="text-[11px] text-ink-muted">Receitas</p>
              </div>
              <div>
                <p className="num text-lg font-bold text-rose-700">{despesas.length}</p>
                <p className="text-[11px] text-ink-muted">Despesas</p>
              </div>
              <div>
                <p className="num text-lg font-bold text-ink">{(centros ?? []).length}</p>
                <p className="text-[11px] text-ink-muted">Centros</p>
              </div>
            </div>
          </div>

          {aba === "centros" ? (
            <form
              action={criarCentroCusto}
              className="space-y-3 rounded-xl border border-border/60 bg-surface p-4 shadow-sm"
            >
              <p className="text-sm font-semibold text-ink">Novo centro de resultado</p>
              <input name="nome" required placeholder="Ex: Comercial, Administrativo..." className={campoClasse} />
              <button
                type="submit"
                className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Salvar centro
              </button>
            </form>
          ) : (
            <form
              action={criarCategoria}
              className="space-y-3 rounded-xl border border-border/60 bg-surface p-4 shadow-sm"
            >
              <p className="text-sm font-semibold text-ink">Nova categoria</p>
              <input type="hidden" name="tipo" value={aba === "receitas" ? "receita" : "despesa"} />
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Nome da categoria</label>
                <input name="nome" required placeholder="Ex: Comissão de Vendas" className={campoClasse} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Grupo (opcional)</label>
                <input name="grupo" placeholder="Ex: Custos diretos" className={campoClasse} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Centro de resultado padrão (opcional)
                </label>
                <select name="centro_custo_padrao_id" defaultValue="" className={campoClasse}>
                  <option value="">Selecione (opcional)</option>
                  {(centros ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Salvar categoria
              </button>
            </form>
          )}

          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-900 shadow-sm">
            <p className="mb-2 font-semibold">Dicas</p>
            <ul className="space-y-1.5">
              <li>Use grupos para manter suas categorias organizadas.</li>
              <li>Defina um centro de resultado padrão pra ele já vir preenchido ao lançar.</li>
              <li>Categorias bem estruturadas facilitam seus relatórios financeiros.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
