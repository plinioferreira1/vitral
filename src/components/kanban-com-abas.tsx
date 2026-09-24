"use client";

import { useState } from "react";
import { KanbanProcessos, type CardKanban } from "@/components/kanban-processos";

interface Quadro {
  id: string;
  titulo: string;
  total: number;
  colunas: string[];
  cards: CardKanban[];
}

export function KanbanComAbas({ quadros }: { quadros: Quadro[] }) {
  const [ativoId, setAtivoId] = useState(quadros[0]?.id);
  const ativo = quadros.find((q) => q.id === ativoId) ?? quadros[0];

  if (!ativo) return null;

  return (
    <div>
      {quadros.length > 1 && (
        <div className="mb-3 flex gap-1 rounded-lg bg-background p-1 text-sm w-fit">
          {quadros.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setAtivoId(q.id)}
              className={`rounded-md px-4 py-1.5 font-semibold uppercase tracking-wide text-xs transition ${
                ativo.id === q.id ? "bg-surface text-brand shadow-sm" : "text-ink-muted"
              }`}
            >
              {q.titulo} ({q.total})
            </button>
          ))}
        </div>
      )}
      <KanbanProcessos colunas={ativo.colunas} cards={ativo.cards} />
    </div>
  );
}
