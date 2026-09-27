import { describe, expect, it } from "vitest";
import { detectarDelimitador, normalizarData, normalizarValor, parseCsvFatura } from "./fatura-csv";

describe("normalizarData", () => {
  it("aceita DD/MM/AAAA, D/M/AA e AAAA-MM-DD", () => {
    expect(normalizarData("05/09/2026")).toBe("2026-09-05");
    expect(normalizarData("5/9/26")).toBe("2026-09-05");
    expect(normalizarData("2026-09-05")).toBe("2026-09-05");
  });
  it("rejeita lixo", () => {
    expect(normalizarData("ontem")).toBeNull();
  });
});

describe("normalizarValor", () => {
  it("entende formato brasileiro e americano", () => {
    expect(normalizarValor("1.234,56")).toBe(1234.56);
    expect(normalizarValor("R$ 89,90")).toBe(89.9);
    expect(normalizarValor("1234.56")).toBe(1234.56);
    expect(normalizarValor("-45,00")).toBe(-45);
  });
  it("devolve null quando não é número", () => {
    expect(normalizarValor("abc")).toBeNull();
  });
});

describe("detectarDelimitador", () => {
  it("escolhe ; ou , pelo cabeçalho", () => {
    expect(detectarDelimitador("data;estabelecimento;valor")).toBe(";");
    expect(detectarDelimitador("data,estabelecimento,valor")).toBe(",");
  });
});

describe("parseCsvFatura", () => {
  it("lê fatura com ponto e vírgula, parcela e valores BR", () => {
    const csv = [
      "Data;Estabelecimento;Parcela;Valor",
      "02/09/2026;POSTO SHELL;;250,00",
      "03/09/2026;LOJA X;2/10;1.199,90",
    ].join("\n");
    const { itens, erros } = parseCsvFatura(csv);
    expect(erros).toEqual([]);
    expect(itens).toEqual([
      { data: "2026-09-02", estabelecimento: "POSTO SHELL", descricao: null, valor: 250, parcela_atual: null, parcela_total: null },
      { data: "2026-09-03", estabelecimento: "LOJA X", descricao: null, valor: 1199.9, parcela_atual: 2, parcela_total: 10 },
    ]);
  });

  it("ignora linhas inválidas e informa quais", () => {
    const csv = "data,estabelecimento,valor\n2026-09-01,Café,12.50\nsem data,Algo,10\n";
    const { itens, erros } = parseCsvFatura(csv);
    expect(itens).toHaveLength(1);
    expect(erros).toEqual(["Linha 3: dados inválidos, ignorada."]);
  });

  it("explica quando faltam colunas obrigatórias", () => {
    const { itens, erros } = parseCsvFatura("nome;quantia\nx;1");
    expect(itens).toEqual([]);
    expect(erros[0]).toMatch(/Não encontrei as colunas/);
  });

  it("arquivo vazio", () => {
    expect(parseCsvFatura("\n\n").erros).toEqual(["Arquivo vazio."]);
  });
});
