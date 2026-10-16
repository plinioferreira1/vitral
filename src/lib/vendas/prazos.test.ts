import { describe, expect, it } from "vitest";
import { ehTramitesBancarios, novoPrazoAoMudarAssinatura, prazoPadraoEtapa } from "./prazos";

describe("prazo padrão de Trâmites Bancários", () => {
  it("é 30 dias após a assinatura", () => {
    expect(prazoPadraoEtapa("Trâmites Bancários", "2026-10-06")).toBe("2026-11-05");
    expect(prazoPadraoEtapa("trâmites bancários", "2026-01-31")).toBe("2026-03-02");
  });
  it("não vale para outras etapas nem sem assinatura", () => {
    expect(prazoPadraoEtapa("Registro", "2026-10-06")).toBeNull();
    expect(prazoPadraoEtapa("Trâmites Bancários", null)).toBeNull();
    expect(ehTramitesBancarios("Tramites Bancarios")).toBe(true);
  });
  it("ao mudar a assinatura, recalcula prazo vazio ou padrão e preserva o ajustado à mão", () => {
    expect(novoPrazoAoMudarAssinatura("Trâmites Bancários", null, null, "2026-10-06")).toBe("2026-11-05");
    expect(novoPrazoAoMudarAssinatura("Trâmites Bancários", "2026-11-05", "2026-10-06", "2026-10-10")).toBe("2026-11-09");
    expect(novoPrazoAoMudarAssinatura("Trâmites Bancários", "2026-11-20", "2026-10-06", "2026-10-10")).toBeUndefined();
    expect(novoPrazoAoMudarAssinatura("Trâmites Bancários", "2026-11-05", "2026-10-06", "2026-10-06")).toBeUndefined();
    expect(novoPrazoAoMudarAssinatura("Registro", null, null, "2026-10-06")).toBeUndefined();
  });
});
