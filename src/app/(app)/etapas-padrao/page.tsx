import { createClient } from "@/lib/supabase/server";
import { adicionarEtapaPadrao, removerEtapaPadrao } from "./actions";

export default async function EtapasPadraoPage() {
  const supabase = await createClient();

  const { data: etapas } = await supabase
    .from("etapas_padrao")
    .select("id, nome, ordem")
    .order("ordem", { ascending: true });

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-serif font-semibold text-ink">Etapas padrão</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Essa é a lista de etapas que aparece pra escolher em cada processo (na tela do
          processo, em &quot;Adicionar etapa&quot;). Adicione, remova ou reordene conforme o
          jeito que vocês trabalham.
        </p>
      </div>

      <form
        action={adicionarEtapaPadrao}
        className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3"
      >
        <input
          name="nome"
          required
          placeholder="Nome da nova etapa (ex: Vistoria de Entrada)"
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Adicionar
        </button>
      </form>

      <div className="rounded-xl border border-border bg-surface">
        {(etapas ?? []).length === 0 ? (
          <p className="p-6 text-center text-sm text-ink-muted">Nenhuma etapa cadastrada ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(etapas ?? []).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="flex items-center gap-2 text-sm text-ink">
                  <span className="text-ink-muted">⠿</span>
                  {e.nome}
                </span>
                <form action={removerEtapaPadrao}>
                  <input type="hidden" name="id" value={e.id} />
                  <button
                    type="submit"
                    aria-label={`Remover ${e.nome}`}
                    className="rounded-md p-1.5 text-ink-muted hover:bg-background hover:text-rose-600"
                  >
                    🗑
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
