/**
 * Decide quais lançamentos de uma série (recorrência/parcelamento) são
 * apagados junto com o lançamento escolhido, conforme a opção marcada na
 * tela de exclusão. Função pura para poder ser testada; datas "AAAA-MM-DD".
 */

export const ESCOPOS_EXCLUSAO = ["um", "nao_vencidos", "em_aberto", "todos"] as const;
export type EscopoExclusao = (typeof ESCOPOS_EXCLUSAO)[number];

export const ROTULO_ESCOPO_EXCLUSAO: Record<EscopoExclusao, string> = {
  um: "Somente o lançamento atual",
  nao_vencidos: "Lançamento atual e todos os não vencidos que não possuam baixas",
  em_aberto: "Lançamento atual e todos os em aberto (vencidos + a vencer) que não possuam baixas",
  todos: "Todos os lançamentos",
};

/** Valida o valor vindo do formulário; qualquer coisa estranha vira "um". */
export function escopoExclusaoValido(valor: unknown): EscopoExclusao {
  const texto = typeof valor === "string" ? valor.trim() : "";
  return (ESCOPOS_EXCLUSAO as readonly string[]).includes(texto) ? (texto as EscopoExclusao) : "um";
}

export type LancamentoDaSerie = {
  id: string;
  vencimento: string;
  status: string;
  /** já tem pagamento/recebimento registrado */
  temBaixa: boolean;
};

/**
 * - "um": só o lançamento atual.
 * - "nao_vencidos": o atual + os da série que vencem de hoje em diante,
 *   ainda pendentes e sem baixa.
 * - "em_aberto": o atual + todos os pendentes sem baixa (vencidos ou não).
 * - "todos": a série inteira, inclusive os já pagos.
 * O lançamento atual sempre entra.
 */
export function idsParaExcluir(
  atualId: string,
  serie: LancamentoDaSerie[],
  escopo: EscopoExclusao,
  hojeIso: string
): string[] {
  const ids = new Set<string>([atualId]);
  if (escopo === "um") return [...ids];

  for (const l of serie) {
    if (escopo === "todos") {
      ids.add(l.id);
      continue;
    }
    const semBaixa = !l.temBaixa && l.status === "pendente";
    if (!semBaixa) continue;
    if (escopo === "em_aberto" || l.vencimento >= hojeIso) ids.add(l.id);
  }
  return [...ids];
}
