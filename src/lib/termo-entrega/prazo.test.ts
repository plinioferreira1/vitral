import { afterEach, expect, it, vi } from "vitest";
import { aguardarTermo } from "./prazo";

afterEach(() => vi.useRealTimers());
it("limita a espera sem transformar confirmação tardia em sucesso", async () => {
  vi.useFakeTimers();
  let resolver!: (value: boolean) => void;
  const resultado = aguardarTermo(new Promise<boolean>(resolve => { resolver = resolve; }), 100);
  const verificacao = expect(resultado).rejects.toThrow("confirmação demorou");
  await vi.advanceTimersByTimeAsync(100);
  await verificacao;
  resolver(true);
  expect(vi.getTimerCount()).toBe(0);
});
it("limpa o temporizador quando o servidor responde ou rejeita", async () => {
  vi.useFakeTimers();
  expect(await aguardarTermo(Promise.resolve({ ok: true }))).toEqual({ ok: true });
  await expect(aguardarTermo(Promise.reject(new Error("offline")))).rejects.toThrow("offline");
  expect(vi.getTimerCount()).toBe(0);
});
