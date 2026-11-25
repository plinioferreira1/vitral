import { describe, expect, it } from "vitest";
import { assuntoVisivel, linhaDoTempo, respostaPendente, totalPendentes, type RespostaEmail, type SolicitacaoEmail } from "./emails-contrato";

const sol = (id: string, enviado: string, respondido: string | null, status = "enviado"): SolicitacaoEmail => ({
  id, assunto: `Posição de débitos [VITRAL:0123456789abcdef]`, administradora_nome: "Adm", destinatario: "adm@x.com", enviado_em: enviado, status, respondido_em: respondido,
});
const resp = (id: string, solicitacao: string | null, recebido: string): RespostaEmail => ({
  id, solicitacao_id: solicitacao, remetente: "adm@x.com", assunto: "RE: Posição", resumo: "Sem débitos", recebido_em: recebido, tem_anexo: false,
});

describe("e-mails do contrato", () => {
  it("resposta sem registro de atendimento fica pendente", () => {
    expect(respostaPendente(resp("r", "s", "2026-11-10T12:00:00Z"), sol("s", "2026-11-09T12:00:00Z", null))).toBe(true);
  });

  it("resposta já tratada deixa de ser pendente; nova resposta depois volta a ser", () => {
    const s = sol("s", "2026-11-09T12:00:00Z", "2026-11-11T12:00:00Z");
    expect(respostaPendente(resp("r1", "s", "2026-11-10T12:00:00Z"), s)).toBe(false);
    expect(respostaPendente(resp("r2", "s", "2026-11-12T12:00:00Z"), s)).toBe(true);
  });

  it("sem solicitação conhecida ou com envio que falhou não conta como pendente", () => {
    expect(respostaPendente(resp("r", null, "2026-11-10T12:00:00Z"), undefined)).toBe(false);
    expect(respostaPendente(resp("r", "s", "2026-11-10T12:00:00Z"), sol("s", "2026-11-09T12:00:00Z", null, "falha"))).toBe(false);
  });

  it("monta a linha do tempo do mais recente para o mais antigo, sem envios que falharam", () => {
    const eventos = linhaDoTempo(
      [sol("s1", "2026-11-01T12:00:00Z", null), sol("s2", "2026-11-05T12:00:00Z", null, "falha")],
      [resp("r1", "s1", "2026-11-03T12:00:00Z")],
    );
    expect(eventos.map((e) => e.tipo)).toEqual(["recebido", "enviado"]);
    expect(totalPendentes(eventos)).toBe(1);
  });

  it("esconde a etiqueta técnica do assunto", () => {
    expect(assuntoVisivel("Posição de débitos [VITRAL:0123456789abcdef]")).toBe("Posição de débitos");
    expect(assuntoVisivel("")).toBe("Sem assunto");
  });
});
