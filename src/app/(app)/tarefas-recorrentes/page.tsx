import { createClient } from "@/lib/supabase/server";
import {
  adicionarTarefaRecorrente,
  editarTarefaRecorrente,
  removerTarefaRecorrente,
} from "./actions";

interface TarefaRow {
  id: string;
  nome: string;
  regra: string | null;
  tipo_regra: string;
  dia_fixo: number | null;
  periodicidade: string;
  ordem: number;
}

const TIPO_REGRA_LABEL: Record<string, string> = {
  primeiro_dia_util: "1º dia útil do mês",
  dia_fixo: "Dia fixo do mês",
  toda_segunda: "Toda segunda-feira",
  primeira_segunda: "Primeira segunda-feira do mês",
};

export default async function TarefasRecorrentesPage() {
  const supabase = await createClient();
  const { data: tarefas } = await supabase
    .from("tarefas_mensais")
    .select("id, nome, regra, tipo_regra, dia_fixo, periodicidade, ordem")
    .order("ordem", { ascending: true });

  const rows = (tarefas ?? []) as TarefaRow[];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Tarefas recorrentes</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Aparecem na aba Resumo de Locação e no Calendário, recalculadas automaticamente todo
          mês — não precisa recadastrar.
        </p>
      </div>

      <form
        action={adicionarTarefaRecorrente}
        className="space-y-3 rounded-xl border border-border/60 bg-surface shadow-sm p-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Nova tarefa
        </p>
        <input
          name="nome"
          required
          placeholder="Nome da tarefa"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        <div className="flex flex-wrap items-center gap-2">
          <SeletorRegra />
          <button
            type="submit"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Adicionar
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-border/60 bg-surface shadow-sm">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-ink-muted">Nenhuma tarefa cadastrada.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((t) => (
              <li key={t.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-ink">{t.nome}</p>
                    <p className="text-xs text-ink-muted">
                      {TIPO_REGRA_LABEL[t.tipo_regra]}
                      {t.tipo_regra === "dia_fixo" && t.dia_fixo ? ` (dia ${t.dia_fixo})` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <details key={`${t.id}-${t.nome}-${t.tipo_regra}-${t.dia_fixo}`} className="relative">
                      <summary className="cursor-pointer list-none rounded-md p-1.5 text-ink-muted hover:bg-background">
                        ✎
                      </summary>
                      <form
                        action={editarTarefaRecorrente}
                        className="absolute right-0 z-10 mt-1 w-72 space-y-2 rounded-md border border-border bg-surface p-3 shadow-md"
                      >
                        <input type="hidden" name="id" value={t.id} />
                        <input
                          name="nome"
                          defaultValue={t.nome}
                          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                        />
                        <SeletorRegra tipoAtual={t.tipo_regra} diaFixoAtual={t.dia_fixo} />
                        <button
                          type="submit"
                          className="w-full rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-white hover:opacity-90"
                        >
                          Salvar
                        </button>
                      </form>
                    </details>
                    <form action={removerTarefaRecorrente}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        aria-label={`Remover ${t.nome}`}
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

function SeletorRegra({
  tipoAtual,
  diaFixoAtual,
}: {
  tipoAtual?: string;
  diaFixoAtual?: number | null;
}) {
  return (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      <select
        name="tipo_regra"
        defaultValue={tipoAtual ?? "primeiro_dia_util"}
        className="rounded-md border border-border bg-surface px-2 py-2 text-xs outline-none focus:border-brand"
      >
        <option value="primeiro_dia_util">1º dia útil do mês</option>
        <option value="dia_fixo">Dia fixo do mês</option>
        <option value="toda_segunda">Toda segunda-feira</option>
        <option value="primeira_segunda">Primeira segunda-feira do mês</option>
      </select>
      <input
        name="dia_fixo"
        type="number"
        min={1}
        max={31}
        defaultValue={diaFixoAtual ?? undefined}
        placeholder="Dia (se fixo)"
        className="w-28 rounded-md border border-border bg-surface px-2 py-2 text-xs outline-none focus:border-brand"
      />
    </div>
  );
}
