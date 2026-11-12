import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { alternarEtapaOnboarding } from "./actions";
import { CentralAjuda } from "@/components/central-ajuda";
import { GUIAS_FIXOS } from "@/lib/ajuda/guias";
import { tutorialParaTopico } from "@/lib/ajuda/topicos";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";

export default async function CorretorPage() {
  const supabase = await createClient();
  const { user } = await getUsuarioAtual();

  const [{ data: etapas }, { data: statusRaw }, { data: tutoriais }] = await Promise.all([
    supabase
      .from("onboarding_etapas")
      .select("id, nome, descricao, link, ordem")
      .order("ordem", { ascending: true }),
    supabase
      .from("onboarding_status")
      .select("id, etapa_id, concluida")
      .eq("usuario_id", user?.id ?? ""),
    supabase
      .from("tutoriais")
      .select("id, categoria, tipo, titulo, descricao, conteudo, link, ordem")
      .order("categoria", { ascending: true })
      .order("ordem", { ascending: true }),
  ]);

  const statusPorEtapa = new Map((statusRaw ?? []).map((s) => [s.etapa_id, s]));
  const total = etapas?.length ?? 0;
  const concluidas = (etapas ?? []).filter((e) => statusPorEtapa.get(e.id)?.concluida).length;
  const topicos = [...(tutoriais ?? []).map(tutorialParaTopico), ...GUIAS_FIXOS];

  return (
    <div className="w-full min-w-0 space-y-6">
      <CabecalhoPagina titulo="Central de ajuda" descricao="Busque tutoriais, guias, modelos de mensagem e documentos." />

      {total > 0 && (
        <details open={concluidas < total} className="group rounded-xl border border-border/60 bg-surface shadow-sm">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Sparkles size={18} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink">
                Primeiros passos {concluidas === total && "concluídos"}
              </span>
              <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-background">
                <span
                  className="block h-full rounded-full bg-brand transition-all"
                  style={{ width: `${(concluidas / total) * 100}%` }}
                />
              </span>
            </span>
            <span className="shrink-0 text-xs text-ink-muted">
              {concluidas} de {total}
            </span>
            <ChevronDown size={18} aria-hidden className="shrink-0 text-ink-muted transition group-open:rotate-180" />
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {(etapas ?? []).map((e) => {
              const status = statusPorEtapa.get(e.id);
              const concluida = status?.concluida ?? false;
              return (
                <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                  <form action={alternarEtapaOnboarding} className="shrink-0">
                    <input type="hidden" name="etapa_id" value={e.id} />
                    <input type="hidden" name="concluida_atual" value={String(concluida)} />
                    {status && <input type="hidden" name="status_id" value={status.id} />}
                    <BotaoEnviar
                      className="-m-3 flex h-11 w-11 items-center justify-center"
                      aria-label={`Marcar ${e.nome} como ${concluida ? "não concluído" : "concluído"}`}
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded border ${
                          concluida ? "border-brand bg-brand text-white" : "border-border-strong bg-surface"
                        }`}
                      >
                        {concluida && <Check size={12} strokeWidth={3} />}
                      </span>
                    </BotaoEnviar>
                  </form>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${concluida ? "text-ink-muted line-through" : "text-ink"}`}>{e.nome}</p>
                    {e.descricao && <p className="mt-0.5 text-sm text-ink-muted">{e.descricao}</p>}
                    {e.link && (
                      <Link href={e.link} className="mt-1.5 inline-block text-xs font-medium text-brand hover:underline">
                        Ir agora →
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <CentralAjuda topicos={topicos} />
    </div>
  );
}
