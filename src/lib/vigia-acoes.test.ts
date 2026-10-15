import { describe, expect, it } from "vitest";
import { decidirVigia, ESPERA_APOS_RESPOSTA_MS, ESPERA_MAXIMA_MS, normalizarDiagnostico, podeRecarregarSozinho } from "./vigia-acoes";

describe("decidirVigia", () => {
  const acao = { cabecalhoEm: 1000, corpoTerminouEm: 1500 };
  it("encerra quando a tela já não está ocupada", () => {
    expect(decidirVigia(acao, 1000 + ESPERA_MAXIMA_MS * 2, false, 0)).toBe("encerrar");
  });
  it("aguarda dentro do tempo normal depois da resposta", () => {
    expect(decidirVigia(acao, 1500 + ESPERA_APOS_RESPOSTA_MS - 1, true, 0)).toBe("aguardar");
  });
  it("intervém quando a tela segue ocupada depois da resposta completa", () => {
    expect(decidirVigia(acao, 1500 + ESPERA_APOS_RESPOSTA_MS, true, 0)).toBe("intervir");
  });
  it("intervém se a resposta nunca termina de chegar", () => {
    const semFim = { cabecalhoEm: 1000, corpoTerminouEm: null };
    expect(decidirVigia(semFim, 1000 + ESPERA_MAXIMA_MS - 1, true, 0)).toBe("aguardar");
    expect(decidirVigia(semFim, 1000 + ESPERA_MAXIMA_MS, true, 0)).toBe("intervir");
  });
  it("não intervém enquanto outra gravação está em andamento", () => {
    expect(decidirVigia(acao, 1500 + ESPERA_MAXIMA_MS * 3, true, 1)).toBe("aguardar");
  });
});

describe("podeRecarregarSozinho", () => {
  it("permite a primeira vez e em outra tela", () => {
    expect(podeRecarregarSozinho(null, "/a", 0)).toBe(true);
    expect(podeRecarregarSozinho({ caminho: "/b", em: 0 }, "/a", 10)).toBe(true);
  });
  it("não recarrega a mesma tela duas vezes seguidas", () => {
    expect(podeRecarregarSozinho({ caminho: "/a", em: 1000 }, "/a", 30_000)).toBe(false);
    expect(podeRecarregarSozinho({ caminho: "/a", em: 1000 }, "/a", 61_000)).toBe(true);
  });
});

describe("normalizarDiagnostico", () => {
  it("guarda erros e ids do head com limite", () => {
    const d = normalizarDiagnostico({ caminho: "/x", erros: ["TypeError: Cannot read properties of null (reading 'removeChild')", "b", "c", "d"], idsNoHead: ["style#tab-color-line"] })!;
    expect(d.erros).toHaveLength(3);
    expect(d.erros[0]).toContain("removeChild");
    expect(d.idsNoHead).toEqual(["style#tab-color-line"]);
  });
  it("recusa entradas inválidas", () => {
    expect(normalizarDiagnostico(null)).toBeNull();
    expect(normalizarDiagnostico({ caminho: "https://outro.site" })).toBeNull();
  });
  it("limita tamanho e tipos", () => {
    const d = normalizarDiagnostico({
      caminho: "/vendas/termos-entrega/abc<script>",
      acao: "a".repeat(80),
      status: 303.4,
      msAteCabecalho: "10",
      ocupados: Array.from({ length: 9 }, () => "button Gerar documento"),
      visivel: "sim",
    })!;
    expect(d.caminho).toBe("/vendas/termos-entrega/abcscript");
    expect(d.acao).toHaveLength(16);
    expect(d.status).toBe(303);
    expect(d.msAteCabecalho).toBe(0);
    expect(d.ocupados).toHaveLength(5);
    expect(d.visivel).toBe(false);
    expect(d.erros).toEqual([]);
  });
});
