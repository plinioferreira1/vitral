import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sessao: vi.fn(), cliente: vi.fn(), aviso: vi.fn(), consulta: vi.fn(), filtro: vi.fn(),
  concluir: vi.fn(), reabrir: vi.fn(), prazo: vi.fn(), registro: vi.fn(),
}));
vi.mock("@/lib/usuario-atual", () => ({ exigirUsuario: mocks.sessao }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.cliente }));
vi.mock("@/lib/aviso", () => ({ avisar: mocks.aviso }));
vi.mock("../actions", () => ({
  concluirEtapa: mocks.concluir, reabrirEtapa: mocks.reabrir,
  alterarDataPrevista: mocks.prazo, salvarNumeroRegistro: mocks.registro,
}));
import { POST } from "./route";

const origem = "https://vitral.example";
function enviar(acao = "concluir", origin: string | null = origem, headers: Record<string, string> = {}) {
  const dados = new FormData();
  dados.set("acao", acao);
  dados.set("etapa_id", "etapa-1");
  dados.set("processo_id", "processo-forjado");
  dados.set("data_prevista", "2026-10-20");
  return POST(new Request(`${origem}/processos/processo-1/etapas`, {
    method: "POST", body: dados, headers: { ...(origin ? { origin } : {}), ...headers },
  }), { params: Promise.resolve({ id: "processo-1" }) });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.sessao.mockResolvedValue({ userId: "usuario-1" });
  mocks.consulta.mockResolvedValue({ data: { id: "etapa-1" }, error: null });
  const query = { select: vi.fn().mockReturnThis(), eq: mocks.filtro.mockReturnThis(), maybeSingle: mocks.consulta };
  mocks.cliente.mockResolvedValue({ from: vi.fn().mockReturnValue(query) });
});

describe("POST nativo das etapas", () => {
  it.each(["https://outro.example", null])("recusa origem %s antes de executar qualquer ação", async (origin) => {
    expect((await enviar("concluir", origin)).status).toBe(403);
    expect(mocks.sessao).not.toHaveBeenCalled();
    expect(mocks.concluir).not.toHaveBeenCalled();
  });

  it("encaminha sessão expirada ao login sem gravar", async () => {
    mocks.sessao.mockResolvedValue(null);
    const resposta = await enviar();
    expect(resposta.status).toBe(303);
    expect(resposta.headers.get("location")).toBe(`${origem}/login`);
    expect(mocks.cliente).not.toHaveBeenCalled();
  });

  it("preserva o domínio público encaminhado pelo proxy no retorno", async () => {
    const resposta = await enviar("concluir", "https://publico.example", {
      "x-forwarded-host": "publico.example", "x-forwarded-proto": "https",
    });
    expect(resposta.status).toBe(303);
    expect(resposta.headers.get("location")).toBe("https://publico.example/processos/processo-1#etapas-processo");
  });

  it("recusa origem que não corresponde ao domínio encaminhado", async () => {
    const resposta = await enviar("concluir", origem, { "x-forwarded-host": "publico.example" });
    expect(resposta.status).toBe(403);
    expect(mocks.concluir).not.toHaveBeenCalled();
  });

  it.each(["apagar", "toString", "__proto__"])("recusa ação não permitida: %s", async (acao) => {
    expect((await enviar(acao)).status).toBe(400);
    expect(mocks.cliente).not.toHaveBeenCalled();
  });

  it("impede alteração de etapa sem acesso ou pertencente a outro processo", async () => {
    mocks.consulta.mockResolvedValue({ data: null, error: null });
    const resposta = await enviar();
    expect(resposta.status).toBe(303);
    expect(mocks.filtro).toHaveBeenCalledWith("processo_id", "processo-1");
    expect(mocks.concluir).not.toHaveBeenCalled();
    expect(mocks.aviso).toHaveBeenCalledWith("erro", expect.any(String));
  });

  it.each([
    ["concluir", mocks.concluir], ["reabrir", mocks.reabrir],
    ["prazo", mocks.prazo], ["registro", mocks.registro],
  ] as const)("executa %s uma vez e retorna por GET à seção de etapas", async (acao, executar) => {
    const resposta = await enviar(acao);
    expect(executar).toHaveBeenCalledTimes(1);
    const dados = executar.mock.calls[0][0] as FormData;
    expect(dados.get("processo_id")).toBe("processo-1");
    expect(dados.get("data_prevista")).toBe("2026-10-20");
    expect(resposta.status).toBe(303);
    expect(resposta.headers.get("location")).toBe(`${origem}/processos/processo-1#etapas-processo`);
  });

  it("após uma falha parcial, mostra o estado atual e avisa sem repetir a gravação", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.concluir.mockRejectedValue(new Error("Falha depois de gravar"));
    const resposta = await enviar();
    expect(resposta.status).toBe(303);
    expect(mocks.concluir).toHaveBeenCalledTimes(1);
    expect(mocks.aviso).toHaveBeenCalledWith("erro", expect.stringContaining("estado atualizado"));
    log.mockRestore();
  });
});
