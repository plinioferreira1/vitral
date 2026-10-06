import { describe, expect, it } from "vitest";
import { etapaDoFluxo, etapasDaAvaliacao } from "./fluxo";

describe("fluxo comercial", () => {
  it("tem cinco etapas de trabalho e um histórico separado", () => {
    expect(etapasDaAvaliacao("estudo_comercial").map((e) => e.chave)).toEqual(["dados", "comparaveis", "preco", "textos", "revisao", "historico"]);
  });
  it("mantém links antigos e pendências no grupo do imóvel", () => {
    for (const etapa of ["imovel", "vistoria", "localizacao"] as const) {
      expect(etapaDoFluxo("estudo_comercial", etapa)).toBe("dados");
      expect(etapaDoFluxo("ptam", etapa)).toBe(etapa);
    }
    expect(etapasDaAvaliacao("ptam")).toHaveLength(9);
  });
});
