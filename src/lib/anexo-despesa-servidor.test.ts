import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ sessao: vi.fn(), despesa: vi.fn(), admin: vi.fn(), aviso: vi.fn(), upload: vi.fn(), remove: vi.fn(), upsert: vi.fn(), salvo: vi.fn(), anterior: vi.fn(), eq: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/usuario-atual", () => ({ exigirUsuario: m.sessao, GESTORES: ["diretor", "gerente"] }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => {
  const cadeia = { select: () => cadeia, eq: m.eq, single: m.despesa };
  m.eq.mockReturnValue(cadeia);
  return { from: () => cadeia };
} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: m.admin }));
vi.mock("@/lib/aviso", () => ({ avisar: m.aviso, checar: async (op: Promise<{ error: unknown }>) => !(await op).error }));
import { salvarAnexoDespesa, validarAnexoDespesa } from "./anexo-despesa-servidor";

function pdf() { return new File(["%PDF-1.7\nfixture"], "boleto.pdf", { type: "application/pdf" }); }

beforeEach(() => {
  vi.clearAllMocks();
  m.sessao.mockResolvedValue({ tenantId: "empresa", userId: "gestor" });
  m.despesa.mockResolvedValue({ data: { id: "despesa" }, error: null });
  m.anterior.mockResolvedValue({ data: { caminho: "empresa/despesa/antigo.pdf" }, error: null });
  m.upload.mockResolvedValue({ error: null });
  m.remove.mockResolvedValue({ error: null });
  m.salvo.mockResolvedValue({ data: { lancamento_id: "despesa" }, error: null });
  const leitura = { select: () => leitura, eq: () => leitura, maybeSingle: m.anterior };
  m.upsert.mockReturnValue({ select: () => ({ single: m.salvo }) });
  m.admin.mockReturnValue({ from: () => ({ ...leitura, upsert: m.upsert }), storage: { from: () => ({ upload: m.upload, remove: m.remove }) } });
});

describe("envio privado de documentos financeiros", () => {
  it("autoriza gestor e confere empresa e tipo antes de usar admin", async () => {
    expect(await salvarAnexoDespesa("despesa", pdf())).toBe(true);
    expect(m.sessao).toHaveBeenCalledWith(["diretor", "gerente"]);
    expect(m.eq).toHaveBeenCalledWith("tenant_id", "empresa");
    expect(m.eq).toHaveBeenCalledWith("tipo", "despesa");
    expect(m.upsert).toHaveBeenCalledWith(expect.objectContaining({ lancamento_id: "despesa", nome: "boleto.pdf", tenant_id: "empresa" }));
    expect(m.remove).toHaveBeenCalledWith(["empresa/despesa/antigo.pdf"]);
  });
  it("não inicia upload sem autorização", async () => {
    m.sessao.mockResolvedValue(null);
    expect(await salvarAnexoDespesa("despesa", pdf())).toBe(false);
    expect(m.admin).not.toHaveBeenCalled();
  });
  it("não usa admin para despesa inexistente, receita ou outra empresa", async () => {
    m.despesa.mockResolvedValue({ data: null });
    expect(await salvarAnexoDespesa("despesa", pdf())).toBe(false);
    expect(m.admin).not.toHaveBeenCalled();
  });
  it("preserva o arquivo anterior se o envio falhar", async () => {
    m.upload.mockResolvedValue({ error: { message: "offline" } });
    expect(await salvarAnexoDespesa("despesa", pdf())).toBe(false);
    expect(m.upsert).not.toHaveBeenCalled();
    expect(m.remove).not.toHaveBeenCalled();
  });
  it("limpa apenas o novo arquivo se o vínculo no banco falhar", async () => {
    m.salvo.mockResolvedValue({ error: { message: "falha ao salvar" } });
    expect(await salvarAnexoDespesa("despesa", pdf())).toBe(false);
    expect(m.remove).toHaveBeenCalledTimes(1);
    expect(m.remove.mock.calls[0][0][0]).not.toBe("empresa/despesa/antigo.pdf");
  });
  it("rejeita conteúdo disfarçado antes de enviar", async () => {
    const falso = new File(["<html>"], "boleto.pdf", { type: "application/pdf" });
    expect(await salvarAnexoDespesa("despesa", falso)).toBe(false);
    expect(m.upload).not.toHaveBeenCalled();
  });
  it("permite ausência de anexo na criação", async () => {
    expect(await validarAnexoDespesa(null)).toEqual({ arquivo: null, erro: null });
  });
});
