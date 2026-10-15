import { describe, expect, it, vi } from "vitest";
import { comPrazo } from "./com-prazo";

describe("comPrazo", () => {
  it("devolve o valor quando chega no prazo", async () => {
    expect(await comPrazo(Promise.resolve(5), 100, 0)).toEqual({ valor: 5, noPrazo: true });
  });
  it("devolve a reserva quando passa do prazo", async () => {
    vi.useFakeTimers();
    const r = comPrazo(new Promise<number>(() => {}), 4000, 0);
    await vi.advanceTimersByTimeAsync(4000);
    expect(await r).toEqual({ valor: 0, noPrazo: false });
    vi.useRealTimers();
  });
  it("devolve a reserva quando falha", async () => {
    expect(await comPrazo(Promise.reject(new Error("x")), 100, "reserva")).toEqual({ valor: "reserva", noPrazo: false });
  });
});
