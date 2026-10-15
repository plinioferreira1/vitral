import { afterEach, describe, expect, it, vi } from "vitest";
import { enviarTermo } from "./envio";
afterEach(() => vi.unstubAllGlobals());
describe("transporte do editor", () => {
  it("preserva conflito de revisão retornado pelo servidor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ok: false, erro: "Outra aba alterou este termo" }, { status: 409 })));
    expect(await enviarTermo(new FormData())).toEqual({ ok: false, erro: "Outra aba alterou este termo" });
  });
  it("não apresenta sucesso com HTML de login nem quando a conexão cai", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response("<html>Login</html>", { headers: { "content-type": "text/html" } })).mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetch);
    expect((await enviarTermo(new FormData())).ok).toBe(false);
    expect((await enviarTermo(new FormData())).ok).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2); // Não repete automaticamente uma gravação incerta.
  });
});
