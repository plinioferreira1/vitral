import { createClient } from "@/lib/supabase/server";
import { adicionarMembro, atualizarCategoriasMembro } from "./actions";
import { CATEGORIA_LABEL, NIVEL_ACESSO_LABEL, type CategoriaProcesso, type NivelAcesso } from "@/lib/types";

const PERFIS = [
  ["admin", "Administrador"],
  ["diretora", "Diretora"],
  ["gerente", "Gerente"],
  ["corretor", "Corretor"],
  ["correspondente", "Correspondente"],
  ["financeiro", "Financeiro"],
] as const;

const CATEGORIAS: CategoriaProcesso[] = ["venda", "financiamento", "locacao"];
const NIVEIS: NivelAcesso[] = ["diretor", "gerente", "supervisor", "auxiliar"];

export default async function MembrosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const supabase = await createClient();
  const { erro } = await searchParams;

  const { data: membros } = await supabase
    .from("usuarios")
    .select("id, nome, email, perfil, nivel_acesso, cargo, ativo")
    .order("nome");

  const { data: categoriasRaw } = await supabase.from("usuario_categorias").select("usuario_id, categoria");

  const categoriasPorUsuario = new Map<string, Set<CategoriaProcesso>>();
  (categoriasRaw ?? []).forEach((c) => {
    if (!categoriasPorUsuario.has(c.usuario_id)) categoriasPorUsuario.set(c.usuario_id, new Set());
    categoriasPorUsuario.get(c.usuario_id)!.add(c.categoria);
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Membros</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Adicione a diretora e os outros gerentes ao mesmo espaço de trabalho. A pessoa
          precisa primeiro criar uma conta em <code className="text-xs">/login</code> — depois
          disso, adicione o e-mail dela aqui.
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          <b>Nível de acesso</b>: Diretor e Gerente veem e editam tudo · Supervisor só vê/edita
          as categorias marcadas · Auxiliar vê tudo mas não pode editar nada.
        </p>
      </div>

      {erro && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {erro}
        </p>
      )}

      <form action={adicionarMembro} className="space-y-3 rounded-xl border border-border/60 bg-surface shadow-sm p-5">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-ink-muted">E-mail</label>
            <input
              name="email"
              type="email"
              required
              placeholder="diretora@empresa.com"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Perfil</label>
            <select
              name="perfil"
              defaultValue="gerente"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {PERFIS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Nível de acesso</label>
            <select
              name="nivel_acesso"
              defaultValue="supervisor"
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {NIVEIS.map((n) => (
                <option key={n} value={n}>
                  {NIVEL_ACESSO_LABEL[n]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-ink-muted">
            Categorias (só importa pra Supervisor)
          </p>
          <div className="flex gap-3">
            {CATEGORIAS.map((c) => (
              <label key={c} className="flex items-center gap-1.5 text-sm text-ink">
                <input type="checkbox" name="categorias" value={c} className="accent-brand" />
                {CATEGORIA_LABEL[c]}
              </label>
            ))}
          </div>
        </div>
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Adicionar
        </button>
      </form>

      <div className="space-y-2">
        {(membros ?? []).map((m) => {
          const categoriasAtuais = categoriasPorUsuario.get(m.id) ?? new Set();
          return (
            <div key={m.id} className="rounded-xl border border-border/60 bg-surface shadow-sm p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div>
                  <p className="text-sm font-medium text-ink">
                    {m.nome}
                    {m.cargo && <span className="ml-2 text-xs font-normal text-ink-muted">{m.cargo}</span>}
                  </p>
                  <p className="text-xs text-ink-muted">{m.email}</p>
                </div>
              </div>
              <form action={atualizarCategoriasMembro} className="flex flex-wrap items-center gap-3">
                <input type="hidden" name="usuario_id" value={m.id} />
                <select
                  name="nivel_acesso"
                  defaultValue={m.nivel_acesso}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-brand"
                >
                  {NIVEIS.map((n) => (
                    <option key={n} value={n}>
                      {NIVEL_ACESSO_LABEL[n]}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS.map((c) => (
                    <label key={c} className="flex items-center gap-1 text-xs text-ink-muted">
                      <input
                        type="checkbox"
                        name="categorias"
                        value={c}
                        defaultChecked={categoriasAtuais.has(c)}
                        className="accent-brand"
                      />
                      {CATEGORIA_LABEL[c]}
                    </label>
                  ))}
                </div>
                <button
                  type="submit"
                  className="rounded-md border border-border px-2.5 py-1 text-xs text-ink-muted hover:bg-background"
                >
                  Salvar
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
