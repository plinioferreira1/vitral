import { describe, expect, it } from "vitest";
import { lerTodasPaginas, resumoLista } from "./resumo-lista";

describe("resumo da lista filtrada", () => {
  it("separa saldo, baixas e nominal, sem somar pagos e cancelados ao aberto", () => {
    const lista = [
      { id: "pendente", valor: 100.1, status: "pendente" },
      { id: "parcial", valor: 200, status: "pago_parcial" },
      { id: "pago", valor: 80, status: "pago" },
      { id: "cancelado", valor: 900, status: "cancelado" },
    ];
    expect(resumoLista(lista, [
      { lancamento_id: "parcial", valor: 50.05 },
      { lancamento_id: "pago", valor: 80 },
      { lancamento_id: "fora-da-selecao", valor: 1000 },
    ])).toEqual({ aberto: 250.05, baixado: 130.05, nominal: 380.1 });
  });
  it("soma cada ocorrência selecionada, sem trazer próximas recorrências", () => {
    const serie = [
      { id: "hoje-1", valor: 0.1, status: "pendente", recorrencia_id: "serie" },
      { id: "hoje-2", valor: 0.2, status: "pendente", recorrencia_id: "serie" },
      { id: "amanha", valor: 900, status: "pendente", recorrencia_id: "serie" },
    ];
    expect(resumoLista(serie.slice(0, 2), []).aberto).toBe(0.3);
    expect(resumoLista([], [])).toEqual({ aberto: 0, baixado: 0, nominal: 0 });
  });
  it("carrega mais que mil registros e propaga falhas sem exibir totais incompletos", async () => {
    const registros = Array.from({ length: 1201 }, (_, id) => ({ id }));
    expect((await lerTodasPaginas(async (inicio, fim) => ({ data: registros.slice(inicio, fim + 1), error: null }))).data).toHaveLength(1201);
    await expect(lerTodasPaginas(async () => ({ data: null, error: { message: "indisponível" } }))).rejects.toThrow("indisponível");
  });
});
