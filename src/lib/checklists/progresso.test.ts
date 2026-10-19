import { describe, expect, it } from "vitest";
import { ordenarChecklists, progresso, progressoChecklist, type ChecklistModelo } from "./progresso";

const conformidade: ChecklistModelo = {
  id: "c1", nome: "Checklist de Conformidade", descricao: null, ordem: 1,
  grupos: [
    { id: "g2", nome: "Vendedores", observacao: null, ordem: 2, itens: [{ id: "v1", texto: "Documento", ordem: 1 }] },
    { id: "g1", nome: "Compradores", observacao: null, ordem: 1, itens: [{ id: "c2", texto: "Renda", ordem: 2 }, { id: "c1", texto: "Documento", ordem: 1 }] },
  ],
};
const vazio: ChecklistModelo = { id: "c2", nome: "E-notariado", descricao: null, ordem: 2, grupos: [] };

describe("checklists do processo", () => {
  it("ordena seções e itens e esconde checklist sem itens", () => {
    const [c, ...resto] = ordenarChecklists([vazio, conformidade]);
    expect(resto).toHaveLength(0);
    expect(c.grupos.map((g) => g.nome)).toEqual(["Compradores", "Vendedores"]);
    expect(c.grupos[0].itens.map((i) => i.id)).toEqual(["c1", "c2"]);
  });
  it("calcula o progresso ignorando marcas de itens que saíram do modelo", () => {
    expect(progressoChecklist(conformidade, new Set(["c1", "x"]))).toEqual({ total: 3, feitos: 1, completo: false, percentual: 33 });
    expect(progressoChecklist(conformidade, new Set(["c1", "c2", "v1"])).completo).toBe(true);
    expect(progresso([], new Set())).toEqual({ total: 0, feitos: 0, completo: false, percentual: 0 });
  });
});
