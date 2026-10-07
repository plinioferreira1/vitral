import { beforeEach, describe, expect, it, vi } from "vitest";

// Simula o Supabase: quem está logado e o nível dele.
let logado: { id: string } | null = null;
let linhaUsuario: {
  tenant_id: string | null;
  nivel_acesso: string;
  ativo: boolean;
} | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    // sem sessão o getClaims devolve data nula; com sessão, as claims do token (sub = id)
    auth: { getClaims: async () => ({ data: logado ? { claims: { sub: logado.id } } : null, error: null }) },
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: linhaUsuario }) }),
      }),
    }),
  }),
}));

const avisos: { tipo: string; mensagem: string }[] = [];
vi.mock("@/lib/aviso", () => ({
  avisar: async (tipo: string, mensagem: string) => {
    avisos.push({ tipo, mensagem });
  },
}));

import { exigirUsuario, GESTORES } from "./usuario-atual";

beforeEach(() => {
  avisos.length = 0;
  logado = { id: "u1" };
  linhaUsuario = { tenant_id: "t1", nivel_acesso: "diretor", ativo: true };
});

describe("exigirUsuario", () => {
  it("libera diretor em ação de gestores e devolve usuário e empresa", async () => {
    const sessao = await exigirUsuario(GESTORES);
    expect(sessao).toMatchObject({
      userId: "u1",
      tenantId: "t1",
      nivel: "diretor",
    });
    expect(avisos).toEqual([]);
  });

  it("bloqueia corretor em ação de gestores, com aviso de permissão", async () => {
    linhaUsuario = { tenant_id: "t1", nivel_acesso: "corretor", ativo: true };
    expect(await exigirUsuario(GESTORES)).toBeNull();
    expect(avisos).toEqual([
      { tipo: "erro", mensagem: "Você não tem permissão para esta ação." },
    ]);
  });

  it("libera corretor em ação sem nível exigido", async () => {
    linhaUsuario = { tenant_id: "t1", nivel_acesso: "corretor", ativo: true };
    expect(await exigirUsuario()).not.toBeNull();
  });

  it("sessão expirada ou sem empresa", async () => {
    logado = null;
    expect(await exigirUsuario()).toBeNull();
    logado = { id: "u1" };
    linhaUsuario = { tenant_id: null, nivel_acesso: "diretor", ativo: true };
    expect(await exigirUsuario()).toBeNull();
    expect(avisos.map((a) => a.mensagem)).toEqual([
      "Sua sessão expirou. Entre novamente.",
      "Sua sessão expirou. Entre novamente.",
    ]);
  });

  it("bloqueia uma sessão cujo acesso foi desativado", async () => {
    linhaUsuario = { tenant_id: "t1", nivel_acesso: "diretor", ativo: false };
    expect(await exigirUsuario()).toBeNull();
    expect(avisos).toEqual([
      { tipo: "erro", mensagem: "Seu acesso ao Vitral está desativado." },
    ]);
  });
});
