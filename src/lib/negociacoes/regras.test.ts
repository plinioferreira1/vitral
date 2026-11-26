import { describe, expect, it } from "vitest";
import {
  filtrarNegociacoes,
  filtrarAcompanhamento,
  classificarAcompanhamento,
  filtroAcompanhamento,
  metricasNegociacoes,
  mesValido,
  podeEditarNegociacoes,
  validarCadastro,
  type Negociacao,
} from "./regras";
const n = (dados: Partial<Negociacao>): Negociacao => ({
  id: "n",
  tenant_id: "t",
  cliente_nome: "Cliente",
  telefone: "",
  vendedor_nome: "",
  codigo_san: "",
  imovel_endereco: "Imóvel",
  corretor_id: null,
  responsavel_id: "u",
  valor: 100.01,
  data_abertura: "2026-09-01",
  previsao_fechamento: null,
  proxima_acao: "",
  data_acompanhamento: null,
  observacoes: "",
  situacao: "em_andamento",
  encerrada_em: null,
  motivo_perda: null,
  processo_id: null,
  criado_por: "u",
  criado_em: "",
  atualizado_em: "",
  ...dados,
});
describe("acompanhamento operacional", () => {
  it("separa vencidas, hoje, sem data e futuras sem afetar encerradas", () => {
    const hoje = "2026-11-26";
    const lista = [
      n({ id: "v", data_acompanhamento: "2026-11-25" }),
      n({ id: "h", data_acompanhamento: hoje }),
      n({ id: "s", data_acompanhamento: null }),
      n({ id: "f", data_acompanhamento: "2026-12-01" }),
      n({ id: "p", situacao: "perdida", data_acompanhamento: "2026-11-01" }),
    ];
    expect(filtrarAcompanhamento(lista, "vencidas", hoje).map(n => n.id)).toEqual(["v"]);
    expect(filtrarAcompanhamento(lista, "hoje", hoje).map(n => n.id)).toEqual(["h"]);
    expect(filtrarAcompanhamento(lista, "sem_data", hoje).map(n => n.id)).toEqual(["s"]);
    expect(filtrarAcompanhamento(lista, "todos", hoje)).toHaveLength(5);
    expect(classificarAcompanhamento(lista[4], hoje)).toBe("todos");
  });
  it("não aceita filtro desconhecido", () => {
    expect(filtroAcompanhamento("vencidas")).toBe("vencidas");
    expect(filtroAcompanhamento("qualquer")).toBe("todos");
  });
});
describe("métricas comerciais", () => {
  it("usa o encerramento no fuso brasileiro e mantém abertas fora do denominador", () => {
    const lista = [
      n({}),
      n({ data_abertura: "2026-10-01" }),
      n({ situacao: "convertida", encerrada_em: "2026-11-01T02:59:59Z" }),
      n({ situacao: "perdida", encerrada_em: "2026-10-10T12:00:00Z" }),
      n({ situacao: "convertida", encerrada_em: "2026-10-01T02:59:59Z" }),
    ];
    expect(metricasNegociacoes(lista, "2026-10")).toMatchObject({
      abertas: 2,
      novas: 1,
      convertidas: 1,
      perdidas: 1,
      valorAberto: 200.02,
      taxa: 50,
    });
    expect(filtrarNegociacoes(lista, "convertida", "2026-09")).toHaveLength(1);
  });
  it("dez convertidas e cinco perdidas são 66,7%, mesmo abertas antes", () => {
    const lista = Array.from({ length: 15 }, (_, i) =>
      n({
        situacao: i < 10 ? "convertida" : "perdida",
        encerrada_em: "2026-10-15T12:00:00Z",
      }),
    );
    expect(metricasNegociacoes(lista, "2026-10").taxa).toBeCloseTo(66.6667, 3);
    expect(metricasNegociacoes(lista, "2026-11").taxa).toBeNull();
  });
  it("sem encerramentos não divide por zero e valida os filtros", () => {
    expect(metricasNegociacoes([], "2026-10").taxa).toBeNull();
    expect(mesValido("2026-13", "2026-10")).toBe("2026-10");
    expect(mesValido("0001-01", "2026-10")).toBe("2026-10");
    expect(filtrarNegociacoes([n({})], "todas", "2026-10")).toHaveLength(1);
  });
  it("respeita edição operacional sem conceder escrita ao auxiliar ou corretor", () => {
    expect(podeEditarNegociacoes("diretor", true)).toBe(true);
    expect(podeEditarNegociacoes("supervisor", false)).toBe(false);
    expect(podeEditarNegociacoes("auxiliar", true)).toBe(false);
    expect(podeEditarNegociacoes("corretor", true)).toBe(false);
  });
  it("recusa datas inválidas, abertura futura e valores inválidos", () => {
    const d = {
      cliente_nome: "Cliente",
      imovel_endereco: "Imóvel",
      valor: 0,
      data_abertura: "2026-10-21",
      previsao_fechamento: "",
      data_acompanhamento: "",
      responsavel_id: "u",
    };
    expect(validarCadastro(d, "2026-10-21")).toBeNull();
    expect(
      validarCadastro({ ...d, data_abertura: "2026-02-30" }, "2026-10-21"),
    ).toBeTruthy();
    expect(
      validarCadastro({ ...d, data_abertura: "2026-10-22" }, "2026-10-21"),
    ).toBeTruthy();
    expect(validarCadastro({ ...d, valor: NaN }, "2026-10-21")).toBeTruthy();
  });
});
