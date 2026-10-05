export function identificacaoProcesso(processo: { codigo_san?: string | null; numero_proposta_contrato?: string | null }, categoria: "venda" | "financiamento") {
  if (categoria === "venda") return processo.codigo_san?.trim() ? `SAN ${processo.codigo_san.trim()}` : "Código SAN não informado";
  return processo.numero_proposta_contrato?.trim() ? `Proposta/contrato ${processo.numero_proposta_contrato.trim()}` : "Proposta/contrato não informado";
}
