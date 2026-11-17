/** Regras únicas do painel, gráfico e exportação de Fonte de Vendas.
 * Registros legados "concluida" são historicamente vendas assinadas,
 * mesmo quando a data de assinatura não foi importada.
 */
export interface ProcessoComercial {
  status: string | null;
  situacao_comercial: string | null;
  data_assinatura: string | null;
  data_venda: string | null;
  mes_venda: string | null;
  data_conclusao: string | null;
  data_criacao: string | null;
}
export interface HistoricoComercial { situacao_comercial: string | null; }

export function mesComercial(v: ProcessoComercial): string {
  return v.mes_venda ?? v.data_venda?.slice(0, 7) ?? v.data_assinatura?.slice(0, 7) ??
    v.data_conclusao?.slice(0, 7) ?? v.data_criacao?.slice(0, 7) ?? "";
}

export function vendaAssinada(v: ProcessoComercial): boolean {
  // Cancelamentos não são conversões válidas para aquisição de clientes.
  if (v.status === "cancelado" || v.status === "arquivado") return false;
  if (v.data_assinatura || v.data_venda) return true;
  // Preserva vendas concluídas já importadas: 21 processos antigos não possuem a data.
  return v.situacao_comercial === "concluida";
}

export function historicoAssinado(v: HistoricoComercial): boolean {
  // A tabela histórica foi criada para importar vendas já assinadas.
  return v.situacao_comercial !== "cancelada";
}

export function normalizarFonte(valor: string | null): string {
  return !valor?.trim() || valor.trim().toLocaleLowerCase("pt-BR") === "indefinido"
    ? "Não informado" : valor.trim();
}
