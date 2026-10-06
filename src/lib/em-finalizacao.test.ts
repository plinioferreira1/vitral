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
