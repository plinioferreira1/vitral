import { describe, expect, it } from "vitest";
import { hrefAtivoMenu, montarMenu, type ItemMenu } from "./menu";
import type { PermissoesUsuario } from "./permissoes";

const gestor: PermissoesUsuario = {
  ehCorretor: false, ehSocialMedia: false, nivelComAcessoTotal: true,
  podeConfigurar: true, temVenda: true, temFinanciamento: true, temLocacao: true,
};
function destinos(itens: ItemMenu[]): string[] {
  return itens.flatMap((item) => "href" in item ? [item.href] :
    item.children.flatMap((filho) => "href" in filho ? [filho.href] : filho.children.map((neto) => neto.href)));
}
describe("navegação por acesso", () => {
  it("posiciona Métricas da empresa imediatamente abaixo de Calendário", () => {
    const menu = montarMenu(gestor);
    const indice = menu.findIndex(item => "href" in item && item.href === "/calendario");
    expect(menu[indice + 1]).toEqual({ href: "/painel-sacra", label: "Métricas da empresa" });
    expect(destinos([menu.find(item => item.label === "Relatórios")!])).not.toContain("/painel-sacra");
  });
  it("mantém financeiro, relatórios e administração fora do menu do auxiliar", () => {
    const itens = montarMenu({ ...gestor, podeConfigurar: false });
    expect(itens.map((i) => i.label)).not.toContain("Configurações");
    expect(destinos(itens).some((href) => href.startsWith("/financeiro"))).toBe(false);
    expect(destinos(itens)).not.toContain("/relatorio-semanal");
    expect(destinos(itens)).not.toContain("/painel-sacra");
    expect(destinos(itens)).toContain("/locacao?aba=multa");
  });
  it("não oferece calendário operacional ou multa ao corretor", () => {
    const hrefs = destinos(montarMenu({ ...gestor, ehCorretor: true }));
    expect(hrefs).toContain("/avaliacoes");
    expect(hrefs).toContain("/minhas-vendas");
    expect(hrefs).not.toContain("/painel-sacra");
    expect(hrefs.some((h) => h.startsWith("/vendas"))).toBe(false);
    expect(hrefs).not.toContain("/calendario");
    expect(hrefs).not.toContain("/locacao?aba=multa");
    expect(hrefs.some((h) => h.startsWith("/financeiro"))).toBe(false);
  });
  it("não oferece documentos ou administração ao social media", () => {
    expect(montarMenu({ ...gestor, ehSocialMedia: true }).map((i) => i.label))
      .toEqual(["Início", "Ferramentas", "Central de ajuda"]);
  });
  it("respeita categorias e não oferece multa sem acesso à locação", () => {
    const hrefs = destinos(montarMenu({ ...gestor, podeConfigurar: false, temVenda: false, temLocacao: false }));
    expect(hrefs.some((h) => h.startsWith("/vendas") || h.startsWith("/locacao"))).toBe(false);
    expect(hrefs).toContain("/financiamentos?aba=andamento");
  });
  it("cada destino tem uma única entrada principal", () => {
    const hrefs = destinos(montarMenu(gestor));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toContain("/painel-sacra");
    expect(hrefs).not.toContain("/financeiro/agenda");
    // a calculadora de custas do financiamento é diferente da simulação de cartório
    expect(hrefs).toContain("/financiamentos?aba=custas");
    expect(hrefs).toContain("/cartorio");
  });
  it("centraliza as configurações e não duplica regras de pessoal no menu operacional", () => {
    const menu = montarMenu(gestor);
    const configuracoes = menu.find((i) => i.label === "Configurações")!;
    expect(destinos([configuracoes])).toContain("/configuracoes");
    expect(destinos([configuracoes])).toContain("/dp/configuracoes");
    expect(destinos([menu.find((i) => i.label === "Departamento pessoal")!])).not.toContain("/dp/configuracoes");
    expect(destinos(montarMenu({ ...gestor, podeConfigurar: false }))).not.toContain("/configuracoes");
  });
});
describe("destino ativo", () => {
  const menu = montarMenu(gestor);
  it.each([
    ["/vendas", "", "/vendas?aba=resumo"],
    ["/financiamentos", "", "/financiamentos?aba=resumo"],
    ["/locacao", "", "/locacao?aba=resumo"],
    ["/financiamentos", "aba=custas", "/financiamentos?aba=custas"],
    ["/dp", "", "/dp"],
    ["/dp/colaboradores/123", "aba=ponto", "/dp/colaboradores"],
    ["/ferias/equipe", "aba=calendario", "/ferias"],
    ["/dp/ponto", "colaborador=1", "/dp/ponto"],
    ["/financeiro/relatorios", "", "/financeiro/relatorios"],
    ["/financeiro/configuracoes-email", "", "/financeiro/configuracoes-email"],
    ["/avaliacoes/configuracao", "", "/avaliacoes/configuracao"],
    ["/avaliacoes/123", "", "/avaliacoes"],
    ["/locacao/ficha-cadastral/123", "", "/locacao/ficha-cadastral"],
    ["/locacao", "aba=multa", "/locacao?aba=multa"],
    ["/locacao", "aba=contratos", "/locacao?aba=contratos"],
    ["/financeiro/pessoas/123/editar", "", "/financeiro/pessoas"],
  ])("marca apenas o destino específico em %s?%s", (pathname, query, esperado) => {
    expect(hrefAtivoMenu(menu, pathname, new URLSearchParams(query))).toBe(esperado);
  });
  it("não confunde prefixos semelhantes", () => {
    expect(hrefAtivoMenu(menu, "/avaliacoes-outra", new URLSearchParams())).toBeUndefined();
  });
});

describe("avaliações em ferramentas", () => {
  it("substitui a estimativa avulsa sem duplicar o acesso", () => {
    const itens = montarMenu(gestor);
    const ferramentas = itens.find((i) => i.label === "Ferramentas")!;
    expect(destinos([ferramentas])).toContain("/avaliacoes");
    expect(destinos(itens)).not.toContain("/avaliacao-imovel");
    expect(destinos([itens.find((i) => i.label === "Documentos")!])).not.toContain("/avaliacoes");
    expect(destinos(montarMenu({ ...gestor, ehSocialMedia: true }))).not.toContain("/avaliacoes");
  });
});
