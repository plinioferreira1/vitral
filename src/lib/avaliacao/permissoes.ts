/**
 * Quem pode o quê no módulo de Avaliação. O banco aplica as mesmas
 * regras (funções avaliacao_* e gatilho de transição); isto serve para a
 * tela mostrar só o que a pessoa pode fazer e dar mensagens claras.
 */

import { liberadoParaNivel } from "../em-finalizacao";
import type { Modalidade } from "./tipos";

export type PapelAvaliacao = {
  usuarioId: string;
  nivel: string;
  /** é a avaliadora responsável técnica configurada */
  ehResponsavelTecnica: boolean;
};

const EQUIPE_INTERNA = ["diretor", "gerente", "supervisor", "auxiliar", "gerente_locacao"];

export function podeAcessarModulo(nivel: string): boolean {
  return nivel !== "social_media" && liberadoParaNivel("avaliacoes", nivel);
}

/** Equipe interna vê tudo; corretor só o que criou. */
export function podeVerAvaliacao(papel: PapelAvaliacao, criadoPor: string): boolean {
  return EQUIPE_INTERNA.includes(papel.nivel) || papel.usuarioId === criadoPor;
}

/**
 * PTAM: só a responsável técnica aprova e emite.
 * Estudo comercial: diretor, gerente ou a responsável técnica.
 */
export function podeAprovar(papel: PapelAvaliacao, modalidade: Modalidade): boolean {
  if (papel.ehResponsavelTecnica) return true;
  return modalidade === "estudo_comercial" && (papel.nivel === "diretor" || papel.nivel === "gerente");
}

export function podeConfigurar(papel: PapelAvaliacao): boolean {
  return papel.ehResponsavelTecnica || papel.nivel === "diretor" || papel.nivel === "gerente";
}
