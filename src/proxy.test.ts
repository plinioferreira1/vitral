import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.hoisted(() => ({ sub: "usuario", ativo: true, nivel: "diretor" }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: unknown[]) => void } }) => ({
    auth: { getClaims: async () => {
      options.cookies.setAll([{ name: "sb-sessao", value: "renovada", options: { httpOnly: true, path: "/", sameSite: "lax" } }]);
      return { data: auth.sub ? { claims: { sub: auth.sub } } : null };
    } },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { ativo: auth.ativo, nivel_acesso: auth.nivel } }) }) }) }),
  }),
}));
import { proxy } from "./proxy";

describe("sessão durante redirecionamentos", () => {
  beforeEach(() => { auth.sub = "usuario"; auth.ativo = true; auth.nivel = "diretor"; });
  it.each([
    ["/login", "/"],
    ["/acesso-desativado", "/"],
  ])("preserva renovação ao sair de %s", async (origem, destino) => {
    const resposta = await proxy(new NextRequest(`https://vitral.example${origem}`));
    expect(resposta.headers.get("location")).toBe(`https://vitral.example${destino}`);
    expect(resposta.cookies.get("sb-sessao")).toMatchObject({ value: "renovada", httpOnly: true, path: "/", sameSite: "lax" });
  });
  it("mantém bloqueio de acesso desativado com cookies", async () => {
    auth.ativo = false;
    const resposta = await proxy(new NextRequest("https://vitral.example/vendas"));
    expect(resposta.headers.get("location")).toBe("https://vitral.example/acesso-desativado");
    expect(resposta.cookies.get("sb-sessao")?.value).toBe("renovada");
  });
  it("mantém restrição de corretor com cookies", async () => {
    auth.nivel = "corretor";
    const resposta = await proxy(new NextRequest("https://vitral.example/financeiro"));
    expect(resposta.headers.get("location")).toBe("https://vitral.example/cartorio");
    expect(resposta.cookies.get("sb-sessao")?.value).toBe("renovada");
  });
  it("mantém visitante sem sessão fora de rotas internas", async () => {
    auth.sub = "";
    const resposta = await proxy(new NextRequest("https://vitral.example/vendas"));
    expect(resposta.headers.get("location")).toBe("https://vitral.example/login");
  });
  it("renova cookies também na navegação permitida", async () => {
    const resposta = await proxy(new NextRequest("https://vitral.example/vendas"));
    expect(resposta.headers.get("location")).toBeNull();
    expect(resposta.cookies.get("sb-sessao")?.value).toBe("renovada");
  });
});
