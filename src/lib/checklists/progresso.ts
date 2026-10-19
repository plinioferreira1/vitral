/** Progresso de um checklist de modelo marcado num processo (função pura). */
export type GrupoModelo = { id: string; nome: string; observacao: string | null; ordem: number; itens: { id: string; texto: string; ordem: number }[] };
export type ChecklistModelo = { id: string; nome: string; descricao: string | null; ordem: number; grupos: GrupoModelo[] };

export function ordenarChecklists(lista: ChecklistModelo[]): ChecklistModelo[] {
  return [...lista]
    .sort((a, b) => a.ordem - b.ordem)
    .map((c) => ({
      ...c,
      grupos: [...c.grupos].sort((a, b) => a.ordem - b.ordem).map((g) => ({ ...g, itens: [...g.itens].sort((a, b) => a.ordem - b.ordem) })),
    }))
    // Checklist sem nenhum item (ainda não montado) não aparece no processo.
    .filter((c) => c.grupos.some((g) => g.itens.length > 0));
}

export function progresso(itens: { id: string }[], marcados: ReadonlySet<string>) {
  const total = itens.length;
  const feitos = itens.filter((i) => marcados.has(i.id)).length;
  return { total, feitos, completo: total > 0 && feitos === total, percentual: total ? Math.round((feitos / total) * 100) : 0 };
}

export function progressoChecklist(c: ChecklistModelo, marcados: ReadonlySet<string>) {
  return progresso(c.grupos.flatMap((g) => g.itens), marcados);
}
