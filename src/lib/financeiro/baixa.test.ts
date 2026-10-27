import { describe, expect, it } from "vitest";
import { baixaCabeNoSaldo, saldoEmAberto } from "./baixa";

describe("baixa", () => {
  it("calcula o saldo em aberto sem ficar negativo", () => {
    expect(saldoEmAberto(1000, [])).toBe(1000);
    expect(saldoEmAberto(1000, [{ valor: "300.10" }, { valor: 199.9 }])).toBe(500);
    expect(saldoEmAberto(1000, [{ valor: 4000 }])).toBe(0);
  });
  it("aceita até o saldo e recusa o que passa dele", () => {
    expect(baixaCabeNoSaldo(500, 500)).toBe(true);
    expect(baixaCabeNoSaldo(500.004, 500)).toBe(true);
    expect(baixaCabeNoSaldo(500.01, 500)).toBe(false);
    expect(baixaCabeNoSaldo(0, 500)).toBe(false);
    expect(baixaCabeNoSaldo(10, 0)).toBe(false);
  });
});
