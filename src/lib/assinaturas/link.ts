/**
 * Links públicos de assinatura (autorização de venda, carta proposta, termo
 * de entrega e termo de visita): situação do link e textos da tela "Gerenciar
 * link". Funções puras — a regra que vale de verdade fica no banco
 * (`gerenciar_link_assinatura` e as funções públicas `*_buscar`/`*_registrar`,
 * que já recusam link revogado ou vencido). Aqui só se decide o que mostrar.
 */

export const TIPOS_LINK = ["autorizacao_venda", "carta_proposta", "termo_entrega", "termo_visita"] as const;
export type TipoLink = (typeof TIPOS_LINK)[number];

export type SituacaoLink = "assinado" | "revogado" | "vencido" | "valido" | "encerrado";

export type DadosLink = {
  assinadoEm: string | null;
  expiraEm: string | null;
  revogadoEm: string | null;
  /** O documento ainda aceita assinatura (pendente / aguardando assinatura). */
  documentoAberto: boolean;
};

/** Ordem importa: assinatura feita nunca vira "revogado" ou "vencido". */
export function situacaoLink(d: DadosLink, agora: Date = new Date()): SituacaoLink {
  if (d.assinadoEm) return "assinado";
  if (d.revogadoEm) return "revogado";
  if (d.expiraEm && new Date(d.expiraEm).getTime() <= agora.getTime()) return "vencido";
  if (!d.documentoAberto) return "encerrado";
  return "valido";
}

/** Só um link válido pode ser copiado, aberto, enviado ou alterado. */
export function linkUtilizavel(s: SituacaoLink): boolean {
  return s === "valido";
}

export const ROTULO_SITUACAO: Record<SituacaoLink, string> = {
  assinado: "Assinado",
  revogado: "Link revogado",
  vencido: "Link vencido",
  valido: "Link válido",
  encerrado: "Documento encerrado",
};

export const EXPLICACAO_SITUACAO: Record<SituacaoLink, string> = {
  assinado: "A assinatura já foi registrada e fica guardada. O link não pode mais ser alterado.",
  revogado: "Este link foi desativado e não abre mais o documento. Não é possível reativá-lo.",
  vencido: "O prazo deste link acabou e ele não abre mais o documento.",
  valido: "Quem tiver este link consegue abrir e assinar o documento.",
  encerrado: "O documento não aceita mais assinaturas (cancelado ou fora de assinatura).",
};

const FUSO = "America/Sao_Paulo";

export function formatarValidade(expiraEm: string | null): string {
  if (!expiraEm) return "Sem prazo definido";
  return new Date(expiraEm).toLocaleString("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Confere a data escolhida antes de chamar o banco (que confere de novo). */
export function validarNovaValidade(iso: string | null | undefined, agora: Date = new Date()): { ok: true; iso: string } | { ok: false; erro: string } {
  if (!iso) return { ok: false, erro: "Escolha a data e a hora até quando o link vale." };
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return { ok: false, erro: "Data inválida." };
  if (data.getTime() <= agora.getTime()) return { ok: false, erro: "A validade precisa ser uma data futura." };
  const umAno = 366 * 24 * 60 * 60 * 1000;
  if (data.getTime() - agora.getTime() > umAno) return { ok: false, erro: "Escolha uma validade de até um ano." };
  return { ok: true, iso: data.toISOString() };
}

/** Mensagens do banco → texto para a pessoa. Nada além disso vai para a tela. */
export function mensagemErroLink(mensagemBanco: string | null | undefined): string {
  const m = (mensagemBanco ?? "").toLowerCase();
  if (m.includes("não autorizado") || m.includes("nao autorizado") || m.includes("permission")) {
    return "Só gerentes e diretores ativos podem gerenciar links de assinatura.";
  }
  if (m.includes("já revogado") || m.includes("ja revogado")) return "Este link já tinha sido revogado.";
  if (m.includes("não está pendente") || m.includes("não encontrado")) {
    return "Este link não pode mais ser alterado: o documento já foi assinado, cancelado ou mudou de versão.";
  }
  if (m.includes("validade deve ser futura")) return "A validade precisa ser uma data futura.";
  return "Não foi possível alterar o link. Atualize a página e tente de novo.";
}

/** Tela de cada tipo, para atualizar depois de alterar o link. */
export function caminhoDocumento(tipo: TipoLink, documentoId: string): string {
  switch (tipo) {
    case "autorizacao_venda":
      return `/autorizacoes/${documentoId}`;
    case "carta_proposta":
      return `/propostas/${documentoId}`;
    case "termo_entrega":
      return `/vendas/termos-entrega/${documentoId}`;
    case "termo_visita":
      return `/termos-visita/${documentoId}`;
  }
}
