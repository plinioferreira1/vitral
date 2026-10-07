import { describe, expect, it } from "vitest";
import { filtrarConfiguracoes, GRUPOS_CONFIGURACOES } from "./configuracoes-menu";

describe("descoberta das configurações", () => {
  it("encontra rótulos sem exigir acentos ou maiúsculas", () => {
    expect(filtrarConfiguracoes(" USUARIOS ").flatMap((g) => g.links).map((l) => l.href)).toEqual(["/membros"]);
    expect(filtrarConfiguracoes("email")[0].links[0].href).toBe("/financeiro/configuracoes-email");
    expect(filtrarConfiguracoes("e-mail")[0].links[0].href).toBe("/financeiro/configuracoes-email");
  });
  it("encontra uma regra pela descrição e combina palavras da busca", () => {
    expect(filtrarConfiguracoes("jornada")[0].links[0].href).toBe("/dp/configuracoes");
    expect(filtrarConfiguracoes("financeiro categorias")[0].links[0].href).toBe("/financeiro/categorias");
  });
  it("mantém um único destino para cada configuração e não oferece rotas de operação", () => {
    const destinos = GRUPOS_CONFIGURACOES.flatMap((g) => g.links.map((l) => l.href));
    expect(new Set(destinos).size).toBe(destinos.length);
    expect(destinos).not.toContain("/financeiro/contas-a-pagar");
    expect(destinos).not.toContain("/ferias/configuracao");
  });
});
