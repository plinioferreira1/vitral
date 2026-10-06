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
} as const;

export type ModuloEmFinalizacao = keyof typeof EM_FINALIZACAO;

export function liberadoParaNivel(modulo: ModuloEmFinalizacao, nivel: string, emFinalizacao: boolean = EM_FINALIZACAO[modulo]): boolean {
  return !emFinalizacao || nivel === "diretor" || nivel === "gerente";
}
