import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { ordenarChecklists, progresso, progressoChecklist, type ChecklistModelo } from "@/lib/checklists/progresso";
import { createClient } from "@/lib/supabase/server";
import { marcarItemChecklist } from "./checklist-actions";

type Linha = {
  id: string; nome: string; descricao: string | null; ordem: number;
  checklist_grupos: { id: string; nome: string; observacao: string | null; ordem: number; checklist_grupo_itens: { id: string; texto: string; ordem: number }[] }[];
};

function Caixa({ marcado }: { marcado: boolean }) {
  return (
    <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border ${marcado ? "border-brand bg-brand text-white" : "border-border-strong bg-surface"}`}>
      {marcado && (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

const dataHora = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** Checklists de financiamento (ex.: Conformidade) marcados neste processo. */
export async function ChecklistProcesso({ processoId }: { processoId: string }) {
  const supabase = await createClient();
  const [{ data: modelos }, { data: marcas }] = await Promise.all([
    supabase
      .from("checklists_modelo")
      .select("id, nome, descricao, ordem, checklist_grupos ( id, nome, observacao, ordem, checklist_grupo_itens ( id, texto, ordem ) )")
      .eq("categoria", "financiamento"),
    supabase.from("processo_checklist_marcas").select("item_id, marcado_em, usuarios ( nome )").eq("processo_id", processoId),
  ]);
  const checklists = ordenarChecklists(((modelos ?? []) as unknown as Linha[]).map((m): ChecklistModelo => ({
    id: m.id, nome: m.nome, descricao: m.descricao, ordem: m.ordem,
    grupos: m.checklist_grupos.map((g) => ({ id: g.id, nome: g.nome, observacao: g.observacao, ordem: g.ordem, itens: g.checklist_grupo_itens })),
  })));
  const porItem = new Map((marcas ?? []).map((m) => [m.item_id, m]));
  const marcados = new Set(porItem.keys());

  if (checklists.length === 0) {
    return (
      <section id="checklist-processo" className="scroll-mt-20 rounded-xl border border-border/70 bg-surface p-4 text-sm text-ink-muted shadow-sm sm:p-5">
        Nenhum checklist de financiamento montado. Crie os itens em <Link href="/checklists-financiamento" className="font-medium text-brand hover:underline">Modelos de checklist</Link>.
      </section>
    );
  }

  return (
    <div id="checklist-processo" className="scroll-mt-20 space-y-4">
      {checklists.map((c) => {
        const geral = progressoChecklist(c, marcados);
        return (
          <details key={c.id} open={!geral.completo} className="group rounded-xl border border-border/70 bg-surface shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><ClipboardCheck className="h-4 w-4 text-brand" aria-hidden /> {c.nome}</h2>
                <p className="mt-1 text-xs text-ink-muted tabular-nums">
                  {geral.completo ? "Tudo conferido" : `${geral.feitos} de ${geral.total} conferidos`}
                </p>
                <div className="mt-2 h-1.5 w-48 max-w-full overflow-hidden rounded-full bg-background" aria-hidden>
                  <div className={`h-full rounded-full ${geral.completo ? "bg-emerald-600" : "bg-brand"}`} style={{ width: `${geral.percentual}%` }} />
                </div>
              </div>
              <span className="text-xs font-semibold text-brand group-open:hidden">Abrir</span>
              <span className="hidden text-xs font-semibold text-brand group-open:inline">Fechar</span>
            </summary>
            <div className="border-t border-border/70 p-4 sm:p-5">
              {c.descricao && <p className="mb-4 text-xs text-ink-muted">{c.descricao}</p>}
              <div className="grid min-w-0 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {c.grupos.filter((g) => g.itens.length > 0).map((g) => {
                  const pg = progresso(g.itens, marcados);
                  return (
                    <section key={g.id} className="min-w-0 rounded-lg border border-border/70">
                      <header className="border-b border-border/70 bg-background/60 px-3 py-2.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-sm font-semibold text-ink">{g.nome}</h3>
                          <span className={`text-xs tabular-nums ${pg.completo ? "font-semibold text-emerald-700" : "text-ink-muted"}`}>{pg.feitos}/{pg.total}</span>
                        </div>
                        {g.observacao && <p className="mt-0.5 text-xs text-ink-muted">{g.observacao}</p>}
                      </header>
                      <ul className="divide-y divide-border/50 px-3">
                        {g.itens.map((i) => {
                          const m = porItem.get(i.id);
                          const quem = (m?.usuarios as { nome: string } | null)?.nome;
                          return (
                            <li key={i.id}>
                              <form action={marcarItemChecklist}>
                                <input type="hidden" name="processo_id" value={processoId} />
                                <input type="hidden" name="item_id" value={i.id} />
                                <input type="hidden" name="marcar" value={m ? "0" : "1"} />
                                <BotaoEnviar aria-pressed={!!m} className="flex min-h-11 w-full items-start gap-3 py-2.5 text-left">
                                  <span className="mt-0.5"><Caixa marcado={!!m} /></span>
                                  <span className="min-w-0">
                                    <span className={`block text-sm ${m ? "text-ink-muted line-through decoration-ink-muted/40" : "text-ink"}`}>{i.texto}</span>
                                    {m && <span className="block text-xs text-ink-muted">{quem ? `${quem.split(" ")[0]} · ` : ""}{dataHora(m.marcado_em)}</span>}
                                  </span>
                                </BotaoEnviar>
                              </form>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-ink-muted">
                Os itens vêm do modelo em <Link href="/checklists-financiamento" className="font-medium text-brand hover:underline">Modelos de checklist</Link>; uma mudança lá vale para todos os processos.
              </p>
            </div>
          </details>
        );
      })}
    </div>
  );
}
