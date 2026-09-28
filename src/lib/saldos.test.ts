import { describe, expect, it } from "vitest";
import { baixasParaMovimento, movimentoPorConta } from "./saldos";

describe("movimentoPorConta", () => {
  it("recebimento soma e pagamento subtrai na conta da baixa", () => {
    const m = movimentoPorConta([
      { conta_bancaria_id: "inter", valor: 1000, tipo: "receita" },
      { conta_bancaria_id: "inter", valor: "250.50", tipo: "despesa" },
      { conta_bancaria_id: null, valor: 999, tipo: "despesa" },
    ]);
    expect(m.get("inter")).toBe(749.5);
    expect(m.size).toBe(1);
  });

  it("pagar a fatura do cartão pela conta corrente zera a dívida do cartão", () => {
    // cartão começou com -3.806,06 (fatura em aberto)
    const m = movimentoPorConta([], [{ conta_origem_id: "inter", conta_destino_id: "cartao", valor: 3806.06, data: "2026-10-10" }]);
    expect(-3806.06 + (m.get("cartao") ?? 0)).toBe(0);
    expect(m.get("inter")).toBe(-3806.06);
  });

  it("transferências não mudam o saldo total da empresa", () => {
    const m = movimentoPorConta(
      [{ conta_bancaria_id: "inter", valor: 500, tipo: "despesa" }],
      [
        { conta_origem_id: "inter", conta_destino_id: "cdb", valor: 10000, data: "2026-10-01" },
        { conta_origem_id: "cdb", conta_destino_id: "sicoob", valor: 2500, data: "2026-10-05" },
      ]
    );
    const total = [...m.values()].reduce((s, v) => s + v, 0);
    expect(total).toBe(-500);
    expect(m.get("cdb")).toBe(7500);
    expect(m.get("sicoob")).toBe(2500);
  });

  it("com data de corte ignora movimentos posteriores", () => {
    const m = movimentoPorConta(
      [
        { conta_bancaria_id: "inter", valor: 100, tipo: "receita", data: "2026-09-01" },
        { conta_bancaria_id: "inter", valor: 40, tipo: "despesa", data: "2026-09-20" },
      ],
      [{ conta_origem_id: "inter", conta_destino_id: "cdb", valor: 30, data: "2026-09-21" }],
      "2026-09-20"
    );
    expect(m.get("inter")).toBe(60);
    expect(m.has("cdb")).toBe(false);
  });

  it("converte o formato vindo do banco", () => {
    expect(
      baixasParaMovimento([{ conta_bancaria_id: "x", valor: "10", data: "2026-09-01", financeiro_lancamentos: { tipo: "receita" } }])
    ).toEqual([{ conta_bancaria_id: "x", valor: "10", data: "2026-09-01", tipo: "receita" }]);
    expect(baixasParaMovimento(null)).toEqual([]);
  });
});
