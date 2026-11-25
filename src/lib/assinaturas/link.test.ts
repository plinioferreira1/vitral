import { describe, expect, it } from "vitest";
import { caminhoDocumento, formatarValidade, linkUtilizavel, mensagemErroLink, situacaoLink, validarNovaValidade } from "./link";

const agora = new Date("2026-11-25T15:00:00.000Z");
const base = { assinadoEm: null, expiraEm: null, revogadoEm: null, documentoAberto: true };

describe("situação do link de assinatura", () => {
  it("link sem prazo, documento aberto: válido", () => {
    expect(situacaoLink(base, agora)).toBe("valido");
    expect(linkUtilizavel("valido")).toBe(true);
  });

  it("assinatura feita prevalece sobre revogação e vencimento", () => {
    expect(situacaoLink({ ...base, assinadoEm: "2026-11-20T10:00:00Z", revogadoEm: "2026-11-21T10:00:00Z", expiraEm: "2026-11-22T10:00:00Z" }, agora)).toBe("assinado");
  });

  it("revogado vem antes de vencido", () => {
    expect(situacaoLink({ ...base, revogadoEm: "2026-11-24T10:00:00Z", expiraEm: "2026-11-01T10:00:00Z" }, agora)).toBe("revogado");
  });

  it("vence no instante exato do prazo", () => {
    expect(situacaoLink({ ...base, expiraEm: agora.toISOString() }, agora)).toBe("vencido");
    expect(situacaoLink({ ...base, expiraEm: "2026-11-25T15:00:01.000Z" }, agora)).toBe("valido");
  });

  it("documento cancelado ou fora de assinatura: encerrado, sem ações", () => {
    expect(situacaoLink({ ...base, documentoAberto: false }, agora)).toBe("encerrado");
    expect(linkUtilizavel("encerrado")).toBe(false);
    expect(linkUtilizavel("vencido")).toBe(false);
    expect(linkUtilizavel("revogado")).toBe(false);
  });
});

describe("nova validade", () => {
  it("exige data futura e até um ano", () => {
    expect(validarNovaValidade("", agora)).toEqual({ ok: false, erro: expect.any(String) });
    expect(validarNovaValidade("nada", agora)).toEqual({ ok: false, erro: "Data inválida." });
    expect(validarNovaValidade("2026-11-25T14:59:00Z", agora).ok).toBe(false);
    expect(validarNovaValidade("2028-01-01T00:00:00Z", agora).ok).toBe(false);
    expect(validarNovaValidade("2026-12-02T15:00:00-03:00", agora)).toEqual({ ok: true, iso: "2026-12-02T18:00:00.000Z" });
  });

  it("mostra a validade no horário de Brasília", () => {
    expect(formatarValidade(null)).toBe("Sem prazo definido");
    expect(formatarValidade("2026-12-02T18:00:00.000Z")).toBe("02/12/2026, 15:00");
  });
});

describe("mensagens e caminhos", () => {
  it("traduz os erros do banco sem repassar detalhes internos", () => {
    expect(mensagemErroLink("Acesso não autorizado")).toMatch(/gerentes e diretores/);
    expect(mensagemErroLink("Link já revogado")).toBe("Este link já tinha sido revogado.");
    expect(mensagemErroLink("Link não encontrado ou documento não está pendente")).toMatch(/já foi assinado, cancelado/);
    expect(mensagemErroLink("A validade deve ser futura")).toMatch(/futura/);
    expect(mensagemErroLink("relation xyz does not exist")).toBe("Não foi possível alterar o link. Atualize a página e tente de novo.");
  });

  it("aponta a tela de cada tipo de documento", () => {
    expect(caminhoDocumento("autorizacao_venda", "a")).toBe("/autorizacoes/a");
    expect(caminhoDocumento("carta_proposta", "b")).toBe("/propostas/b");
    expect(caminhoDocumento("termo_entrega", "c")).toBe("/vendas/termos-entrega/c");
    expect(caminhoDocumento("termo_visita", "d")).toBe("/termos-visita/d");
  });
});
