import { describe, expect, it } from "vitest";
import { corretoresComissao, escolhaCorretorValida } from "./corretores-comissao";

describe("opções de corretores nas comissões", () => {
  const cadastros = ["Amanda", "Camila", "Maysa", "Michele", "Plinio", "Plínio", "Ricardo", "Renato", "ww"].map((nome, i) => ({ id: String(i), nome }));
  it("mostra somente a equipe indicada, com nomes completos e sem duplicatas", () => {
    expect(corretoresComissao(cadastros).map(c => c.nome)).toEqual(["Amanda Martins", "Ricardo Martins", "Camila Louzeiro", "Michele Maciel", "Plínio Ferreira"]);
  });
  it("preserva o ID de qualquer versão do corretor já selecionada", () => {
    for (const id of ["4", "5"]) expect(corretoresComissao(cadastros, id).find(c => c.nome === "Plínio Ferreira")?.id).toBe(id);
  });
  it("prefere o cadastro com nome completo e não inventa IDs ausentes", () => {
    expect(corretoresComissao([...cadastros, { id: "completo", nome: "Amanda Martins" }])[0].id).toBe("completo");
    expect(corretoresComissao([{ id: "outro", nome: "Amanda Souza" }])).toEqual([]);
  });
  it("prefere um cadastro já vinculado à conta, mas mantém o ID de uma venda existente", () => {
    const dados = [{ id: "antigo", nome: "Camila", usuario_id: "conta" }, { id: "novo", nome: "Camila Louzeiro", usuario_id: null }];
    expect(corretoresComissao(dados)[0].id).toBe("antigo");
    expect(corretoresComissao(dados, "novo")[0].id).toBe("novo");
  });
  it("recusa ID externo, nome digitado e cadastro antigo como nova escolha", () => {
    expect(escolhaCorretorValida(cadastros, "externo", "externo")).toBe(false);
    expect(escolhaCorretorValida(cadastros, "Amanda Martins")).toBe(false);
    expect(escolhaCorretorValida(cadastros, "2")).toBe(false);
    expect(escolhaCorretorValida(cadastros, "2", "2")).toBe(true);
    expect(escolhaCorretorValida(cadastros, null)).toBe(true);
  });
});
