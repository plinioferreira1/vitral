/**
 * Garantia locatícia de cada contrato e controle das cauções em dinheiro
 * (valor contratual previsto, até conferência dos depósitos). Funções puras.
 */

export const GARANTIAS_LOCACAO = [
  "Caução",
  "Fiador",
  "Seguro Fiança (Loft)",
  "CredPago",
  "CredAluga",
  "Garantia Investe (Loft)",
  "Título de Capitalização (Brasilcap)",
  "Seguro Fiança (outra seguradora)",
  "Sem garantia",
] as const;
export type GarantiaLocacao = (typeof GARANTIAS_LOCACAO)[number];

export const CAUCAO: GarantiaLocacao = "Caução";

/** Valor vindo do formulário → garantia da lista, ou null (vazio/desconhecido). */
export function garantiaDaLista(valor: unknown): GarantiaLocacao | null {
  const texto = typeof valor === "string" ? valor.trim() : "";
  return (GARANTIAS_LOCACAO as readonly string[]).includes(texto) ? (texto as GarantiaLocacao) : null;
}

/** "3.700,00" / "3700.00" / 3700 → centavos inteiros; null se vazio ou inválido. */
export function reaisParaCentavos(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const texto = typeof valor === "number" ? String(valor) : String(valor).trim();
  const normal = /,\d{1,2}$/.test(texto) ? texto.replace(/\./g, "").replace(",", ".") : texto.replace(/,/g, "");
  const n = Number(normal);
  if (!Number.isFinite(n) || n < 0 || n > 100_000_000) return null;
  return Math.round(n * 100);
}

/** O que gravar: o valor da caução só existe quando a garantia é caução. */
export function dadosGarantia(garantia: unknown, valorCaucao: unknown): { garantia_locaticia: GarantiaLocacao | null; caucao_valor_centavos: number | null } {
  const g = garantiaDaLista(garantia);
  return { garantia_locaticia: g, caucao_valor_centavos: g === CAUCAO ? reaisParaCentavos(valorCaucao) : null };
}

export type ContratoCaucao = {
  id: string;
  ativo: boolean;
  garantia_locaticia: string | null;
  caucao_valor_centavos: number | null;
};

/** Total de cauções contratuais ativas; não comprova que cada valor foi depositado. Sem valor informado fica em pendência. */
export function resumoCaucoes<T extends ContratoCaucao>(contratos: T[]) {
  const comCaucao = contratos.filter((c) => c.garantia_locaticia === CAUCAO);
  const ativos = comCaucao.filter((c) => c.ativo);
  const comValor = ativos.filter((c) => c.caucao_valor_centavos !== null && c.caucao_valor_centavos > 0);
  return {
    totalCentavos: comValor.reduce((s, c) => s + (c.caucao_valor_centavos ?? 0), 0),
    ativos,
    semValor: ativos.filter((c) => !(c.caucao_valor_centavos && c.caucao_valor_centavos > 0)),
    encerrados: comCaucao.filter((c) => !c.ativo),
  };
}
