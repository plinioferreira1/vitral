import { beforeEach, describe, expect, it, vi } from "vitest";
import { documentoVazio, MODELO_PADRAO } from "@/lib/termo-entrega/conteudo";

const m = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), sessao: vi.fn(), termo: vi.fn(), permissao: vi.fn(), aviso: vi.fn(), redirect: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: m.rpc, from: m.from }) }));
vi.mock("@/lib/usuario-atual", () => ({ exigirUsuario: m.sessao }));
vi.mock("./dados", () => ({ BUCKET_TERMOS: "termos-entrega", carregarTermo: m.termo, carregarPermissoes: m.permissao, carregarModelo: async () => MODELO_PADRAO }));
vi.mock("@/lib/aviso", () => ({ avisar: m.aviso, checar: async (p: Promise<{error: unknown}>) => !(await p).error }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("@/lib/email", () => ({ enviarEmail: vi.fn() }));
vi.mock("@/lib/site-url", () => ({ obterSiteUrl: vi.fn() }));
import { criarTermo, salvarTermo } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  m.sessao.mockResolvedValue({ tenantId: "empresa", userId: "autor", nivel: "diretor", usuario: { nome: "Gestor" }, user: {} });
  m.permissao.mockResolvedValue({ operar: true });
  m.termo.mockResolvedValue({ termo: { status: "rascunho", versao: 1 }, documento: documentoVazio(), modelo: MODELO_PADRAO });
  m.rpc.mockResolvedValue({ data: { id: "termo", atualizado_em: "2026-10-12T12:00:00Z", anexos_removidos: [] }, error: null });
});

describe("gravação completa do termo", () => {
  it("envia valores recalculados, partes e auditoria numa única chamada", async () => {
    const doc = { ...documentoVazio(), saldoCentavos: 999999 };
    const r = await salvarTermo("termo", doc, "revisao-da-tela");
    expect(r.ok).toBe(true);
    expect(m.rpc).toHaveBeenCalledTimes(1);
    expect(m.rpc).toHaveBeenCalledWith("termo_entrega_gravar", expect.objectContaining({ p_id: "termo", p_novo: false, p_atualizado_em: "revisao-da-tela", p_termo: expect.objectContaining({ saldo_centavos: 0 }), p_partes: [], p_encargos: [] }));
    expect(m.from).not.toHaveBeenCalled();
    expect(m.revalidate).toHaveBeenCalledWith("/vendas/termos-entrega/termo");
  });
  it("não anuncia sucesso quando a transação falha ou a conexão cai", async () => {
    m.rpc.mockResolvedValueOnce({ data: null, error: { code: "40001" } });
    expect(await salvarTermo("termo", documentoVazio(), "antiga")).toEqual(expect.objectContaining({ ok: false, erro: expect.stringContaining("outra janela") }));
    m.rpc.mockRejectedValueOnce(new Error("offline"));
    expect(await salvarTermo("termo", documentoVazio(), "antiga")).toEqual(expect.objectContaining({ ok: false }));
    expect(m.revalidate).not.toHaveBeenCalled();
  });
  it("bloqueia falta de permissão e documento fora de rascunho", async () => {
    m.permissao.mockResolvedValueOnce({ operar: false });
    expect((await salvarTermo("termo", {}, "r")).ok).toBe(false);
    m.termo.mockResolvedValueOnce({ termo: { status: "assinado" } });
    expect((await salvarTermo("termo", {}, "r")).ok).toBe(false);
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("reutiliza o identificador do envio ao criar e só redireciona após confirmação", async () => {
    const f = new FormData();
    f.set("solicitacao_id", "00000000-0000-4000-8000-000000000002");
    await criarTermo(f);
    expect(m.rpc).toHaveBeenCalledWith("termo_entrega_gravar", expect.objectContaining({ p_id: f.get("solicitacao_id"), p_novo: true, p_eventos: [expect.objectContaining({ acao: "criado" })] }));
    expect(m.redirect).toHaveBeenCalledWith(`/vendas/termos-entrega/${f.get("solicitacao_id")}`);
    m.redirect.mockClear();
    m.rpc.mockRejectedValueOnce(new Error("offline"));
    await criarTermo(f);
    expect(m.redirect).not.toHaveBeenCalled();
    expect(m.aviso).toHaveBeenCalledWith("erro", expect.stringContaining("conexão"));
  });
});
