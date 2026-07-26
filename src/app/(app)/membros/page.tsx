import { createClient } from "@/lib/supabase/server";
import { adicionarMembro } from "./actions";

const PERFIS = [
  ["admin", "Administrador"],
  ["diretora", "Diretora"],
  ["gerente", "Gerente"],
  ["corretor", "Corretor"],
  ["correspondente", "Correspondente"],
  ["financeiro", "Financeiro"],
] as const;

export default async function MembrosPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const supabase = await createClient();
  const { erro } = await searchParams;

  const { data: membros } = await supabase
    .from("usuarios")
    .select("id, nome, email, perfil, ativo")
    .order("nome");

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Membros</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Adicione a diretora e os outros gerentes ao mesmo espaço de trabalho. A pessoa
          precisa primeiro criar uma conta em <code className="text-xs">/login</code> — depois
          disso, adicione o e-mail dela aqui.
        </p>
      </div>

      {erro && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {erro}
        </p>
      )}

      <form action={adicionarMembro} className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface p-4">
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
              <th className="px-4 py-2.5 font-medium">E-mail</th>
              <th className="px-4 py-2.5 font-medium">Perfil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(membros ?? []).map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2.5 text-ink">{m.nome}</td>
                <td className="px-4 py-2.5 text-ink-muted">{m.email}</td>
                <td className="px-4 py-2.5 capitalize text-ink-muted">{m.perfil}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
