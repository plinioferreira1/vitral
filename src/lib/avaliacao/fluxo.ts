import { ETAPAS_EDITOR, type EtapaEditor, type Modalidade } from "./tipos";

const COMERCIAIS = [
  { chave: "dados", rotulo: "Imóvel e cliente" },
  { chave: "comparaveis", rotulo: "Pesquisa de mercado" },
  { chave: "preco", rotulo: "Estimativa de preço" },
  { chave: "textos", rotulo: "Relatório para o cliente" },
  { chave: "revisao", rotulo: "Revisar e emitir" },
  { chave: "historico", rotulo: "Histórico" },
] as const;

export function etapasDaAvaliacao(modalidade: Modalidade) {
  return modalidade === "estudo_comercial" ? COMERCIAIS : ETAPAS_EDITOR;
}

/** Favoritos e links de validação antigos apontam para a seção agrupada. */
export function etapaDoFluxo(modalidade: Modalidade, etapa: EtapaEditor): EtapaEditor {
  return modalidade === "estudo_comercial" && ["imovel", "vistoria", "localizacao"].includes(etapa) ? "dados" : etapa;
}
