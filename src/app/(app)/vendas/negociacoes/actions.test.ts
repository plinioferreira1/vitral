import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  sessao: vi.fn(),
  permissoes: vi.fn(),
  admin: vi.fn(),
  rpc: vi.fn(),
  aviso: vi.fn(),
  revalidar: vi.fn(),
  after: vi.fn(),
}));
vi.mock("@/lib/usuario-atual", () => ({ exigirUsuario: m.sessao }));
vi.mock("@/lib/permissoes", () => ({ getPermissoesUsuario: m.permissoes }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: m.admin }));
vi.mock("@/lib/aviso", () => ({
  avisar: m.aviso,
  checar: async (op: Promise<{ error: unknown }>) => !(await op).error,
}));
vi.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`redirect:${destino}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidar }));
vi.mock("next/server", () => ({ after: m.after }));
vi.mock("@/lib/google-agenda", () => ({ reconciliarAgendaProcesso: vi.fn() }));
import { encerrarNegociacao, salvarNegociacao } from "./actions";
const id = "10000000-0000-4000-8000-000000000001";
const responsavel = "10000000-0000-4000-8000-000000000002";
function formulario(dados: Record<string, string> = {}) {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    id,
    cliente_nome: "Cliente",
    imovel_endereco: "Imóvel",
    valor: "123.45",
    responsavel_id: responsavel,
    data_abertura: "2026-01-01",
    ...dados,
  }))
    f.set(k, v);
  return f;
}
beforeEach(() => {
  vi.clearAllMocks();
  m.sessao.mockResolvedValue({
    userId: "autor-da-sessao",
    tenantId: "empresa-da-sessao",
    nivel: "diretor",
  });
  m.permissoes.mockResolvedValue({ temVenda: true });
  m.admin.mockReturnValue({ rpc: m.rpc });
  m.rpc.mockResolvedValue({ data: id, error: null });
});
describe("gravação de negociações", () => {
  it("não chama a chave administrativa sem sessão ou com auxiliar", async () => {
    m.sessao.mockResolvedValueOnce(null);
    await salvarNegociacao(formulario());
    expect(m.admin).not.toHaveBeenCalled();
    m.sessao.mockResolvedValueOnce({
      userId: "auxiliar",
      tenantId: "empresa",
      nivel: "auxiliar",
    });
    await encerrarNegociacao(
      formulario({ situacao: "perdida", motivo: "Desistência" }),
    );
    expect(m.admin).not.toHaveBeenCalled();
  });
  it("supervisor sem Vendas não encerra", async () => {
    m.sessao.mockResolvedValueOnce({
      userId: "supervisor",
      tenantId: "empresa",
      nivel: "supervisor",
    });
    m.permissoes.mockResolvedValueOnce({ temVenda: false });
    await encerrarNegociacao(formulario({ situacao: "perdida" }));
    expect(m.admin).not.toHaveBeenCalled();
  });
  it("ignora autor e empresa injetados no formulário e revalida os painéis", async () => {
    await expect(
      salvarNegociacao(formulario({ tenant_id: "outra", usuario_id: "outro" })),
    ).rejects.toThrow(`redirect:/vendas/negociacoes/${id}`);
    expect(m.rpc).toHaveBeenCalledWith(
      "vendas_negociacao_salvar",
      expect.objectContaining({
        p_tenant_id: "empresa-da-sessao",
        p_usuario_id: "autor-da-sessao",
        p_dados: expect.objectContaining({ valor: 123.45 }),
      }),
    );
    expect(m.revalidar).toHaveBeenCalledWith("/");
    expect(m.revalidar).toHaveBeenCalledWith("/painel-sacra");
  });
  it("não grava valor inválido ou identificação inválida", async () => {
    await salvarNegociacao(formulario({ valor: "NaN" }));
    await salvarNegociacao(formulario({ id: "invalido" }));
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("falha do banco não informa sucesso nem cria fluxo de agenda", async () => {
    m.rpc.mockResolvedValueOnce({ data: null, error: { message: "Falha" } });
    await encerrarNegociacao(
      formulario({ situacao: "convertida", modelo_id: id }),
    );
    expect(m.revalidar).not.toHaveBeenCalled();
    expect(m.after).not.toHaveBeenCalled();
    expect(m.aviso).not.toHaveBeenCalledWith("sucesso", expect.any(String));
  });
  it("recusa situação adulterada e conversão sem modelo", async () => {
    await encerrarNegociacao(formulario({ situacao: "ativo" }));
    await encerrarNegociacao(formulario({ situacao: "convertida" }));
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("abre o processo convertido e mantém perda no detalhe da negociação", async () => {
    await expect(
      encerrarNegociacao(formulario({ situacao: "convertida", modelo_id: id })),
    ).rejects.toThrow(`redirect:/processos/${id}`);
    expect(m.after).toHaveBeenCalledTimes(1);
    m.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(
      encerrarNegociacao(
        formulario({ situacao: "perdida", motivo: "Desistência" }),
      ),
    ).rejects.toThrow(`redirect:/vendas/negociacoes/${id}`);
    expect(m.rpc).toHaveBeenLastCalledWith(
      "vendas_negociacao_encerrar",
      expect.objectContaining({
        p_situacao: "perdida",
        p_motivo: "Desistência",
      }),
    );
  });
});
