/**
 * Conteúdo de uma avaliação num formato único: é o que a prévia mostra,
 * o que o PDF imprime, o que a aprovação "carimba" (hash) e o que fica
 * guardado, imutável, em cada versão emitida.
 */

import { createHash } from "node:crypto";
import { calcularAvaliacao, type ResultadoCalculo } from "./calculo";
import type {
  ArquivoAvaliacao,
  AvaliacaoBase,
  Comparavel,
  DadosAvaliacao,
  Finalidade,
  Limiares,
  Modalidade,
  Responsavel,
  Tipologia,
} from "./tipos";

export type ConteudoAvaliacao = {
  codigo: string;
  modalidade: Modalidade;
  finalidade: Finalidade;
  tipologia: Tipologia;
  titulo: string;
  proprietario_nome: string | null;
  bairro: string | null;
  cidade: string | null;
  data_base: string | null;
  area_m2: number | null;
  dados: DadosAvaliacao;
  comparaveis: Comparavel[];
  arquivos: ArquivoAvaliacao[];
  precificacao: {
    valor_calculado: number | null;
    faixa_min: number | null;
    faixa_max: number | null;
    faixa_manual: boolean;
    valor_sugerido: number | null;
    margem_negociacao_pct: number | null;
    valor_proprietario: number | null;
    justificativa_valor: string | null;
    justificativa_faixa: string | null;
  };
  responsavel: Responsavel;
  limiares: Limiares;
  calculo: ResultadoCalculo;
};

export function montarConteudo(entrada: {
  avaliacao: AvaliacaoBase;
  comparaveis: Comparavel[];
  arquivos: ArquivoAvaliacao[];
  responsavel: Responsavel;
  limiares: Limiares;
}): ConteudoAvaliacao {
  const { avaliacao: a } = entrada;
  const comparaveis = [...entrada.comparaveis].sort((x, y) => x.ordem - y.ordem);
  const calculo = calcularAvaliacao(comparaveis, a.finalidade, a.area_m2);
  return {
    codigo: a.codigo,
    modalidade: a.modalidade,
    finalidade: a.finalidade,
    tipologia: a.tipologia,
    titulo: a.titulo,
    proprietario_nome: a.proprietario_nome,
    bairro: a.bairro,
    cidade: a.cidade,
    data_base: a.data_base,
    area_m2: a.area_m2,
    dados: a.dados ?? {},
    comparaveis,
    arquivos: [...entrada.arquivos].sort((x, y) => x.ordem - y.ordem),
    precificacao: {
      valor_calculado: calculo.valorCalculado,
      faixa_min: a.faixa_manual ? a.faixa_min : calculo.faixaCalculadaMin,
      faixa_max: a.faixa_manual ? a.faixa_max : calculo.faixaCalculadaMax,
      faixa_manual: a.faixa_manual,
      valor_sugerido: a.valor_sugerido,
      margem_negociacao_pct: a.margem_negociacao_pct,
      valor_proprietario: a.valor_proprietario,
      justificativa_valor: a.dados?.justificativa_valor?.trim() || null,
      justificativa_faixa: a.dados?.justificativa_faixa?.trim() || null,
    },
    responsavel: entrada.responsavel,
    limiares: entrada.limiares,
    calculo,
  };
}

/** JSON com as chaves em ordem — o mesmo conteúdo dá sempre o mesmo texto. */
export function jsonEstavel(valor: unknown): string {
  if (valor === null || valor === undefined) return "null";
  if (typeof valor !== "object") return JSON.stringify(valor) ?? "null";
  if (Array.isArray(valor)) return `[${valor.map(jsonEstavel).join(",")}]`;
  const objeto = valor as Record<string, unknown>;
  const chaves = Object.keys(objeto)
    .filter((k) => objeto[k] !== undefined)
    .sort();
  return `{${chaves.map((k) => `${JSON.stringify(k)}:${jsonEstavel(objeto[k])}`).join(",")}}`;
}

/**
 * Impressão digital do conteúdo. A aprovação guarda este hash; se
 * qualquer dado mudar depois, o hash muda e a emissão é recusada até
 * nova aprovação.
 */
export function hashConteudo(conteudo: ConteudoAvaliacao): string {
  return createHash("sha256").update(jsonEstavel(conteudo)).digest("hex");
}
