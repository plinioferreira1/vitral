import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ sessao: vi.fn(), inserir: vi.fn(), validar: vi.fn(), salvar: vi.fn(), aviso: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/usuario-atual", () => ({ exigirUsuario: m.sessao, GESTORES: ["diretor", "gerente"] }));
vi.mock("@/lib/anexo-despesa-servidor", () => ({ validarAnexoDespesa: m.validar, salvarAnexoDespesa: m.salvar }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: (tabela: string) => ({ insert: (dados: unknown) => {
  m.inserir(tabela, dados);
  return tabela === "financeiro_recorrencias"
    ? { select: () => ({ single: async () => ({ data: { id: "recorrencia" }, error: null }) }) }
    : Promise.resolve({ error: null });
} }) }) }));
vi.mock("@/lib/aviso", () => ({ avisar: m.aviso, checar: async (op: Promise<{ error: unknown }>) => !(await op).error }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
import { criarLancamento } from "./lancamentos-actions";

const arquivo = new File(["%PDF-1.7"], "boleto.pdf", { type: "application/pdf" });
function formulario(recorrente = false) {
  const f = new FormData();
  f.set("tipo", "despesa"); f.set("descricao", "Boleto teste"); f.set("valor", "100,00"); f.set("vencimento", "2026-10-07");
  if (recorrente) { f.set("recorrente", "on"); f.set("numero_ocorrencias", "3"); f.set("frequencia", "mensal"); }
  return f;
}
beforeEach(() => {
  vi.clearAllMocks();
  m.sessao.mockResolvedValue({ userId: "gestor", tenantId: "empresa" });
  m.validar.mockResolvedValue({ arquivo, erro: null });
  m.salvar.mockResolvedValue(true);
  m.redirect.mockImplementation(() => { throw new Error("redirect"); });
});
describe("anexo durante a criação de uma despesa", () => {
  it("vincula o documento à despesa que acabou de ser salva", async () => {
    await expect(criarLancamento(formulario())).rejects.toThrow("redirect");
    const dados = m.inserir.mock.calls[0][1];
    expect(m.salvar).toHaveBeenCalledWith(dados.id, arquivo);
    expect(m.inserir).toHaveBeenCalledTimes(1);
  });
  it("anexa só à primeira ocorrência e não copia o boleto à série", async () => {
    await expect(criarLancamento(formulario(true))).rejects.toThrow("redirect");
    const ocorrencias = m.inserir.mock.calls.find(([tabela]) => tabela === "financeiro_lancamentos")![1];
    expect(ocorrencias).toHaveLength(3);
    expect(m.salvar).toHaveBeenCalledTimes(1);
    expect(m.salvar).toHaveBeenCalledWith(ocorrencias[0].id, arquivo);
    expect(m.inserir.mock.calls[0][1]).not.toHaveProperty("anexo");
  });
  it("preserva despesa salva e encaminha ao reenvio se o upload falhar", async () => {
    m.salvar.mockResolvedValue(false);
    await expect(criarLancamento(formulario())).rejects.toThrow("redirect");
    const dados = m.inserir.mock.calls[0][1];
    expect(m.redirect).toHaveBeenCalledWith(`/financeiro/lancamentos/${dados.id}/anexos`);
    expect(m.inserir).toHaveBeenCalledTimes(1);
    expect(m.aviso).toHaveBeenCalledWith("erro", expect.stringContaining("A despesa foi salva"));
  });
  it("rejeita arquivo inválido antes de criar qualquer lançamento", async () => {
    m.validar.mockResolvedValue({ arquivo: null, erro: "Arquivo inválido" });
    await criarLancamento(formulario());
    expect(m.inserir).not.toHaveBeenCalled();
    expect(m.salvar).not.toHaveBeenCalled();
  });
});
