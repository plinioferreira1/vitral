import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { alternarEtapaOnboarding } from "./actions";

export default async function CorretorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: etapas } = await supabase
    .from("onboarding_etapas")
    .select("id, nome, descricao, link, ordem")
    .order("ordem", { ascending: true });

  const { data: statusRaw } = await supabase
    .from("onboarding_status")
    .select("id, etapa_id, concluida")
    .eq("usuario_id", user?.id ?? "");

  const statusPorEtapa = new Map((statusRaw ?? []).map((s) => [s.etapa_id, s]));
  const total = etapas?.length ?? 0;
  const concluidas = (etapas ?? []).filter((e) => statusPorEtapa.get(e.id)?.concluida).length;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Corretor</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Primeiros passos pra começar a usar o sistema.
        </p>
      </div>

      {total > 0 && (
        <div className="rounded-xl border border-border/60 bg-surface p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-xs text-ink-muted">
            <span>Progresso</span>
            <span>
              {concluidas} de {total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${total > 0 ? (concluidas / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {(etapas ?? []).length === 0 ? (
          <p className="rounded-xl border border-border/60 bg-surface p-6 text-center text-sm text-ink-muted shadow-sm">
            Nenhum passo cadastrado ainda.
          </p>
        ) : (
          (etapas ?? []).map((e) => {
            const status = statusPorEtapa.get(e.id);
            const concluida = status?.concluida ?? false;
            return (
              <div
                key={e.id}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface p-4 shadow-sm"
              >
                <form action={alternarEtapaOnboarding} className="mt-0.5 shrink-0">
                  <input type="hidden" name="etapa_id" value={e.id} />
                  <input type="hidden" name="concluida_atual" value={String(concluida)} />
                  {status && <input type="hidden" name="status_id" value={status.id} />}
                  <button
                    type="submit"
                    className={`flex h-5 w-5 items-center justify-center rounded border ${
                      concluida ? "border-brand bg-brand text-white" : "border-border-strong bg-surface"
                    }`}
                    aria-label={`Marcar ${e.nome} como ${concluida ? "não concluído" : "concluído"}`}
                  >
                    {concluida && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2 6.5L4.5 9L10 3"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                </form>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${concluida ? "text-ink-muted line-through" : "text-ink"}`}>
                    {e.nome}
                  </p>
                  {e.descricao && <p className="mt-0.5 text-sm text-ink-muted">{e.descricao}</p>}
                  {e.link && (
                    <Link href={e.link} className="mt-1.5 inline-block text-xs font-medium text-brand hover:underline">
                      Ir agora →
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
