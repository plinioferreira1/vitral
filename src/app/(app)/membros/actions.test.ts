import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const consulta = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    insert: vi.fn(),
  };
  const cliente = { from: vi.fn(() => consulta), rpc: vi.fn() };
  return {
    consulta,
    cliente,
    avisar: vi.fn(),
    getUsuarioAtual: vi.fn(),
    redirect: vi.fn(),
    revalidatePath: vi.fn(),
  };
});
vi.mock("@/lib/aviso", () => ({ avisar: mocks.avisar, checar: vi.fn() }));
vi.mock("@/lib/usuario-atual", () => ({
  getUsuarioAtual: mocks.getUsuarioAtual,
  GESTORES: ["diretor", "gerente"],
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mocks.cliente),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    throw new Error("admin não deveria ser usado nestes testes");
  }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/site-url", () => ({
  obterSiteUrl: vi.fn(async () => "https://vitral.test"),
}));
import { atualizarCategoriasMembro, criarConvite } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUsuarioAtual.mockResolvedValue({
    user: { id: "eu" },
    usuario: { tenant_id: "empresa", nivel_acesso: "diretor" },
  });
  mocks.redirect.mockImplementation(() => {
    throw new Error("redirect");
  });
  mocks.consulta.select.mockReturnValue(mocks.consulta);
  mocks.consulta.eq.mockReturnValue(mocks.consulta);
  mocks.consulta.single.mockResolvedValue({
    data: { nivel_acesso: "supervisor" },
    error: null,
  });
  mocks.consulta.insert.mockResolvedValue({ error: null });
  mocks.cliente.rpc.mockResolvedValue({ error: null });
});
function dados(id: string, nivel: string, confirmar = false) {
  const f = new FormData();
  f.set("usuario_id", id);
  f.set("nivel_acesso", nivel);
  f.set("email", "teste@exemplo.com");
  if (confirmar) f.set("confirmar_administrativo", "sim");
  return f;
}
describe("proteções das ações de usuários", () => {
  it("bloqueia mutação para usuário comum antes de consultar o banco", async () => {
    mocks.getUsuarioAtual.mockResolvedValue({
      user: { id: "eu" },
      usuario: { tenant_id: "empresa", nivel_acesso: "auxiliar" },
    });
    await expect(
      atualizarCategoriasMembro(dados("outro", "diretor", true)),
    ).rejects.toThrow("redirect");
    expect(mocks.cliente.from).not.toHaveBeenCalled();
    expect(mocks.cliente.rpc).not.toHaveBeenCalled();
  });
  it("bloqueia alvo que não foi encontrado dentro da empresa", async () => {
    mocks.consulta.single.mockResolvedValue({
      data: null,
      error: { message: "não encontrado" },
    });
    await atualizarCategoriasMembro(dados("externo", "auxiliar"));
    expect(mocks.consulta.eq).toHaveBeenCalledWith("tenant_id", "empresa");
    expect(mocks.cliente.rpc).not.toHaveBeenCalled();
  });
  it("bloqueia a remoção do próprio acesso administrativo", async () => {
    await atualizarCategoriasMembro(dados("eu", "corretor"));
    expect(mocks.cliente.rpc).not.toHaveBeenCalled();
    expect(mocks.avisar).toHaveBeenCalledWith(
      "erro",
      expect.stringContaining("próprio"),
    );
  });
  it("exige confirmação de concessão administrativa também no servidor", async () => {
    await atualizarCategoriasMembro(dados("outro", "gerente"));
    expect(mocks.cliente.rpc).not.toHaveBeenCalled();
    await criarConvite(dados("", "diretor"));
    expect(mocks.consulta.insert).not.toHaveBeenCalled();
  });
  it("mantém RPC/RLS e descarta categorias adulteradas", async () => {
    const f = dados("outro", "supervisor");
    f.append("categorias", "locacao");
    f.append("categorias", "admin");
    await atualizarCategoriasMembro(f);
    expect(mocks.cliente.rpc).toHaveBeenCalledWith(
      "atualizar_categorias_membro",
      {
        p_usuario_id: "outro",
        p_categorias: ["locacao"],
        p_nivel_acesso: "supervisor",
      },
    );
  });
  it("permite concessão confirmada", async () => {
    await atualizarCategoriasMembro(dados("outro", "diretor", true));
    expect(mocks.cliente.rpc).toHaveBeenCalledOnce();
  });
});
