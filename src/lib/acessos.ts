import { montarMenu } from "./menu";
import { liberadoParaNivel } from "./em-finalizacao";
import { permissoesDP } from "./dp/ponto";
import { NIVEL_ACESSO_LABEL, type CategoriaProcesso } from "./types";
import type { Database } from "./database.types";
export type NivelAcesso = Database["public"]["Enums"]["nivel_acesso_usuario"];
export const rotuloNivel = (nivel: NivelAcesso) =>
  nivel === "gerente_locacao"
    ? "Supervisor (legado)"
    : NIVEL_ACESSO_LABEL[nivel];

export const NIVEIS: NivelAcesso[] = [
  "diretor",
  "gerente",
  "supervisor",
  "auxiliar",
  "corretor",
  "social_media",
];
export const CATEGORIAS: CategoriaProcesso[] = [
  "venda",
  "financiamento",
  "locacao",
  "marketing",
];
export const PERFIS = [
  ["admin", "Administrador"],
  ["diretora", "Diretora"],
  ["gerente", "Gerente"],
  ["corretor", "Corretor"],
  ["correspondente", "Correspondente"],
  ["financeiro", "Financeiro"],
] as const;

/** A mesma regra do menu, sem conceder permissões novas pela interface. */
export function areasDoUsuario(
  nivel: NivelAcesso,
  categorias: readonly CategoriaProcesso[],
) {
  const total = ["diretor", "gerente", "auxiliar"].includes(nivel);
  return montarMenu({
    ehCorretor: nivel === "corretor",
    ehSocialMedia: nivel === "social_media",
    nivelComAcessoTotal: total,
    podeConfigurar: ["diretor", "gerente"].includes(nivel),
    temVenda: total || categorias.includes("venda"),
    temFinanciamento: total || categorias.includes("financiamento"),
    temLocacao: total || categorias.includes("locacao"),
  })
    .filter((item) => "children" in item)
    .map((item) => item.label);
}

export function resumoDP(
  nivel: NivelAcesso,
  temFicha: boolean,
  subordinados: number,
) {
  if (!liberadoParaNivel("departamentoPessoal", nivel))
    return "Aguardando liberação do módulo para a equipe";
  const p = permissoesDP(nivel, temFicha, subordinados);
  if (p.administrador) return "Administração do DP";
  if (p.gestorDeEquipe) return "Própria ficha e equipe subordinada";
  return p.colaborador
    ? "Própria ficha, férias e ponto"
    : "Sem ficha vinculada";
}

export function descricaoAcesso(nivel: NivelAcesso) {
  if (nivel === "diretor" || nivel === "gerente")
    return "Todas as áreas, incluindo Financeiro, Configurações e administração do DP.";
  if (nivel === "auxiliar")
    return "Áreas operacionais, sem Financeiro e Configurações administrativas.";
  if (nivel === "supervisor" || nivel === "gerente_locacao")
    return "Áreas operacionais conforme as categorias selecionadas.";
  if (nivel === "corretor")
    return "Documentos, ferramentas comerciais e Central de ajuda.";
  return "Ferramentas e Central de ajuda.";
}

export const normalizarBusca = (valor: string) =>
  valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
