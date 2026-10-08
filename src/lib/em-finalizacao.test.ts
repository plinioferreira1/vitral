import { describe, expect, it } from "vitest";
import { liberadoParaNivel } from "./em-finalizacao";
import { montarMenu } from "./menu";

describe("telas em finalização", () => {
  it("em finalização, só diretor e gerente entram", () => {
    for (const nivel of ["diretor", "gerente"]) expect(liberadoParaNivel("debitos", nivel, true)).toBe(true);
    for (const nivel of ["supervisor", "auxiliar", "corretor", "gerente_locacao", "social_media"]) expect(liberadoParaNivel("avaliacoes", nivel, true)).toBe(false);
  });
  it("liberado, vale a permissão normal do módulo", () => {
    expect(liberadoParaNivel("debitos", "supervisor", false)).toBe(true);
  });
  it("Controle de Débitos já entra para o supervisor (gerente de locação), mas não para os demais", () => {
    for (const nivel of ["supervisor", "gerente_locacao"]) expect(liberadoParaNivel("debitos", nivel, true)).toBe(true);
    for (const nivel of ["auxiliar", "corretor", "social_media"]) expect(liberadoParaNivel("debitos", nivel, true)).toBe(false);
    expect(liberadoParaNivel("termosEntrega", "supervisor", true)).toBe(false);
  });
  it("o menu mostra o Controle de Débitos ao supervisor com Locação, e só a ele fora da gestão", () => {
    const supervisor = { ehCorretor: false, ehSocialMedia: false, nivelComAcessoTotal: false, podeConfigurar: false, temVenda: false, temFinanciamento: false, temLocacao: true };
    expect(JSON.stringify(montarMenu(supervisor))).toContain("/locacao/debitos");
    expect(JSON.stringify(montarMenu({ ...supervisor, temLocacao: false }))).not.toContain("/locacao/debitos");
    expect(JSON.stringify(montarMenu(supervisor))).not.toContain("/avaliacoes");
  });
  it("o menu não mostra as telas a quem não é da gestão", () => {
    const base = { ehCorretor: false, ehSocialMedia: false, nivelComAcessoTotal: true, temVenda: true, temFinanciamento: true, temLocacao: true };
    const hrefs = (podeConfigurar: boolean) => JSON.stringify(montarMenu({ ...base, podeConfigurar }));
    expect(hrefs(false)).not.toContain("/avaliacoes");
    expect(hrefs(false)).not.toContain("/locacao/debitos");
    expect(hrefs(false)).not.toContain("/vendas/termos-entrega");
    expect(hrefs(false)).not.toContain("/ferias");
    expect(hrefs(true)).toContain('"/ferias"');
    expect(hrefs(true)).toContain("Departamento pessoal");
    for (const rota of ["/dp", "/dp/colaboradores", "/ferias", "/dp/ponto", "/dp/ausencias", "/dp/documentos", "/dp/configuracoes"]) expect(hrefs(true)).toContain(`"${rota}"`);
    expect(hrefs(false)).not.toContain("Departamento pessoal");
    expect(hrefs(true)).toContain('"/vendas/termos-entrega"');
    expect(hrefs(true)).toContain("/vendas/termos-entrega/configuracao");
    expect(hrefs(true)).toContain('"/avaliacoes"');
    expect(hrefs(true)).toContain("/locacao/debitos");
  });
});
