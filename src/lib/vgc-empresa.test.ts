import { describe, expect, it } from "vitest";
import { somarVgcEmpresa, type ComissaoConferidaVgc } from "./vgc-empresa";
import type { VendaVgv } from "./vgv-empresa";
const c = (id: string, valorCentavos: number, extra: Partial<ComissaoConferidaVgc> = {}): ComissaoConferidaVgc => ({ id, ano: 2026, imovel: id, fonte: "contrato", valorCentavos, ...extra });
const v = (id: string, extra: Partial<VendaVgv> = {}): VendaVgv => ({ id, categoria: "venda", status: "ativo", data_criacao: "2026-10-07", valor_total: 500000, ...extra });
describe("VGC conferido nos contratos", () => {
  it("preserva centavos e separa rateios pendentes do apurado", () => {
    const r = somarVgcEmpresa(2026, [], [c("a", 3241947), c("b", 753000, { pendencia: "rateio divergente" })]);
    expect(r.apuradoCentavos).toBe(3241947);
    expect(r.pendenteCentavos).toBe(753000);
    expect(r.vendasConferidas).toBe(1);
    expect(r.pendencias.map(p => p.id)).toEqual(["b"]);
  });
  it("mantém o total ao vincular o histórico ao pré-cadastro, sem adicionar o VGV à comissão", () => {
    expect(somarVgcEmpresa(2026, [], [c("a", 1000000)]).apuradoCentavos)
      .toBe(somarVgcEmpresa(2026, [v("venda")], [c("a", 1000000, { processoId: "venda" })]).apuradoCentavos);
  });
  it.each([{ status: "cancelado" }, { data_criacao: "2025-10-07" }, { categoria: "financiamento" }])("retira a comissão do cadastro inelegível %j", extra => {
    expect(somarVgcEmpresa(2026, [v("venda", extra)], [c("a", 100, { processoId: "venda" })]).apuradoCentavos).toBe(0);
  });
  it("não restaura valores de processos excluídos nem vendas de 2025 ainda ativas", () => {
    const historico = [c("a", 100, { processoId: "antiga" }), c("b", 200, { processoId: "apagada" }), c("c", 300, { ano: 2025 })];
    expect(somarVgcEmpresa(2026, [v("antiga")], historico, ["antiga"]).apuradoCentavos).toBe(0);
  });
  it("indica novas vendas que ainda precisam de conferência de comissão", () => {
    expect(somarVgcEmpresa(2026, [v("nova"), v("cancelada", { status: "cancelado" }), v("zero", { valor_total: 0 })], []).semConferencia).toBe(1);
  });
  it("rejeita comissões duplicadas, vínculos repetidos e valores inválidos", () => {
    expect(() => somarVgcEmpresa(2026, [], [c("a", 100), c("a", 200)])).toThrow();
    expect(() => somarVgcEmpresa(2026, [], [c("a", 100, { processoId: "x" }), c("b", 200, { processoId: "x" })])).toThrow();
    expect(() => somarVgcEmpresa(2026, [], [c("a", 1.1)])).toThrow();
    expect(() => somarVgcEmpresa(2026, [], [c("a", -1)])).toThrow();
  });
});
