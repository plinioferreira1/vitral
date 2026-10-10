import { describe, expect, it } from "vitest";
import { progressoVgv } from "./metricas-empresa";

describe("meta de VGV", () => {
  it("confere o progresso do retrato de 2026 em centavos", () => {
    const resultado = progressoVgv(4_803_465_000, 7_000_000_000);
    expect(resultado.restanteCentavos).toBe(2_196_535_000);
    expect(resultado.percentual).toBeCloseTo(68.62092857);
  });
  it("inicia sem vendas e reconhece a meta alcançada", () => {
    expect(progressoVgv(0, 100)).toEqual({ percentual: 0, percentualBarra: 0, restanteCentavos: 100 });
    expect(progressoVgv(100, 100)).toEqual({ percentual: 100, percentualBarra: 100, restanteCentavos: 0 });
  });
  it("limita apenas a barra quando supera a meta", () => {
    expect(progressoVgv(150, 100)).toEqual({ percentual: 150, percentualBarra: 100, restanteCentavos: 0 });
  });
  it.each([[1, 0], [-1, 100], [1.5, 100], [100, Infinity]])("rejeita valores inválidos %s/%s", (vgv, meta) => {
    expect(() => progressoVgv(vgv, meta)).toThrow();
  });
});
