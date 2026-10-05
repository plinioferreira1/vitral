import { expect, it } from "vitest";
import { identificacaoProcesso } from "./identificacao-processo";

it("usa SAN em vendas e proposta/contrato em financiamentos", () => {
  const processo = { codigo_san: " 12345 ", numero_proposta_contrato: " 987654 " };
  expect(identificacaoProcesso(processo, "venda")).toBe("SAN 12345");
  expect(identificacaoProcesso(processo, "financiamento")).toBe("Proposta/contrato 987654");
});
it("indica números não cadastrados sem exibir o código interno PROC", () => {
  expect(identificacaoProcesso({}, "venda")).toBe("Código SAN não informado");
  expect(identificacaoProcesso({ numero_proposta_contrato: " " }, "financiamento")).toBe("Proposta/contrato não informado");
});
