/**
 * Permissões do Controle de Débitos, mapeadas sobre o que já existe:
 * - ver: quem tem acesso à Locação;
 * - operar (conferir, enviar solicitações, editar administradoras):
 *   quem tem acesso à Locação e pode editar (não é auxiliar nem corretor);
 * - configurar a automação: diretor e gerente.
 * O banco aplica o mesmo (funções debitos_pode_ver / debitos_pode_operar
 * / usuario_eh_gestor).
 */
export type PermissoesDebitos = { ver: boolean; operar: boolean; configurar: boolean };

export function permissoesDebitos(nivel: string, temLocacao: boolean): PermissoesDebitos {
  return {
    ver: temLocacao,
    operar: temLocacao && nivel !== "auxiliar" && nivel !== "corretor",
    configurar: nivel === "diretor" || nivel === "gerente",
  };
}
