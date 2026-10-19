import { describe, expect, it } from "vitest";
import { CERTIDOES, dataValida, documentoSoNumeros, resumoParte, situacaoCertidao, validadeSugerida, validarCertidao } from "./catalogo";

const HOJE = "2026-10-19";

describe("catálogo", () => {
  it("tem as oito certidões com chaves únicas e sites oficiais", () => {
    expect(CERTIDOES).toHaveLength(8);
    expect(new Set(CERTIDOES.map((c) => c.chave)).size).toBe(8);
    for (const c of CERTIDOES) expect(c.url).toMatch(/^https:\/\/[a-z0-9.-]+\.(jus|gov)\.br\//);
  });
  it("sugere a validade a partir da emissão", () => {
    expect(validadeSugerida("cndt", "2026-10-19")).toBe("2027-04-17");
    expect(validadeSugerida("tjdft_especial", "2026-10-19")).toBe("2026-11-18");
    expect(validadeSugerida("x", "2026-10-19")).toBeNull();
  });
});

describe("situação", () => {
  it("classifica pendente, vigente, perto de vencer, vencida e positiva", () => {
    expect(situacaoCertidao(null, HOJE)).toBe("pendente");
    expect(situacaoCertidao({ valida_ate: "2026-12-01", resultado: "nada_consta" }, HOJE)).toBe("vigente");
    expect(situacaoCertidao({ valida_ate: "2026-10-26", resultado: "nada_consta" }, HOJE)).toBe("vence_em_breve");
    expect(situacaoCertidao({ valida_ate: "2026-10-19", resultado: "nada_consta" }, HOJE)).toBe("vence_em_breve");
    expect(situacaoCertidao({ valida_ate: "2026-10-18", resultado: "nada_consta" }, HOJE)).toBe("vencida");
    expect(situacaoCertidao({ valida_ate: "2026-12-01", resultado: "positiva" }, HOJE)).toBe("positiva");
    expect(situacaoCertidao({ valida_ate: "2026-10-01", resultado: "positiva" }, HOJE)).toBe("vencida");
  });
  it("resume a parte", () => {
    const r = resumoParte([
      { tipo: "cndt", valida_ate: "2027-01-01", resultado: "nada_consta" },
      { tipo: "trt10", valida_ate: "2026-10-01", resultado: "nada_consta" },
      { tipo: "trf1_civel", valida_ate: "2026-12-01", resultado: "positiva" },
    ], HOJE);
    expect(r).toMatchObject({ total: 8, emDia: 1, vencida: 1, positiva: 1, pendente: 5 });
  });
});

describe("validação", () => {
  const ok = { tipo: "cndt", parte: "vendedor", emitida_em: "2026-10-19", valida_ate: "2027-04-17", resultado: "nada_consta" };
  it("aceita dados corretos e recusa os errados", () => {
    expect(validarCertidao(ok)).toBeNull();
    expect(validarCertidao({ ...ok, tipo: "outra" })).toMatch(/desconhecida/);
    expect(validarCertidao({ ...ok, parte: "fiador" })).toMatch(/Parte/);
    expect(validarCertidao({ ...ok, resultado: "talvez" })).toMatch(/Resultado/);
    expect(validarCertidao({ ...ok, emitida_em: "" })).toMatch(/emissão/);
    expect(validarCertidao({ ...ok, valida_ate: "2026-02-30" })).toMatch(/validade/);
    expect(validarCertidao({ ...ok, valida_ate: "2026-10-01" })).toMatch(/anterior/);
  });
  it("datas e documento", () => {
    expect(dataValida("2026-10-19")).toBe(true);
    expect(dataValida("19/10/2026")).toBe(false);
    expect(documentoSoNumeros("123.456.789-00")).toBe("12345678900");
    expect(documentoSoNumeros(null)).toBe("");
  });
});
