import { createClient } from "@/lib/supabase/server";
import {
  adicionarEtapaOnboarding,
  editarEtapaOnboarding,
  removerEtapaOnboarding,
} from "./actions";

interface EtapaRow {
  id: string;
  nome: string;
  descricao: string | null;
  link: string | null;
  ordem: number;
}

export default async function OnboardingCorretorPage() {
  const supabase = await createClient();
  const { data: etapas } = await supabase
    .from("onboarding_etapas")
    .select("id, nome, descricao, link, ordem")
    .order("ordem", { ascending: true });

  const rows = (etapas ?? []) as EtapaRow[];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Onboarding do Corretor</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Checklist de primeiros passos que aparece na aba Corretor. Cada item pode ter um link
          que leva direto pra tela certa.
        </p>
      </div>

      <form
        action={adicionarEtapaOnboarding}
        className="space-y-3 rounded-xl border border-border/60 bg-surface shadow-sm p-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Novo passo</p>
        <input
          name="nome"
          required
          placeholder="Nome do passo"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        <textarea
          name="descricao"
          rows={2}
          placeholder="Descrição (opcional)"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        <input
          name="link"
          placeholder="Link (opcional, ex: /termos-visita)"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Adicionar
        </button>
      </form>

      <div className="rounded-xl border border-border/60 bg-surface shadow-sm">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-ink-muted">Nenhum passo cadastrado.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((e) => (
              <li key={e.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{e.nome}</p>
                    {e.descricao && <p className="text-xs text-ink-muted">{e.descricao}</p>}
                    {e.link && <p className="text-xs text-brand">{e.link}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <details key={`${e.id}-${e.nome}-${e.descricao}-${e.link}`} className="relative">
                      <summary className="cursor-pointer list-none rounded-md p-1.5 text-ink-muted hover:bg-background">
                        ✎
                      </summary>
                      <form
                        action={editarEtapaOnboarding}
                        className="absolute right-0 z-10 mt-1 w-72 space-y-2 rounded-md border border-border bg-surface p-3 shadow-md"
                      >
                        <input type="hidden" name="id" value={e.id} />
                        <input
                          name="nome"
                          defaultValue={e.nome}
                          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                        />
                        <textarea
                          name="descricao"
                          rows={2}
                          defaultValue={e.descricao ?? ""}
                          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                        />
                        <input
                          name="link"
                          defaultValue={e.link ?? ""}
                          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                        />
                        <button
                          type="submit"
                          className="w-full rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-white hover:opacity-90"
                        >
                          Salvar
                        </button>
                      </form>
                    </details>
                    <form action={removerEtapaOnboarding}>
                      <input type="hidden" name="id" value={e.id} />
                      <button
                        type="submit"
                        aria-label={`Remover ${e.nome}`}
                        className="rounded-md p-1.5 text-ink-muted hover:bg-background hover:text-rose-600"
                      >
                        🗑
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
