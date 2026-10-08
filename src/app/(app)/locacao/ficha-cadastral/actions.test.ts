import { beforeEach, describe, expect, it, vi } from "vitest";

const id = "11111111-1111-4111-8111-111111111111";
const filho = "22222222-2222-4222-8222-222222222222";
const fake = vi.hoisted(() => ({
  sessao: { tenantId: "tenant-a" } as { tenantId: string } | null,
  respostas: [] as { data: unknown; error: { message: string } | null }[],
  filtros: [] as [string, unknown][], excluir: vi.fn(), remover: vi.fn(), admin: vi.fn(), avisar: vi.fn(),
}));
vi.mock("@/lib/usuario-atual", () => ({ exigirUsuario: vi.fn(async () => fake.sessao) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => {
  fake.admin();
  return {
    from: () => {
      const chain = {
        select: () => chain,
        eq: (key: string, value: unknown) => { fake.filtros.push([key, value]); return chain; },
        in: (key: string, value: unknown) => { fake.filtros.push([key, value]); return chain; },
        delete: () => { fake.excluir(); return chain; },
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(fake.respostas.shift() ?? { data: [], error: null }).then(resolve),
      };
      return chain;
    },
    storage: { from: () => ({ remove: fake.remover }) },
  };
} }));
vi.mock("@/lib/aviso", () => ({ avisar: fake.avisar, checar: async (op: PromiseLike<{ error: unknown }>) => !(await op).error }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
import { excluirFichasLocacao } from "./actions";
import { exigirUsuario } from "@/lib/usuario-atual";

function form(ids = [id]) { const dados = new FormData(); ids.forEach((i) => dados.append("ids", i)); return dados; }
function resposta(data: unknown, error: { message: string } | null = null) { return { data, error }; }
beforeEach(() => {
  vi.clearAllMocks(); fake.sessao = { tenantId: "tenant-a" }; fake.filtros = [];
  fake.respostas = [resposta([{ id }]), resposta([]), resposta([{ caminho_storage: `tenant-a/${id}/arquivo.pdf` }]), resposta([{ id }])];
  fake.remover.mockResolvedValue({ error: null });
});
describe("exclusão de fichas cadastrais", () => {
  it("exige gestão autenticada antes de acessar o cliente administrativo", async () => {
    fake.sessao = null;
    await excluirFichasLocacao(form());
    expect(exigirUsuario).toHaveBeenCalledWith(["diretor", "gerente"]);
    expect(fake.admin).not.toHaveBeenCalled();
  });
  it("recusa identificadores inválidos e seleções acima do limite", async () => {
    await excluirFichasLocacao(form(["invalido"]));
    await excluirFichasLocacao(form(Array.from({ length: 101 }, (_, i) => `${String(i).padStart(8, "0")}-1111-4111-8111-111111111111`)));
    expect(fake.admin).not.toHaveBeenCalled();
  });
  it("recusa ficha que não pertence à empresa", async () => {
    fake.respostas[0] = resposta([]);
    await excluirFichasLocacao(form());
    expect(fake.filtros).toContainEqual(["tenant_id", "tenant-a"]);
    expect(fake.excluir).not.toHaveBeenCalled();
  });
  it("recusa excluir titular com pessoa vinculada fora da confirmação", async () => {
    fake.respostas[1] = resposta([{ id: filho, tenant_id: "tenant-a" }]);
    await excluirFichasLocacao(form());
    expect(fake.excluir).not.toHaveBeenCalled();
    expect(fake.remover).not.toHaveBeenCalled();
  });
  it("interrompe ao falhar a leitura dos anexos ou ao encontrar caminho de outra empresa", async () => {
    fake.respostas[2] = resposta(null, { message: "falha" });
    await excluirFichasLocacao(form());
    expect(fake.excluir).not.toHaveBeenCalled();
    fake.respostas = [resposta([{ id }]), resposta([]), resposta([{ caminho_storage: "tenant-b/arquivo.pdf" }])];
    await excluirFichasLocacao(form());
    expect(fake.excluir).not.toHaveBeenCalled();
  });
  it("não apaga arquivos se a exclusão no banco falhar", async () => {
    fake.respostas[3] = resposta(null, { message: "falha ao excluir" });
    await excluirFichasLocacao(form());
    expect(fake.remover).not.toHaveBeenCalled();
  });
  it("exclui as fichas selecionadas e limpa somente seus anexos", async () => {
    await excluirFichasLocacao(form());
    expect(fake.excluir).toHaveBeenCalledOnce();
    expect(fake.filtros).toContainEqual(["id", [id]]);
    expect(fake.remover).toHaveBeenCalledWith([`tenant-a/${id}/arquivo.pdf`]);
    expect(fake.avisar).toHaveBeenCalledWith("sucesso", expect.stringContaining("1 ficha excluída"));
  });
  it("informa quando a exclusão terminou mas a limpeza dos arquivos falhou", async () => {
    fake.remover.mockResolvedValue({ error: { message: "storage indisponível" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    await excluirFichasLocacao(form());
    expect(fake.avisar).toHaveBeenCalledWith("erro", expect.stringContaining("fichas foram excluídas"));
    vi.restoreAllMocks();
  });
});
