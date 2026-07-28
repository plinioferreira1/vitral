import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { adicionarEtapaPadrao, removerEtapaPadrao } from "./actions";
import type { CategoriaProcesso } from "@/lib/types";
import { CATEGORIA_LABEL } from "@/lib/types";

export default async function EtapasPadraoPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria: categoriaParam } = await searchParams;
  const categoria = (categoriaParam as CategoriaProcesso) || "venda";

  const supabase = await createClient();

  const { data: etapas } = await supabase
    .from("etapas_padrao")
    .select("id, nome, ordem, categoria")
    .eq("categoria", categoria)
    .order("ordem", { ascending: true });

  const abas: CategoriaProcesso[] = ["venda", "financiamento"];

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-serif font-semibold text-ink">Etapas padrão</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Essa é a lista de etapas que aparece pra escolher em cada processo (na tela do
          processo, em &quot;Adicionar etapa&quot;), separada por categoria. Adicione ou remova
          conforme o jeito que vocês trabalham.
        </p>
      </div>

      <div className="flex gap-1 rounded-lg bg-background p-1 text-sm w-fit">
        {abas.map((c) => (
          <Link
            key={c}
            href={`/etapas-padrao?categoria=${c}`}
            className={`rounded-md px-4 py-1.5 text-center font-medium transition ${
              categoria === c ? "bg-surface shadow-sm text-ink" : "text-ink-muted"
            }`}
          >
            {CATEGORIA_LABEL[c]}
          </Link>
        ))}
      </div>

      <form
        action={adicionarEtapaPadrao}
        className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3"
      >
        <input type="hidden" name="categoria" value={categoria} />
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
          <p className="p-6 text-center text-sm text-ink-muted">
            Nenhuma etapa cadastrada nessa categoria ainda.
          </p>
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
                  <input type="hidden" name="categoria" value={categoria} />
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
