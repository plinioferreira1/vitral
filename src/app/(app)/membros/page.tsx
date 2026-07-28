import { createClient } from "@/lib/supabase/server";
import { adicionarMembro, atualizarCategoriasMembro } from "./actions";
import { CATEGORIA_LABEL, type CategoriaProcesso } from "@/lib/types";

const PERFIS = [
  ["admin", "Administrador"],
  ["diretora", "Diretora"],
  ["gerente", "Gerente"],
  ["corretor", "Corretor"],
  ["correspondente", "Correspondente"],
  ["financeiro", "Financeiro"],
] as const;

const CATEGORIAS: CategoriaProcesso[] = ["venda", "financiamento", "locacao"];

export default async function MembrosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const supabase = await createClient();
  const { erro } = await searchParams;

  const { data: membros } = await supabase
    .from("usuarios")
    .select("id, nome, email, perfil, cargo, ativo")
    .order("nome");

  const { data: categoriasRaw } = await supabase.from("usuario_categorias").select("usuario_id, categoria");

  const categoriasPorUsuario = new Map<string, Set<CategoriaProcesso>>();
  (categoriasRaw ?? []).forEach((c) => {
    if (!categoriasPorUsuario.has(c.usuario_id)) categoriasPorUsuario.set(c.usuario_id, new Set());
    categoriasPorUsuario.get(c.usuario_id)!.add(c.categoria);
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-serif font-semibold text-ink">Membros</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Adicione a diretora e os outros gerentes ao mesmo espaço de trabalho. A pessoa
          precisa primeiro criar uma conta em <code className="text-xs">/login</code> — depois
          disso, adicione o e-mail dela aqui. Admin e Diretora sempre veem tudo; os demais só
          veem as categorias marcadas abaixo.
        </p>
      </div>

      {erro && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {erro}
        </p>
      )}

      <form action={adicionarMembro} className="space-y-3 rounded-xl border border-border bg-surface p-5">
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
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-ink-muted">Categorias que essa pessoa vê</p>
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

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Nome</th>
              <th className="px-4 py-2.5 font-medium">Cargo</th>
              <th className="px-4 py-2.5 font-medium">E-mail</th>
              <th className="px-4 py-2.5 font-medium">Perfil</th>
              <th className="px-4 py-2.5 font-medium">Categorias</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(membros ?? []).map((m) => {
              const vetudo = m.perfil === "admin" || m.perfil === "diretora";
              const categoriasAtuais = categoriasPorUsuario.get(m.id) ?? new Set();
              return (
                <tr key={m.id}>
                  <td className="px-4 py-2.5 text-ink">{m.nome}</td>
                  <td className="px-4 py-2.5 text-ink-muted">{m.cargo || "—"}</td>
                  <td className="px-4 py-2.5 text-ink-muted">{m.email}</td>
                  <td className="px-4 py-2.5 capitalize text-ink-muted">{m.perfil}</td>
                  <td className="px-4 py-2.5">
                    {vetudo ? (
                      <span className="text-xs text-ink-muted">Tudo (perfil {m.perfil})</span>
                    ) : (
                      <form action={atualizarCategoriasMembro} className="flex items-center gap-2">
                        <input type="hidden" name="usuario_id" value={m.id} />
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
                        <button
                          type="submit"
                          className="rounded-md border border-border px-2 py-1 text-xs text-ink-muted hover:bg-background"
                        >
                          Salvar
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
