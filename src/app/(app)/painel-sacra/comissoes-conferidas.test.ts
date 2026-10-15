import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { COMISSOES_CONFERIDAS } from "./comissoes-conferidas";

it("concilia os 59 contratos com a conferência manuscrita de 14/10/2026", () => {
  // Subtotais impressos corrigidos: páginas 1, 2 (+2.375), 3 (-80), 4 (+11.517).
  const subtotais = [34481000, 31948700, 36831947, 28145750];
  expect(COMISSOES_CONFERIDAS).toHaveLength(59);
  expect(new Set(COMISSOES_CONFERIDAS.map(c => c.id)).size).toBe(59);
  subtotais.forEach((total, pagina) => {
    expect(COMISSOES_CONFERIDAS.slice(pagina * 15, (pagina + 1) * 15).reduce((s, c) => s + c.valorCentavos, 0)).toBe(total);
  });
  expect(COMISSOES_CONFERIDAS.reduce((s, c) => s + c.valorCentavos, 0)).toBe(131407397);
});
