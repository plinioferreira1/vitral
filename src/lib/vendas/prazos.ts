/**
 * Prazos padrão das etapas de venda (funções puras).
 * Trâmites Bancários: 30 dias depois da assinatura do contrato.
 */
export const DIAS_TRAMITES_APOS_ASSINATURA = 30;

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function ehTramitesBancarios(nome: string): boolean {
  return semAcento(nome) === "tramites bancarios";
}

function somarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Prazo padrão da etapa a partir da assinatura, ou null se a etapa não tem padrão ou falta a assinatura. */
export function prazoPadraoEtapa(nomeEtapa: string, dataAssinatura: string | null | undefined): string | null {
  if (!dataAssinatura || !/^\d{4}-\d{2}-\d{2}$/.test(dataAssinatura)) return null;
  if (ehTramitesBancarios(nomeEtapa)) return somarDias(dataAssinatura, DIAS_TRAMITES_APOS_ASSINATURA);
  return null;
}

/**
 * Quando a assinatura muda: recalcula o prazo de uma etapa pendente se ele
 * estava vazio ou ainda era o padrão da assinatura anterior. Prazo ajustado à
 * mão depois é mantido.
 */
export function novoPrazoAoMudarAssinatura(
  nomeEtapa: string,
  prazoAtual: string | null,
  assinaturaAnterior: string | null,
  assinaturaNova: string | null,
): string | null | undefined {
  const novo = prazoPadraoEtapa(nomeEtapa, assinaturaNova);
  if (novo === null || novo === prazoAtual) return undefined;
  if (prazoAtual === null || prazoAtual === prazoPadraoEtapa(nomeEtapa, assinaturaAnterior)) return novo;
  return undefined;
}
