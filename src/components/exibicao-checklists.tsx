"use client";

import { useState } from "react";

interface Item {
  id: string;
  texto: string;
}
interface Grupo {
  id: string;
  nome: string;
  observacao: string | null;
  checklist_grupo_itens: Item[];
}
export interface ChecklistExibicao {
  id: string;
  nome: string;
  descricao: string | null;
  checklist_grupos: Grupo[];
}

export function ExibicaoChecklists({ checklists }: { checklists: ChecklistExibicao[] }) {
  const [selecionadoId, setSelecionadoId] = useState(checklists[0]?.id ?? "");

  if (checklists.length === 0) {
    return (
      <p className="rounded-xl border border-border/60 bg-surface p-8 text-center text-sm text-ink-muted shadow-sm">
        Nenhum checklist criado ainda. Configure em Configurações → Checklists de Financiamento.
      </p>
    );
  }

  const selecionado = checklists.find((c) => c.id === selecionadoId) ?? checklists[0];

  return (
    <div className="space-y-6">
      {checklists.length > 1 && (
        <div className="flex flex-wrap gap-1 rounded-lg bg-background p-1 text-sm w-fit">
          {checklists.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelecionadoId(c.id)}
              className={`rounded-md px-4 py-1.5 text-center font-medium transition ${
                selecionado.id === c.id ? "bg-surface shadow-sm text-ink" : "text-ink-muted"
              }`}
            >
              {c.nome}
            </button>
          ))}
        </div>
      )}

      <div className="max-w-2xl space-y-6">
        {selecionado.descricao && <p className="text-sm text-ink-muted">{selecionado.descricao}</p>}

        {selecionado.checklist_grupos.length === 0 ? (
          <p className="rounded-xl border border-border/60 bg-surface p-6 text-center text-sm text-ink-muted shadow-sm">
            Esse checklist ainda não tem seções configuradas.
          </p>
        ) : (
          selecionado.checklist_grupos.map((grupo) => (
            <div key={grupo.id}>
              <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
                <p className="mb-3 text-sm font-semibold text-ink">{grupo.nome}</p>
                <ul className="space-y-2">
                  {grupo.checklist_grupo_itens.map((item, i) => (
                    <li key={item.id} className="flex items-start gap-2 text-sm text-ink">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-[11px] text-ink-muted">
                        {i + 1}
                      </span>
                      {item.texto}
                    </li>
                  ))}
                </ul>
              </div>
              {grupo.observacao && <p className="mt-1.5 text-xs text-ink-muted">{grupo.observacao}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
