import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
const m = vi.hoisted(() => ({ sessao: vi.fn(), salvar: vi.fn(), gerar: vi.fn(), criar: vi.fn(), outra: vi.fn(), aviso: vi.fn() }));
vi.mock("@/lib/usuario-atual", () => ({ exigirUsuario: m.sessao }));
vi.mock("@/lib/aviso", () => ({ avisar: m.aviso }));
vi.mock("../actions", () => ({ salvarTermo: m.salvar, gerarDocumento: m.gerar, criarTermo: m.criar, cancelarTermo: m.outra, criarNovaVersao: m.outra, duplicarTermo: m.outra, enviarLinkPorEmail: m.outra, enviarParaAssinatura: m.outra, salvarResponsavel: m.outra, voltarParaEdicao: m.outra }));
import { POST } from "./route";
const base = "https://vitral.example";
const id = "00000000-0000-4000-8000-000000000001";
function pedido(acao: string, json = true, origem = base) {
  const form = new FormData();
  form.set("id", id); form.set("acao", acao); form.set("documento", '{"local":"Brasília"}'); form.set("revisao", "revisao-original"); form.set("depois", "gerar");
  return new Request(`${base}/vendas/termos-entrega/comandos`, { method: "POST", headers: { origin: origem, accept: json ? "application/json" : "text/html" }, body: form });
}
beforeEach(() => {
  vi.resetAllMocks();
  m.sessao.mockResolvedValue({ userId: "autor" });
  m.salvar.mockResolvedValue({ ok: true, atualizadoEm: "nova-revisao" });
  m.gerar.mockImplementation(async () => redirect(`/vendas/termos-entrega/${id}`));
});
describe("confirmação fora da transição RSC", () => {
  it("salva antes de gerar e devolve destino JSON, sem HTML/RSC", async () => {
    const r = await POST(pedido("salvar"));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, destino: `/vendas/termos-entrega/${id}` });
    expect(m.salvar).toHaveBeenCalledWith(id, { local: "Brasília" }, "revisao-original");
    expect(m.salvar.mock.invocationCallOrder[0]).toBeLessThan(m.gerar.mock.invocationCallOrder[0]);
  });
  it("não gera nem navega se o salvamento falhar", async () => {
    m.salvar.mockResolvedValue({ ok: false, erro: "Revisão desatualizada" });
    const r = await POST(pedido("salvar"));
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ ok: false, erro: "Revisão desatualizada" });
    expect(m.gerar).not.toHaveBeenCalled();
  });
  it("redireciona POST nativo com 303 (o navegador faz GET sem repetir gravação)", async () => {
    const r = await POST(pedido("gerarDocumento", false));
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe(`${base}/vendas/termos-entrega/${id}`);
  });
  it("mantém o ID de criação e usa o destino confirmado pela ação", async () => {
    m.criar.mockImplementation(async () => redirect(`/vendas/termos-entrega/${id}`));
    const r = await POST(pedido("criarTermo"));
    expect((await r.json()).destino).toBe(`/vendas/termos-entrega/${id}`);
    expect(m.criar).toHaveBeenCalledTimes(1);
  });
  it("bloqueia origem externa, sessão ausente e ação desconhecida", async () => {
    expect((await POST(pedido("salvar", true, "https://outro.example"))).status).toBe(403);
    m.sessao.mockResolvedValueOnce(null);
    expect((await POST(pedido("salvar"))).status).toBe(401);
    expect((await POST(pedido("qualquerCoisa"))).status).toBe(400);
    expect(m.salvar).not.toHaveBeenCalled();
    expect(m.gerar).not.toHaveBeenCalled();
  });
});
