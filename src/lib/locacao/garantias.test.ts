import { describe, expect, it } from "vitest";
import { dadosGarantia, garantiaDaLista, reaisParaCentavos, resumoCaucoes } from "./garantias";

describe("garantia locatícia", () => {
  it("aceita só as opções da lista", () => {
    expect(garantiaDaLista("Caução")).toBe("Caução");
    expect(garantiaDaLista(" Fiador ")).toBe("Fiador");
    expect(garantiaDaLista("cheque")).toBeNull();
    expect(garantiaDaLista("")).toBeNull();
  });

  it("converte valores em reais para centavos inteiros", () => {
    expect(reaisParaCentavos("3.700,00")).toBe(370000);
    expect(reaisParaCentavos("3700.50")).toBe(370050);
    expect(reaisParaCentavos(7400)).toBe(740000);
    expect(reaisParaCentavos("")).toBeNull();
    expect(reaisParaCentavos("-1")).toBeNull();
    expect(reaisParaCentavos("abc")).toBeNull();
  });

  it("só guarda valor quando a garantia é caução", () => {
    expect(dadosGarantia("Caução", "11100.00")).toEqual({ garantia_locaticia: "Caução", caucao_valor_centavos: 1110000 });
    expect(dadosGarantia("Fiador", "11100.00")).toEqual({ garantia_locaticia: "Fiador", caucao_valor_centavos: null });
    expect(dadosGarantia("", "")).toEqual({ garantia_locaticia: null, caucao_valor_centavos: null });
  });
});

describe("cauções em caixa", () => {
  const c = (id: string, ativo: boolean, garantia: string | null, valor: number | null) => ({ id, ativo, garantia_locaticia: garantia, caucao_valor_centavos: valor });

  it("soma só contratos ativos com caução e separa os sem valor e os encerrados", () => {
    const r = resumoCaucoes([
      c("a", true, "Caução", 740000),
      c("b", true, "Caução", 1110000),
      c("c", true, "Caução", null),
      c("d", false, "Caução", 500000),
      c("e", true, "Fiador", null),
    ]);
    expect(r.totalCentavos).toBe(1850000);
    expect(r.ativos.map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(r.semValor.map((x) => x.id)).toEqual(["c"]);
    expect(r.encerrados.map((x) => x.id)).toEqual(["d"]);
  });
});

describe("planilha das cauções", () => {
  it("lista ativos e encerrados e fecha com o total dos ativos", async () => {
    const { csvCaucoes } = await import("./caucoes-relatorio");
    const linha = (id: string, ativo: boolean, valor: number | null) => ({
      id, numero: id, ativo, garantia_locaticia: "Caução", caucao_valor_centavos: valor,
      vigencia_inicio: "2026-01-10", vigencia_fim: "2028-01-09", data_encerramento: null,
      endereco: `QE 13; Casa ${id}`, locatario: "Locatário", locador: "Locador",
    });
    const csv = csvCaucoes(resumoCaucoes([linha("1", true, 740000), linha("2", false, 500000)]));
    const linhas = csv.replace("﻿", "").split("\r\n");
    expect(linhas[1]).toBe('Ativo;1;"QE 13; Casa 1";Locatário;Locador;10/01/2026;09/01/2028;7400,00');
    expect(linhas[2].startsWith("Encerrado;2;")).toBe(true);
    expect(linhas.at(-1)).toBe("Total em caixa (contratos ativos);;;;;;;7400,00");
  });
});
