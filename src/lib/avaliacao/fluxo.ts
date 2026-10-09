import { ETAPAS_EDITOR, type EtapaEditor, type Modalidade } from "./tipos";

const COMERCIAIS = [
  { chave: "dados", rotulo: "Imóvel e cliente" },
  { chave: "comparaveis", rotulo: "Imóveis comparáveis" },
  { chave: "revisao", rotulo: "Laudo e emissão" },
  { chave: "historico", rotulo: "Histórico" },
] as const;

export function etapasDaAvaliacao(modalidade: Modalidade) {
  return modalidade === "estudo_comercial" ? COMERCIAIS : ETAPAS_EDITOR;
}

/** Favoritos e links de validação antigos apontam para a seção agrupada. */
export function etapaDoFluxo(modalidade: Modalidade, etapa: EtapaEditor): EtapaEditor {
  if (modalidade !== "estudo_comercial") return etapa;
  if (["imovel", "vistoria", "localizacao"].includes(etapa)) return "dados";
  if (["preco", "textos"].includes(etapa)) return "revisao";
  return etapa;
}
