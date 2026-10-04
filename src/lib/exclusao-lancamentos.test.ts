import { describe, expect, it } from "vitest";
import { escopoExclusaoValido, idsParaExcluir, type LancamentoDaSerie } from "./exclusao-lancamentos";

const hoje = "2026-10-04";
const serie: LancamentoDaSerie[] = [
  { id: "ago-pago", vencimento: "2026-08-10", status: "pago", temBaixa: true },
  { id: "set-vencido", vencimento: "2026-09-10", status: "pendente", temBaixa: false },
  { id: "out-atual", vencimento: "2026-10-10", status: "pendente", temBaixa: false },
  { id: "nov-parcial", vencimento: "2026-11-10", status: "pago_parcial", temBaixa: true },
  { id: "dez", vencimento: "2026-12-10", status: "pendente", temBaixa: false },
  { id: "jan-cancelado", vencimento: "2027-01-10", status: "cancelado", temBaixa: false },
  { id: "hoje", vencimento: hoje, status: "pendente", temBaixa: false },
];
const ordenar = (ids: string[]) => [...ids].sort();

describe("idsParaExcluir", () => {
  it("somente o atual", () => {
    expect(idsParaExcluir("out-atual", serie, "um", hoje)).toEqual(["out-atual"]);
  });

  it("atual + não vencidos sem baixa (quem vence hoje ainda não venceu)", () => {
    expect(ordenar(idsParaExcluir("out-atual", serie, "nao_vencidos", hoje))).toEqual(["dez", "hoje", "out-atual"]);
  });

  it("atual + todos em aberto sem baixa, vencidos ou não", () => {
    expect(ordenar(idsParaExcluir("out-atual", serie, "em_aberto", hoje))).toEqual([
      "dez",
      "hoje",
      "out-atual",
      "set-vencido",
    ]);
  });

  it("todos inclui pagos, parciais e cancelados", () => {
    expect(idsParaExcluir("out-atual", serie, "todos", hoje)).toHaveLength(serie.length);
  });

  it("o atual sempre entra, mesmo já pago ou vencido", () => {
    expect(ordenar(idsParaExcluir("ago-pago", serie, "nao_vencidos", hoje))).toEqual([
      "ago-pago",
      "dez",
      "hoje",
      "out-atual",
    ]);
  });
});

describe("escopoExclusaoValido", () => {
  it("aceita só as opções da tela; o resto vira 'um'", () => {
    expect(escopoExclusaoValido("em_aberto")).toBe("em_aberto");
    expect(escopoExclusaoValido("tudo")).toBe("um");
    expect(escopoExclusaoValido(null)).toBe("um");
  });
});
