import { describe, expect, it } from "vitest";
import { calcularAtraso, calcularItem, diasDeAtraso, explicacaoItem, percentual, validarAtraso, type EntradaAtraso } from "./atraso";

const base: EntradaAtraso = { dataCalculo: "2026-10-27", multaPct: 10, jurosMensalPct: 1, indice: null, itens: [] };
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

describe("multa e juros por atraso", () => {
  it("conta os dias de atraso e nunca negativo", () => {
    expect(diasDeAtraso("2026-10-10", "2026-10-27")).toBe(17);
    expect(diasDeAtraso("2026-10-27", "2026-10-27")).toBe(0);
    expect(diasDeAtraso("2026-11-10", "2026-10-27")).toBe(0);
    expect(diasDeAtraso("2026-02-10", "2026-03-10")).toBe(28);
  });

  it("calcula multa e juros pro rata sobre o valor sem correção", () => {
    const i = calcularItem({ descricao: "Aluguel set/26", vencimento: "2026-09-27", valorCentavos: 250000 }, base);
    expect(i.dias).toBe(30);
    expect(i.multaCentavos).toBe(25000);
    expect(i.jurosCentavos).toBe(2500);
    expect(i.totalCentavos).toBe(277500);
  });

  it("aplica a correção antes da multa e dos juros", () => {
    const i = calcularItem({ descricao: "Aluguel", vencimento: "2026-08-28", valorCentavos: 200000, correcaoPct: 1.5 }, { ...base, indice: "IGP-M" });
    expect(i.dias).toBe(60);
    expect(i.corrigidoCentavos).toBe(203000);
    expect(i.correcaoCentavos).toBe(3000);
    expect(i.multaCentavos).toBe(20300);
    expect(i.jurosCentavos).toBe(4060);
    expect(i.totalCentavos).toBe(227360);
  });

  it("ignora a correção quando não há índice e zera encargos de débito a vencer", () => {
    expect(calcularItem({ descricao: "x", vencimento: "2026-08-28", valorCentavos: 100000, correcaoPct: 5 }, base).correcaoCentavos).toBe(0);
    const futuro = calcularItem({ descricao: "Condomínio", vencimento: "2026-11-05", valorCentavos: 80000 }, base);
    expect(futuro).toMatchObject({ vencido: false, multaCentavos: 0, jurosCentavos: 0, totalCentavos: 80000 });
  });

  it("ordena por vencimento e soma os totais", () => {
    const m = calcularAtraso({ ...base, itens: [
      { descricao: "Condomínio out/26", vencimento: "2026-10-10", valorCentavos: 75000 },
      { descricao: "Aluguel set/26", vencimento: "2026-09-27", valorCentavos: 250000 },
    ] });
    expect(m.itens.map((i) => i.descricao)).toEqual(["Aluguel set/26", "Condomínio out/26"]);
    expect(m.totais.original).toBe(325000);
    expect(m.totais.multa).toBe(25000 + 7500);
    expect(m.totais.juros).toBe(2500 + 425);
    expect(m.totais.total).toBe(m.totais.corrigido + m.totais.multa + m.totais.juros);
  });

  it("valida a entrada", () => {
    expect(validarAtraso({ ...base, itens: [] })).toContain("Inclua ao menos um débito.");
    const erros = validarAtraso({ ...base, multaPct: 30, jurosMensalPct: -1, indice: "XYZ", itens: [{ descricao: "", vencimento: "2026-02-30", valorCentavos: 0 }] });
    expect(erros.join(" ")).toMatch(/multa/);
    expect(erros.join(" ")).toMatch(/juros/);
    expect(erros.join(" ")).toMatch(/Índice/);
    expect(erros.join(" ")).toMatch(/descrição/);
    expect(erros.join(" ")).toMatch(/vencimento/);
    expect(erros.join(" ")).toMatch(/valor/);
    expect(validarAtraso({ ...base, itens: [{ descricao: "Aluguel", vencimento: "2026-09-10", valorCentavos: 1 }] })).toEqual([]);
  });

  it("lê percentuais digitados e explica o cálculo", () => {
    expect(percentual("2,5")).toBe(2.5);
    expect(percentual("")).toBeNull();
    expect(percentual("abc")).toBeNaN();
    const i = calcularItem({ descricao: "Aluguel", vencimento: "2026-09-27", valorCentavos: 250000 }, base);
    const linhas = explicacaoItem(i, base, brl);
    expect(linhas[1]).toBe("Multa: R$ 2.500,00 × 10% = R$ 250,00");
    expect(linhas[2]).toContain("30 dias ÷ 30 = R$ 25,00");
  });
});
