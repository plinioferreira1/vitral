import { expect, it } from "vitest";
import { mediaCorretagem } from "./media-corretagem";

const comissoes = [{ id: "a", ano: 2026, imovel: "A", valorCentavos: 1, fonte: "teste" }, { id: "b", ano: 2026, imovel: "B", valorCentavos: 1, fonte: "teste" }];
it("calcula a média simples da comissão integral sem usar o VGC", () => {
  const r = mediaCorretagem(2026, [], comissoes, [{ id: "a", vendaCentavos: 10000, comissaoCentavos: 300 }, { id: "b", vendaCentavos: 20000, comissaoCentavos: 1000 }]);
  expect(r.percentual).toBe(4);
  expect(r.quantidade).toBe(2);
});
it("não trata dados ausentes como zero", () => {
  expect(mediaCorretagem(2026, [], comissoes, []).percentual).toBeNull();
  expect(mediaCorretagem(2026, [], comissoes, []).pendentes).toHaveLength(2);
});
it("exclui vínculos cancelados ou ausentes", () => {
  const c = [{ ...comissoes[0], processoId: "x" }];
  expect(mediaCorretagem(2026, [], c, []).pendentes).toHaveLength(0);
  expect(mediaCorretagem(2026, [{ id: "x", categoria: "venda", status: "cancelado", data_criacao: "2026-01-01", valor_total: 100 }], c, []).quantidade).toBe(0);
});
it("rejeita duplicação e divisão por zero", () => {
  const c = { id: "a", vendaCentavos: 0, comissaoCentavos: 300 };
  expect(() => mediaCorretagem(2026, [], comissoes, [c])).toThrow();
  expect(() => mediaCorretagem(2026, [], comissoes, [c, c])).toThrow();
});
