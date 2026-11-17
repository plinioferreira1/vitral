import { describe, expect, it } from "vitest";
import { historicoAssinado, mesComercial, normalizarFonte, vendaAssinada, type ProcessoComercial } from "../fontes-vendas-regras";

const base: ProcessoComercial = {
  status: "ativo", situacao_comercial: null,
  data_assinatura: null, data_venda: null, mes_venda: "2026-11",
  data_conclusao: null, data_criacao: "2026-11-01",
};
describe("Fonte de Vendas: mesmo critério em planilha, gráfico e CSV", () => {
  it("não conta processo apenas aberto ou em andamento sem assinatura", () => {
    expect(vendaAssinada(base)).toBe(false);
    expect(vendaAssinada({ ...base, situacao_comercial: "andamento" })).toBe(false);
  });
  it("conta venda assinada ainda em andamento", () => {
    expect(vendaAssinada({ ...base, data_assinatura: "2026-11-08" })).toBe(true);
    expect(vendaAssinada({ ...base, data_venda: "2026-11-08" })).toBe(true);
  });
  it("preserva histórico legado concluído sem data importada", () => {
    expect(vendaAssinada({ ...base, situacao_comercial: "concluida" })).toBe(true);
    expect(historicoAssinado({ situacao_comercial: "concluida" })).toBe(true);
  });
  it("não conta venda cancelada mesmo com data", () => {
    expect(vendaAssinada({ ...base, status: "cancelado", data_assinatura: "2026-11-08" })).toBe(false);
    expect(historicoAssinado({ situacao_comercial: "cancelada" })).toBe(false);
  });
  it("mantém mês comercial explícito antes da conclusão", () => {
    expect(mesComercial({ ...base, data_conclusao: "2026-12-01" })).toBe("2026-11");
  });
  it("trata origem vazia ou indefinida de forma uniforme", () => {
    expect(normalizarFonte(" Indefinido ")).toBe("Não informado");
    expect(normalizarFonte(null)).toBe("Não informado");
    expect(normalizarFonte(" Instagram ")).toBe("Instagram");
  });
});
