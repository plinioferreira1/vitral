import { beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({
  sessao: { usuario: { tenant_id: "tenant-a" }, user: { id: "usuario-a" } } as { usuario: { tenant_id: string }; user: { id: string } } | null,
  insert: vi.fn(), create: vi.fn(), avisar: vi.fn(), resposta: { data: { id: "ficha-a" }, error: null } as { data: { id: string } | null; error: { message: string } | null },
}));
vi.mock("@/lib/usuario-atual", () => ({ exigirUsuario: async () => fake.sessao }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => {
  fake.create(); return { from: () => ({ insert: (dados: unknown) => { fake.insert(dados); return { select: () => ({ single: async () => fake.resposta }) }; } }) };
} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/aviso", () => ({ avisar: fake.avisar, checar: async (op: PromiseLike<{ error: unknown }>) => !(await op).error }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
import { criarFichaLocacao } from "./actions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
function form(valores: Record<string, string> = {}) { const f = new FormData(); for (const [k,v] of Object.entries(valores)) f.set(k,v); return f; }
beforeEach(() => { vi.clearAllMocks(); fake.sessao = { usuario: { tenant_id: "tenant-a" }, user: { id: "usuario-a" } }; fake.resposta = { data: { id: "ficha-a" }, error: null }; });
describe("link de locação sem cadastro antecipado", () => {
  it("cria solicitação vazia na empresa do usuário, com validade padrão e sem identidade fictícia", async () => {
    const antes = Date.now(); await criarFichaLocacao(form());
    expect(fake.insert).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: "tenant-a", criado_por: "usuario-a", proponente_nome: null, proponente_email: null, imovel_referencia: null, dados: {} }));
    const registro = fake.insert.mock.calls[0][0];
    expect(new Date(registro.expira_em).getTime()).toBeGreaterThanOrEqual(antes + 30 * 86400000);
    expect(registro).not.toHaveProperty("token"); // UUID individual continua gerado pelo banco.
    expect(redirect).toHaveBeenCalledWith("/locacao/ficha-cadastral/ficha-a");
    expect(revalidatePath).toHaveBeenCalledWith("/locacao/ficha-cadastral");
  });
  it("aceita apenas o imóvel sem nome/e-mail e ignora empresa enviada pelo navegador", async () => {
    await criarFichaLocacao(form({ imovel_referencia: "  Imóvel de teste  ", tenant_id: "outra-empresa", validade_dias: "7" }));
    expect(fake.insert).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: "tenant-a", dados: { imovel_interesse: "Imóvel de teste" }, proponente_nome: null }));
  });
  it("preserva preenchimento antecipado opcional e normaliza e-mail", async () => {
    await criarFichaLocacao(form({ proponente_nome: "  Cliente Fictício  ", proponente_email: " CLIENTE@EXEMPLO.INVALID " }));
    expect(fake.insert).toHaveBeenCalledWith(expect.objectContaining({ proponente_nome: "Cliente Fictício", proponente_email: "cliente@exemplo.invalid", dados: { nome_completo: "Cliente Fictício", email: "cliente@exemplo.invalid" } }));
  });
  it("recusa validade adulterada e e-mail inválido antes de gravar", async () => {
    for (const validade of ["NaN", "0", "90", "7.5", ""]) await criarFichaLocacao(form({ validade_dias: validade }));
    await criarFichaLocacao(form({ proponente_email: "invalido" }));
    expect(fake.insert).not.toHaveBeenCalled(); expect(fake.avisar).toHaveBeenCalled();
  });
  it("não cria link sem sessão autenticada", async () => {
    fake.sessao = null; await criarFichaLocacao(form());
    expect(fake.create).not.toHaveBeenCalled(); expect(fake.insert).not.toHaveBeenCalled();
  });
  it("não redireciona para uma ficha inexistente quando a criação falha", async () => {
    fake.resposta = { data: null, error: { message: "falha" } }; await criarFichaLocacao(form());
    expect(redirect).not.toHaveBeenCalled();
  });
});
