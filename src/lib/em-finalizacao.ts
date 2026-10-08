/**
 * Telas ainda em finalização: enquanto o módulo estiver `true` aqui, só
 * a gestão (diretor e gerente) vê o menu e consegue entrar. Para liberar
 * para a equipe, basta trocar para `false` — as permissões normais de
 * cada módulo voltam a valer sozinhas.
 */
export const EM_FINALIZACAO = {
  avaliacoes: true,
  debitos: true,
  termosEntrega: true,
  ferias: true,
  departamentoPessoal: true,
} as const;

export type ModuloEmFinalizacao = keyof typeof EM_FINALIZACAO;

/**
 * Liberação antecipada: além da gestão, estes níveis já entram no módulo
 * mesmo em finalização (as permissões normais do módulo continuam valendo —
 * no Controle de Débitos, o supervisor precisa ter a categoria Locação).
 * "gerente_locacao" é o nome antigo do supervisor da locação.
 */
export const LIBERADO_ANTES: Partial<Record<ModuloEmFinalizacao, readonly string[]>> = {
  debitos: ["supervisor", "gerente_locacao"],
};

export function liberadoParaNivel(modulo: ModuloEmFinalizacao, nivel: string, emFinalizacao: boolean = EM_FINALIZACAO[modulo]): boolean {
  return !emFinalizacao || nivel === "diretor" || nivel === "gerente" || (LIBERADO_ANTES[modulo]?.includes(nivel) ?? false);
}
