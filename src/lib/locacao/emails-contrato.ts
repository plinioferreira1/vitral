/**
 * Histórico de e-mails de um contrato de locação: solicitações enviadas às
 * administradoras pelo VITRAL e respostas recebidas em locacao@ (já gravadas
 * pela sincronização do Zoho em `debitos_respostas_email`). Funções puras.
 */

export type SolicitacaoEmail = {
  id: string;
  assunto: string;
  administradora_nome: string | null;
  destinatario: string;
  enviado_em: string;
  status: string;
  respondido_em: string | null;
};

export type RespostaEmail = {
  id: string;
  /** Id da mensagem no Zoho (para consultar anexos). */
  mensagem_id?: string | null;
  solicitacao_id: string | null;
  remetente: string;
  assunto: string;
  resumo: string | null;
  recebido_em: string;
  tem_anexo: boolean;
};

export type EventoEmail =
  | { tipo: "enviado"; quando: string; solicitacao: SolicitacaoEmail }
  | { tipo: "recebido"; quando: string; resposta: RespostaEmail; pendente: boolean };

/**
 * Uma resposta precisa de atendimento quando chegou depois do último registro
 * de resposta da solicitação (ou quando a solicitação ainda não teve resposta
 * registrada) e a solicitação não falhou.
 */
export function respostaPendente(r: RespostaEmail, s: SolicitacaoEmail | undefined): boolean {
  if (!s || s.status === "falha") return false;
  if (!s.respondido_em) return true;
  return new Date(r.recebido_em).getTime() > new Date(s.respondido_em).getTime();
}

/** Linha do tempo, mais recente primeiro. */
export function linhaDoTempo(solicitacoes: SolicitacaoEmail[], respostas: RespostaEmail[]): EventoEmail[] {
  const porId = new Map(solicitacoes.map((s) => [s.id, s]));
  const eventos: EventoEmail[] = [
    ...solicitacoes.filter((s) => s.status !== "falha").map((s) => ({ tipo: "enviado" as const, quando: s.enviado_em, solicitacao: s })),
    ...respostas.map((r) => ({
      tipo: "recebido" as const,
      quando: r.recebido_em,
      resposta: r,
      pendente: respostaPendente(r, r.solicitacao_id ? porId.get(r.solicitacao_id) : undefined),
    })),
  ];
  return eventos.sort((a, b) => new Date(b.quando).getTime() - new Date(a.quando).getTime());
}

export function totalPendentes(eventos: EventoEmail[]): number {
  return eventos.filter((e) => e.tipo === "recebido" && e.pendente).length;
}

/** Tira a etiqueta técnica "[VITRAL:…]" do assunto mostrado. */
export function assuntoVisivel(assunto: string): string {
  return assunto.replace(/\s*\[VITRAL:[a-f0-9]{16}\]\s*/gi, " ").replace(/\s+/g, " ").trim() || "Sem assunto";
}
