import { describe, expect, it } from "vitest";
import { datasDaRecorrencia, nEsimoDiaUtil, somarMeses } from "./recorrencia";

const vencimentos = (r: { vencimento: string }[]) => r.map((o) => o.vencimento);

describe("somarMeses", () => {
  it("mantém o dia quando o mês comporta", () => {
    expect(somarMeses("2026-01-15", 1)).toBe("2026-02-15");
  });
  it("encosta no último dia em meses curtos", () => {
    expect(somarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(somarMeses("2028-01-31", 1)).toBe("2028-02-29"); // bissexto
  });
  it("atravessa o ano", () => {
    expect(somarMeses("2026-11-30", 3)).toBe("2027-02-28");
  });
});

describe("nEsimoDiaUtil", () => {
  it("pula fim de semana", () => {
    // 01/08/2026 é sábado → 1º dia útil é segunda 03/08
    expect(nEsimoDiaUtil(2026, 7, 1)).toBe("2026-08-03");
    expect(nEsimoDiaUtil(2026, 7, 5)).toBe("2026-08-07");
  });
  it("pula feriados", () => {
    // 07/09/2026 é segunda-feira, mas é feriado nacional.
    expect(nEsimoDiaUtil(2026, 8, 5)).toBe("2026-09-08");
  });
  it("cai no último dia útil se o mês não tiver dias úteis suficientes", () => {
    // fevereiro/2026 tem 20 dias úteis; o 25º vira o último (27/02, sexta)
    expect(nEsimoDiaUtil(2026, 1, 25)).toBe("2026-02-27");
  });
});

describe("datasDaRecorrencia", () => {
  it("mensal no dia 31 volta ao dia 31 depois de fevereiro (não fica preso no 28)", () => {
    const r = datasDaRecorrencia({ dataInicio: "2026-01-31", frequencia: "mensal", numeroOcorrencias: 4 });
    expect(vencimentos(r)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("semanal avança de 7 em 7 dias", () => {
    const r = datasDaRecorrencia({ dataInicio: "2026-09-28", frequencia: "semanal", numeroOcorrencias: 3 });
    expect(vencimentos(r)).toEqual(["2026-09-28", "2026-10-05", "2026-10-12"]);
  });

  it("para na data fim (inclusive)", () => {
    const r = datasDaRecorrencia({ dataInicio: "2026-01-10", frequencia: "mensal", dataFim: "2026-03-10" });
    expect(vencimentos(r)).toEqual(["2026-01-10", "2026-02-10", "2026-03-10"]);
  });

  it("trimestral, semestral e anual", () => {
    expect(vencimentos(datasDaRecorrencia({ dataInicio: "2026-01-05", frequencia: "trimestral", numeroOcorrencias: 3 }))).toEqual([
      "2026-01-05",
      "2026-04-05",
      "2026-07-05",
    ]);
    expect(vencimentos(datasDaRecorrencia({ dataInicio: "2026-01-05", frequencia: "semestral", numeroOcorrencias: 2 }))).toEqual([
      "2026-01-05",
      "2026-07-05",
    ]);
    expect(vencimentos(datasDaRecorrencia({ dataInicio: "2026-02-28", frequencia: "anual", numeroOcorrencias: 3 }))).toEqual([
      "2026-02-28",
      "2027-02-28",
      "2028-02-28",
    ]);
  });

  it("N-ésimo dia útil usa a competência do mês", () => {
    const r = datasDaRecorrencia({ dataInicio: "2026-08-01", frequencia: "mensal", numeroOcorrencias: 2, diaUtil: 5 });
    expect(r).toEqual([
      { vencimento: "2026-08-07", competencia: "2026-08-01" },
      { vencimento: "2026-09-08", competencia: "2026-09-01" },
    ]);
  });

  it("move vencimento fixo de despesa para o próximo dia útil e preserva a competência", () => {
    const r = datasDaRecorrencia({
      dataInicio: "2026-10-10",
      frequencia: "mensal",
      numeroOcorrencias: 2,
      ajustarDiasNaoUteis: true,
    });
    expect(r).toEqual([
      { vencimento: "2026-10-13", competencia: "2026-10-10" },
      { vencimento: "2026-11-10", competencia: "2026-11-10" },
    ]);
  });

  it("dia útil é ignorado na frequência semanal", () => {
    const r = datasDaRecorrencia({ dataInicio: "2026-09-28", frequencia: "semanal", numeroOcorrencias: 2, diaUtil: 5 });
    expect(vencimentos(r)).toEqual(["2026-09-28", "2026-10-05"]);
  });

  it("respeita o limite máximo de ocorrências", () => {
    expect(datasDaRecorrencia({ dataInicio: "2026-01-01", frequencia: "semanal" })).toHaveLength(60);
    expect(datasDaRecorrencia({ dataInicio: "2026-01-01", frequencia: "mensal", numeroOcorrencias: 500 })).toHaveLength(60);
  });
});
