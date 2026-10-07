import { describe, expect, it } from "vitest";
import {
  areasDoUsuario,
  descricaoAcesso,
  normalizarBusca,
  resumoDP,
  rotuloNivel,
} from "./acessos";

describe("resumo de acessos reais", () => {
  it("auxiliar acessa a operação inteira, mas não a administração", () => {
    const areas = areasDoUsuario("auxiliar", []);
    expect(areas).toEqual(
      expect.arrayContaining(["Vendas", "Financiamentos", "Locação"]),
    );
    expect(areas).not.toContain("Financeiro");
    expect(areas).not.toContain("Configurações");
  });
  it("categorias de supervisor não liberam financeiro nem áreas não escolhidas", () => {
    const areas = areasDoUsuario("supervisor", ["locacao", "marketing"]);
    expect(areas).toContain("Locação");
    for (const area of [
      "Vendas",
      "Financiamentos",
      "Financeiro",
      "Configurações",
      "Marketing",
    ])
      expect(areas).not.toContain(area);
  });
  it("corretor e social media não recebem operação mesmo com categorias gravadas", () => {
    expect(areasDoUsuario("corretor", ["venda", "locacao"])).toEqual([
      "Documentos",
      "Ferramentas",
    ]);
    expect(areasDoUsuario("social_media", ["venda"])).toEqual(["Ferramentas"]);
  });
  it("mostra DP restrito à gestão enquanto o módulo está em finalização", () => {
    expect(resumoDP("diretor", false, 0)).toBe("Administração do DP");
    expect(resumoDP("supervisor", true, 5)).toMatch(/Aguardando liberação/);
    expect(areasDoUsuario("supervisor", [])).not.toContain(
      "Departamento pessoal",
    );
  });
  it("preserva nível legado com as regras de categoria, sem conceder administração", () => {
    expect(rotuloNivel("gerente_locacao")).toContain("legado");
    expect(areasDoUsuario("gerente_locacao", ["locacao"])).toContain("Locação");
    expect(areasDoUsuario("gerente_locacao", ["locacao"])).not.toContain(
      "Configurações",
    );
    expect(descricaoAcesso("gerente_locacao")).toMatch(/categorias/);
  });
  it("busca ignora caixa, acentos e espaços externos", () => {
    expect(normalizarBusca("  PLÍNIO Ferreira ")).toBe("plinio ferreira");
  });
});
