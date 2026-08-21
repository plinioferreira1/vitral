import { createClient } from "@/lib/supabase/server";
import {
  criarChecklist,
  editarChecklist,
  removerChecklist,
  criarGrupo,
  editarGrupo,
  removerGrupo,
  criarItem,
  editarItem,
  removerItem,
} from "./actions";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";

interface Item {
  id: string;
  texto: string;
  ordem: number;
}
interface Grupo {
  id: string;
  nome: string;
  observacao: string | null;
  ordem: number;
  checklist_grupo_itens: Item[];
}
interface Checklist {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  checklist_grupos: Grupo[];
}

export default async function ChecklistsFinanciamentoPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("checklists_modelo")
    .select(
      "id, nome, descricao, ordem, checklist_grupos ( id, nome, observacao, ordem, checklist_grupo_itens ( id, texto, ordem ) )"
    )
    .eq("categoria", "financiamento")
    .order("ordem", { ascending: true });

  const checklists = ((data ?? []) as unknown as Checklist[]).map((c) => ({
    ...c,
    checklist_grupos: [...c.checklist_grupos]
      .sort((a, b) => a.ordem - b.ordem)
      .map((g) => ({
        ...g,
        checklist_grupo_itens: [...g.checklist_grupo_itens].sort((a, b) => a.ordem - b.ordem),
      })),
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Checklists de Financiamento</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Crie quantos checklists quiser (ex: Conformidade, Assinatura E-notariado). Cada um pode
          ter várias seções, e cada seção seus próprios itens. Aparece na aba Checklists de
          Financiamentos.
        </p>
      </div>

      <form
        action={criarChecklist}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border/60 bg-surface p-4 shadow-sm"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Nome do checklist</label>
          <input
            name="nome"
            required
            placeholder="Ex: Checklist de Conformidade"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-ink-muted">Descrição (opcional)</label>
          <input
            name="descricao"
            placeholder="Uma linha explicando pra que serve"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Novo checklist
        </button>
      </form>

      <div className="space-y-4">
        {checklists.length === 0 ? (
          <p className="rounded-xl border border-border/60 bg-surface p-6 text-center text-sm text-ink-muted shadow-sm">
            Nenhum checklist criado ainda.
          </p>
        ) : (
          checklists.map((checklist) => (
            <div key={checklist.id} className="rounded-xl border border-border/60 bg-surface shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-border p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{checklist.nome}</p>
                  {checklist.descricao && <p className="mt-0.5 text-xs text-ink-muted">{checklist.descricao}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <details key={`edita-${checklist.id}-${checklist.nome}-${checklist.descricao}`} className="relative">
                    <summary className="cursor-pointer list-none rounded-md p-1.5 text-xs text-ink-muted hover:bg-background">
                      Editar
                    </summary>
                    <form
                      action={editarChecklist}
                      className="absolute right-0 z-10 mt-1 w-72 space-y-2 rounded-md border border-border bg-surface p-3 shadow-md"
                    >
                      <input type="hidden" name="id" value={checklist.id} />
                      <input
                        name="nome"
                        defaultValue={checklist.nome}
                        className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                      />
                      <input
                        name="descricao"
                        defaultValue={checklist.descricao ?? ""}
                        placeholder="Descrição"
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
                  <form action={removerChecklist}>
                    <input type="hidden" name="id" value={checklist.id} />
                    <BotaoComConfirmacao
                      mensagem={`Apagar o checklist "${checklist.nome}" inteiro, com todas as seções e itens? Essa ação não pode ser desfeita.`}
                      className="rounded-md p-1.5 text-xs text-ink-muted hover:bg-background hover:text-rose-600"
                    >
                      Apagar
                    </BotaoComConfirmacao>
                  </form>
                </div>
              </div>

              <div className="space-y-3 p-4">
                {checklist.checklist_grupos.map((grupo) => (
                  <div key={grupo.id} className="rounded-lg border border-border/60 bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">{grupo.nome}</p>
                        {grupo.observacao && <p className="text-xs text-ink-muted">{grupo.observacao}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <details
                          key={`edita-grupo-${grupo.id}-${grupo.nome}-${grupo.observacao}`}
                          className="relative"
                        >
                          <summary className="cursor-pointer list-none rounded-md p-1 text-xs text-ink-muted hover:bg-surface">
                            ✎
                          </summary>
                          <form
                            action={editarGrupo}
                            className="absolute right-0 z-10 mt-1 w-64 space-y-2 rounded-md border border-border bg-surface p-3 shadow-md"
                          >
                            <input type="hidden" name="id" value={grupo.id} />
                            <input
                              name="nome"
                              defaultValue={grupo.nome}
                              className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                            />
                            <input
                              name="observacao"
                              defaultValue={grupo.observacao ?? ""}
                              placeholder="Observação (opcional)"
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
                        <form action={removerGrupo}>
                          <input type="hidden" name="id" value={grupo.id} />
                          <BotaoComConfirmacao
                            mensagem={`Apagar a seção "${grupo.nome}" e todos os itens dela?`}
                            className="rounded-md p-1 text-xs text-ink-muted hover:bg-surface hover:text-rose-600"
                          >
                            🗑
                          </BotaoComConfirmacao>
                        </form>
                      </div>
                    </div>

                    <ul className="mt-2 space-y-1">
                      {grupo.checklist_grupo_itens.map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-2 text-sm text-ink">
                          <span>{item.texto}</span>
                          <div className="flex shrink-0 items-center gap-1">
                            <details key={`edita-item-${item.id}-${item.texto}`} className="relative">
                              <summary className="cursor-pointer list-none rounded-md p-1 text-xs text-ink-muted hover:bg-surface">
                                ✎
                              </summary>
                              <form
                                action={editarItem}
                                className="absolute right-0 z-10 mt-1 w-64 space-y-2 rounded-md border border-border bg-surface p-3 shadow-md"
                              >
                                <input type="hidden" name="id" value={item.id} />
                                <input
                                  name="texto"
                                  defaultValue={item.texto}
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
                            <form action={removerItem}>
                              <input type="hidden" name="id" value={item.id} />
                              <button
                                type="submit"
                                aria-label={`Remover ${item.texto}`}
                                className="rounded-md p-1 text-xs text-ink-muted hover:bg-surface hover:text-rose-600"
                              >
                                🗑
                              </button>
                            </form>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <form action={criarItem} className="mt-2 flex gap-1.5">
                      <input type="hidden" name="grupo_id" value={grupo.id} />
                      <input
                        name="texto"
                        placeholder="+ Novo item"
                        className="w-full rounded-md border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-brand"
                      />
                      <button
                        type="submit"
                        className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-ink-muted hover:bg-surface"
                      >
                        Adicionar
                      </button>
                    </form>
                  </div>
                ))}

                <form
                  action={criarGrupo}
                  className="flex gap-1.5 rounded-lg border border-dashed border-border p-3"
                >
                  <input type="hidden" name="checklist_id" value={checklist.id} />
                  <input
                    name="nome"
                    placeholder="+ Nova seção (ex: Compradores)"
                    className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs text-ink-muted hover:bg-background"
                  >
                    Adicionar seção
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
