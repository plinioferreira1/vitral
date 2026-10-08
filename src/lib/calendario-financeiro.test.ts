import { describe, expect, it } from "vitest";
import { ehDiaUtilFinanceiro, proximoDiaUtilFinanceiro } from "./calendario-financeiro";

describe("calendário financeiro de Brasília/DF", () => {
  it("mantém um vencimento em dia útil", () => {
    expect(proximoDiaUtilFinanceiro("2026-10-08")).toBe("2026-10-08");
  });

  it("pula fim de semana e o feriado seguinte", () => {
    // 10/10/2026 é sábado e 12/10/2026, segunda-feira, é feriado nacional.
    expect(proximoDiaUtilFinanceiro("2026-10-10")).toBe("2026-10-13");
  });

  it("considera feriado local do Distrito Federal", () => {
    expect(ehDiaUtilFinanceiro("2026-11-30")).toBe(false);
    expect(proximoDiaUtilFinanceiro("2026-11-30")).toBe("2026-12-01");
  });

  it("considera feriados móveis e dias sem expediente bancário", () => {
    expect(ehDiaUtilFinanceiro("2026-02-16")).toBe(false); // Carnaval
    expect(ehDiaUtilFinanceiro("2026-04-03")).toBe(false); // Paixão de Cristo
    expect(ehDiaUtilFinanceiro("2026-06-04")).toBe(false); // Corpus Christi no DF
  });
});
