import { beforeEach, describe, expect, it, vi } from "vitest";
import { montarConteudo, hashConteudo } from "@/lib/avaliacao/conteudo";
import { LIMIARES_PADRAO, type AvaliacaoBase } from "@/lib/avaliacao/tipos";
import type { AvaliacaoCompleta } from "./dados";

const m = vi.hoisted(() => ({
  sessao: vi.fn(), carregar: vi.fn(), avisar: vi.fn(), revalidate: vi.fn(), pdf: vi.fn(), upload: vi.fn(),
  from: vi.fn(), writes: [] as { table: string; patch: Record<string, unknown> }[],
}));
vi.mock("@/lib/usuario-atual", () => ({ exigirUsuario: m.sessao }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: m.from, storage: { from: () => ({ upload: m.upload }) } }) }));
vi.mock("@/lib/aviso", () => ({ avisar: m.avisar, checar: async (op: PromiseLike<{ error: unknown }>) => !(await op).error }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidate }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("@/lib/site-url", () => ({ obterSiteUrl: async () => "https://vitral.test" }));
vi.mock("@/lib/avaliacao/pdf", () => ({ gerarPdfAvaliacao: m.pdf }));
vi.mock("./dados", async (original) => ({
  ...await original<typeof import("./dados")>(), carregarAvaliacao: m.carregar,
  carregarImagensPdf: async () => ({}), carregarFontesPdf: async () => null,
}));
import { emitirLaudoComercial, salvarEtapa, salvarLaudoComercial } from "./actions";

let c: AvaliacaoCompleta;
function form(valores: Record<string, string> = {}) {
  const f = new FormData(); f.set("avaliacao_id", "av-teste");
  for (const [k, v] of Object.entries(valores)) f.set(k, v);
  return f;
}
beforeEach(() => {
  vi.clearAllMocks(); m.writes.length = 0;
  m.sessao.mockResolvedValue({ userId: "gestor", tenantId: "empresa", nivel: "gerente", usuario: { nome: "Gestor fictício" } });
  const a: AvaliacaoBase = {
    id: "av-teste", codigo: "AV-TESTE", modalidade: "estudo_comercial", finalidade: "venda", tipologia: "residencial", status: "rascunho",
    titulo: "Imóvel fictício", proprietario_nome: null, bairro: null, cidade: "Brasília", data_base: "2026-10-09", area_m2: 80,
    dados: { solicitante_nome: "Cliente fictício", endereco: "Rua fictícia", matricula: "Matrícula preservada", conclusao_texto: "Conclusão comercial." },
    valor_calculado: null, faixa_min: null, faixa_max: null, faixa_manual: false, valor_sugerido: 700000,
    margem_negociacao_pct: null, valor_proprietario: null, revisao: 1, versao_atual: 0,
  };
  const responsavel = { usuario_id: null, nome: "", creci: "", cnai: "", curriculo: "", telefone: "", email: "" };
  c = { avaliacao: a, config: { existe: false, responsavel, limiares: LIMIARES_PADRAO, fontesExternas: [] },
    comparaveis: [], arquivos: [], linha: { ...a, tenant_id: "empresa", criado_por: "gestor", aprovado_hash: null, aprovado_por: null, aprovado_em: null },
    conteudo: montarConteudo({ avaliacao: a, comparaveis: [], arquivos: [], responsavel, limiares: LIMIARES_PADRAO }),
  } as unknown as AvaliacaoCompleta;
  m.carregar.mockImplementation(async () => c);
  m.pdf.mockResolvedValue(new Uint8Array([1, 2, 3])); m.upload.mockResolvedValue({ error: null });
  m.from.mockImplementation((table: string) => {
    let patch: Record<string, unknown> | null = null;
    const query = {
      select: () => query, eq: () => query, in: () => query,
      update: (p: Record<string, unknown>) => { patch = p; m.writes.push({ table, patch: p }); return query; },
      insert: (p: Record<string, unknown>) => { m.writes.push({ table, patch: p }); return query; },
      single: () => query, maybeSingle: () => query,
      then: (resolve: (v: unknown) => unknown) => {
        if (patch && table === "avaliacoes") {
          Object.assign(c.linha, patch);
          Object.assign(c.avaliacao, patch);
          if (patch.status === "aprovado") Object.assign(c.linha, { aprovado_por: "gestor", aprovado_em: "2026-10-09T12:00:00Z" });
          c.conteudo = montarConteudo({ avaliacao: c.avaliacao, comparaveis: [], arquivos: [], responsavel, limiares: LIMIARES_PADRAO });
        }
        return Promise.resolve(resolve({ error: null, data: table === "avaliacoes" ? { id: "av-teste" } : table === "usuarios" ? [{ id: "gestor", nome: "Gestor fictício", cargo: "Gerente" }] : [] }));
      },
    };
    return query;
  });
});

describe("laudo comercial simplificado", () => {
  it("salva cliente e imóvel juntos sem apagar os dados antigos omitidos", async () => {
    await salvarEtapa(form({ etapa: "dados_comerciais", titulo: "Novo título", endereco: "Novo endereço", solicitante_nome: "Outro cliente", area_m2: "90", data_base: "2026-10-09", finalidade: "venda", tipologia: "residencial" }));
    expect(c.avaliacao).toMatchObject({ titulo: "Novo título", area_m2: 90, dados: { endereco: "Novo endereço", solicitante_nome: "Outro cliente", matricula: "Matrícula preservada" } });
    expect(m.revalidate).toHaveBeenCalledWith("/avaliacoes/av-teste");
  });
  it("uma edição abre rascunho e invalida a aprovação, preservando as versões emitidas", async () => {
    c.avaliacao.status = "emitido"; c.linha.versao_atual = 2; c.linha.aprovado_hash = "anterior";
    await salvarLaudoComercial(form({ valor_sugerido: "710.000,50", conclusao_texto: "Nova conclusão." }));
    expect(c.linha).toMatchObject({ status: "rascunho", aprovado_hash: null, versao_atual: 2, valor_sugerido: 710000.5 });
    expect(m.writes.some(w => w.table === "avaliacao_versoes")).toBe(false);
  });
  it("não emite para usuário sem atribuição ou avaliação com pendências", async () => {
    m.sessao.mockResolvedValue({ userId: "aux", tenantId: "empresa", nivel: "auxiliar", usuario: { nome: "Auxiliar" } });
    await emitirLaudoComercial(form());
    expect(m.pdf).not.toHaveBeenCalled();
    m.sessao.mockResolvedValue({ userId: "gestor", tenantId: "empresa", nivel: "gerente", usuario: { nome: "Gestor" } });
    c.conteudo.precificacao.valor_sugerido = null;
    await emitirLaudoComercial(form());
    expect(m.writes).toHaveLength(0);
  });
  it("não emite conteúdo alterado depois da aprovação", async () => {
    c.avaliacao.status = "aprovado"; c.linha.aprovado_hash = "hash-desatualizado";
    await emitirLaudoComercial(form());
    expect(m.pdf).not.toHaveBeenCalled();
    expect(m.upload).not.toHaveBeenCalled();
    expect(c.linha.status).toBe("rascunho");
  });
  it("um único envio aprova, gera o PDF e guarda o retrato imutável com o valor manual", async () => {
    const hash = hashConteudo(c.conteudo);
    await expect(emitirLaudoComercial(form())).rejects.toThrow("redirect:/avaliacoes/av-teste?etapa=historico");
    expect(m.pdf).toHaveBeenCalledWith(expect.objectContaining({ precificacao: expect.objectContaining({ valor_sugerido: 700000 }) }), expect.objectContaining({ rascunho: false, versao: 1 }));
    const versao = m.writes.find(w => w.table === "avaliacao_versoes");
    expect(versao?.patch).toMatchObject({ numero: 1, hash_conteudo: hash, valor_sugerido: 700000, tenant_id: "empresa" });
    expect(m.upload).toHaveBeenCalledWith(expect.stringContaining("empresa/av-teste/versoes/"), expect.any(Uint8Array), { contentType: "application/pdf", upsert: false });
    expect(c.linha.status).toBe("emitido");
  });
  it("salvar e emitir usa os dados do formulário, sem emitir uma versão antiga", async () => {
    await expect(salvarLaudoComercial(form({ acao: "emitir", valor_sugerido: "725.000,50", conclusao_texto: "Conclusão recém digitada." }))).rejects.toThrow("redirect:/avaliacoes/av-teste?etapa=historico");
    expect(m.pdf).toHaveBeenCalledWith(expect.objectContaining({ dados: expect.objectContaining({ conclusao_texto: "Conclusão recém digitada." }), precificacao: expect.objectContaining({ valor_sugerido: 725000.5 }) }), expect.anything());
  });
  it("salvar sem mudanças preserva a aprovação existente", async () => {
    c.avaliacao.status = "aprovado";
    await salvarLaudoComercial(form({ valor_sugerido: "700000", conclusao_texto: "Conclusão comercial." }));
    expect(m.writes).toHaveLength(0);
    expect(c.avaliacao.status).toBe("aprovado");
  });
  it("falha de PDF mantém aprovação recuperável e não cria versão emitida", async () => {
    m.pdf.mockRejectedValueOnce(new Error("falha fictícia"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await emitirLaudoComercial(form());
    expect(c.linha.status).toBe("aprovado");
    expect(m.writes.some(w => w.table === "avaliacao_versoes")).toBe(false);
    log.mockRestore();
  });
});
