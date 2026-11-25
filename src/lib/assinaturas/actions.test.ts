import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ usuario: vi.fn(), rpc: vi.fn(), revalidar: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidar }));
vi.mock("@/lib/usuario-atual", () => ({ getUsuarioAtual: m.usuario, GESTORES: ["diretor", "gerente"] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: m.rpc }) }));
import { gerenciarLinkAssinatura } from "./actions";

const DOC = "11111111-1111-4111-8111-111111111111";
const SIG = "22222222-2222-4222-8222-222222222222";

function form(campos: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries({ tipo: "carta_proposta", documento_id: DOC, signatario_id: SIG, ...campos })) f.set(k, v);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.usuario.mockResolvedValue({ user: { id: "u" }, usuario: { ativo: true, nivel_acesso: "gerente" } });
  m.rpc.mockResolvedValue({ error: null });
});

describe("gerenciar link de assinatura", () => {
  it("revoga só com confirmação e atualiza a tela do documento", async () => {
    expect((await gerenciarLinkAssinatura(null, form({ acao: "revogar" }))).ok).toBe(false);
    expect(m.rpc).not.toHaveBeenCalled();
    const r = await gerenciarLinkAssinatura(null, form({ acao: "revogar", confirmado: "sim" }));
    expect(r.ok).toBe(true);
    expect(m.rpc).toHaveBeenCalledWith("gerenciar_link_assinatura", { p_tipo: "carta_proposta", p_signatario_id: SIG, p_acao: "revogar" });
    expect(m.revalidar).toHaveBeenCalledWith(`/propostas/${DOC}`);
  });

  it("define validade futura enviando a data em ISO", async () => {
    const futura = new Date(Date.now() + 3 * 86400000).toISOString();
    const r = await gerenciarLinkAssinatura(null, form({ acao: "definir_validade", expira_em: futura }));
    expect(r.ok).toBe(true);
    expect(m.rpc).toHaveBeenCalledWith("gerenciar_link_assinatura", expect.objectContaining({ p_acao: "definir_validade", p_expira_em: futura }));
  });

  it("recusa data passada sem chamar o banco", async () => {
    const r = await gerenciarLinkAssinatura(null, form({ acao: "definir_validade", expira_em: "2020-01-01T00:00:00Z" }));
    expect(r.ok).toBe(false);
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it("bloqueia quem não é gestor ativo antes de chegar ao banco", async () => {
    m.usuario.mockResolvedValue({ user: { id: "u" }, usuario: { ativo: true, nivel_acesso: "corretor" } });
    expect((await gerenciarLinkAssinatura(null, form({ acao: "revogar", confirmado: "sim" }))).mensagem).toMatch(/gerentes e diretores/);
    m.usuario.mockResolvedValue({ user: { id: "u" }, usuario: { ativo: false, nivel_acesso: "diretor" } });
    expect((await gerenciarLinkAssinatura(null, form({ acao: "revogar", confirmado: "sim" }))).ok).toBe(false);
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it("recusa tipo, ação ou ids inválidos", async () => {
    expect((await gerenciarLinkAssinatura(null, form({ tipo: "contrato", acao: "revogar", confirmado: "sim" }))).ok).toBe(false);
    expect((await gerenciarLinkAssinatura(null, form({ acao: "apagar" }))).ok).toBe(false);
    expect((await gerenciarLinkAssinatura(null, form({ signatario_id: "x", acao: "revogar", confirmado: "sim" }))).ok).toBe(false);
    expect(m.rpc).not.toHaveBeenCalled();
  });

  it("traduz o erro do banco", async () => {
    m.rpc.mockResolvedValue({ error: { message: "Link não encontrado ou documento não está pendente" } });
    const r = await gerenciarLinkAssinatura(null, form({ acao: "revogar", confirmado: "sim" }));
    expect(r).toEqual({ ok: false, mensagem: expect.stringMatching(/já foi assinado, cancelado/) });
  });
});
