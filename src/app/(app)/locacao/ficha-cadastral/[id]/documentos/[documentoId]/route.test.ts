import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  sessao: vi.fn(), rpc: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), assinar: vi.fn(), bucket: vi.fn(),
}));
vi.mock("@/lib/usuario-atual", () => ({ getUsuarioAtual: m.sessao }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: m.rpc, from: m.from, storage: { from: m.bucket } }) }));
import { GET } from "./route";
const abrir = () => GET(new Request("https://vitral.example/arquivo"), { params: Promise.resolve({ id: "ficha", documentoId: "documento" }) });
describe("abrir documento da ficha", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.sessao.mockResolvedValue({ user: { id: "katia" }, usuario: { ativo: true, tenant_id: "empresa", nivel_acesso: "supervisor" } });
    m.rpc.mockResolvedValue({ data: true, error: null });
    const query = { select: m.select, eq: m.eq, maybeSingle: m.maybeSingle };
    m.from.mockReturnValue(query); m.select.mockReturnValue(query); m.eq.mockReturnValue(query);
    m.maybeSingle.mockResolvedValue({ data: { caminho_storage: "empresa/ficha/arquivo.pdf" }, error: null });
    m.bucket.mockReturnValue({ createSignedUrl: m.assinar });
    m.assinar.mockResolvedValue({ data: { signedUrl: "https://storage.example/novo" }, error: null });
  });
  it("supervisor de Locação recebe link novo a cada clique, sem guardar redirecionamento", async () => {
    const primeira = await abrir();
    m.assinar.mockResolvedValueOnce({ data: { signedUrl: "https://storage.example/outro" }, error: null });
    const segunda = await abrir();
    expect(primeira.status).toBe(307);
    expect(primeira.headers.get("location")).toBe("https://storage.example/novo");
    expect(segunda.headers.get("location")).toBe("https://storage.example/outro");
    expect(segunda.headers.get("cache-control")).toBe("private, no-store");
    expect(m.assinar).toHaveBeenCalledTimes(2);
    expect(m.assinar).toHaveBeenCalledWith("empresa/ficha/arquivo.pdf", 60);
    expect(m.eq).toHaveBeenCalledWith("ficha_id", "ficha");
    expect(m.eq).toHaveBeenCalledWith("id", "documento");
    expect(m.eq).toHaveBeenCalledWith("fichas_cadastrais_locacao.tenant_id", "empresa");
  });
  it("exige sessão e acesso ativo", async () => {
    m.sessao.mockResolvedValueOnce({ user: null, usuario: null });
    expect((await abrir()).status).toBe(401);
    m.sessao.mockResolvedValueOnce({ user: { id: "x" }, usuario: { ativo: false, tenant_id: "empresa" } });
    expect((await abrir()).status).toBe(403);
    expect(m.assinar).not.toHaveBeenCalled();
  });
  it("nega quem não possui Locação", async () => {
    m.rpc.mockResolvedValueOnce({ data: false, error: null });
    expect((await abrir()).status).toBe(403);
    expect(m.from).not.toHaveBeenCalled();
  });
  it("não assina documento de outra ficha ou empresa", async () => {
    m.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect((await abrir()).status).toBe(404);
    m.maybeSingle.mockResolvedValueOnce({ data: { caminho_storage: "outra/ficha/arquivo.pdf" }, error: null });
    expect((await abrir()).status).toBe(404);
    m.maybeSingle.mockResolvedValueOnce({ data: { caminho_storage: "empresa/outra/arquivo.pdf" }, error: null });
    expect((await abrir()).status).toBe(404);
    expect(m.assinar).not.toHaveBeenCalled();
  });
  it("mostra erro recuperável quando o armazenamento falha", async () => {
    m.assinar.mockResolvedValueOnce({ data: null, error: { message: "falhou" } });
    const r = await abrir();
    expect(r.status).toBe(503);
    expect(await r.text()).toContain("Tente novamente");
  });
});
