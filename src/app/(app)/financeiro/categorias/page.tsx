import { createClient } from "@/lib/supabase/server";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { Tags, Building2 } from "lucide-react";
import { criarCategoria, apagarCategoria, criarCentroCusto, apagarCentroCusto } from "./actions";

const campoClasse =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

function agruparPorGrupo(categorias: { id: string; nome: string; grupo: string | null }[]) {
  const grupos = new Map<string, { id: string; nome: string; grupo: string | null }[]>();
  for (const c of categorias) {
    const chave = c.grupo ?? "Outras";
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(c);
  }
  return Array.from(grupos.entries());
}

export default async function FinanceiroCategoriasPage() {
  const supabase = await createClient();
  const { data: categorias } = await supabase
    .from("financeiro_categorias")
    .select("id, nome, tipo, grupo")
    .order("grupo")
    .order("nome");
  const { data: centros } = await supabase
    .from("financeiro_centros_custo")
    .select("id, nome")
    .order("nome");

  const receitas = (categorias ?? []).filter((c) => c.tipo === "receita");
  const despesas = (categorias ?? []).filter((c) => c.tipo === "despesa");
  const gruposReceita = agruparPorGrupo(receitas);
  const gruposDespesa = agruparPorGrupo(despesas);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">
          Categorias e Centros de Resultado
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Organizam as contas a pagar e a receber — cada lançamento vai pertencer a uma categoria
          e, opcionalmente, a um centro de resultado.
        </p>
      </div>

      <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <CabecalhoSecao icon={Tags} titulo="Categorias" descricao="De receita ou de despesa." />
        <form action={criarCategoria} className="mb-5 flex flex-wrap gap-2">
          <input name="nome" required placeholder="Nome da categoria" className={`${campoClasse} flex-1`} />
          <input name="grupo" placeholder="Grupo (opcional)" className={`${campoClasse} w-48`} />
          <select name="tipo" defaultValue="despesa" className={campoClasse} style={{ width: 140 }}>
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
          <button
            type="submit"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Adicionar
          </button>
        </form>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Receitas ({receitas.length})
            </p>
            {gruposReceita.length === 0 ? (
              <p className="text-sm text-ink-muted">Nenhuma ainda.</p>
            ) : (
              <div className="space-y-4">
                {gruposReceita.map(([grupo, itens]) => (
                  <div key={grupo}>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                      {grupo}
                    </p>
                    <ul className="space-y-1">
                      {itens.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                        >
                          <span className="text-ink">{c.nome}</span>
                          <form action={apagarCategoria}>
                            <input type="hidden" name="id" value={c.id} />
                            <button type="submit" className="text-xs text-ink-muted hover:text-rose-600">
                              apagar
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-rose-700">
              Despesas ({despesas.length})
            </p>
            {gruposDespesa.length === 0 ? (
              <p className="text-sm text-ink-muted">Nenhuma ainda.</p>
            ) : (
              <div className="space-y-4">
                {gruposDespesa.map(([grupo, itens]) => (
                  <div key={grupo}>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                      {grupo}
                    </p>
                    <ul className="space-y-1">
                      {itens.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                        >
                          <span className="text-ink">{c.nome}</span>
                          <form action={apagarCategoria}>
                            <input type="hidden" name="id" value={c.id} />
                            <button type="submit" className="text-xs text-ink-muted hover:text-rose-600">
                              apagar
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <CabecalhoSecao
          icon={Building2}
          titulo="Centros de resultado"
          descricao="Ex: Comercial, Administrativo, Sacra Cred."
        />
        <form action={criarCentroCusto} className="mb-4 flex gap-2">
          <input name="nome" required placeholder="Nome do centro de resultado" className={`${campoClasse} flex-1`} />
          <button
            type="submit"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Adicionar
          </button>
        </form>
        <ul className="space-y-1">
          {(centros ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum ainda.</p>
          ) : (
            (centros ?? []).map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              >
                <span className="text-ink">{c.nome}</span>
                <form action={apagarCentroCusto}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="text-xs text-ink-muted hover:text-rose-600">
                    apagar
                  </button>
                </form>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
