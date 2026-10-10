import { describe, expect, it } from "vitest";
import { somarVgvEmpresa, rankingVgvEmpresa, type VendaVgv } from "./vgv-empresa";

const venda = (id: string, valor: number | null, extra: Partial<VendaVgv> = {}): VendaVgv => ({
  id, valor_total: valor, categoria: "venda", status: "ativo", data_criacao: "2026-10-09", ...extra,
});
const historico = [
  { linha: 4, valorCentavos: 100_00 },
  { linha: 5, valorCentavos: 200_00, processoId: "existente" },
];
describe("VGV histórico e vendas cadastradas", () => {
  it("substitui o valor da planilha pelo cadastro sem duplicar", () => {
    expect(somarVgvEmpresa(2026, [venda("existente", 250)], historico).realizadoCentavos).toBe(350_00);
  });
  it("inclui uma venda nova imediatamente, mesmo com o mesmo preço de outra", () => {
    const antes = somarVgvEmpresa(2026, [venda("existente", 250)], historico);
    const depois = somarVgvEmpresa(2026, [venda("existente", 250), venda("nova", 250)], historico);
    expect(depois.realizadoCentavos - antes.realizadoCentavos).toBe(250_00);
  });
  it("não restaura a linha antiga após cancelamento, exclusão ou mudança de ano", () => {
    expect(somarVgvEmpresa(2026, [], historico).realizadoCentavos).toBe(100_00);
    expect(somarVgvEmpresa(2026, [venda("existente", 250, { status: "cancelado" })], historico).realizadoCentavos).toBe(100_00);
    expect(somarVgvEmpresa(2026, [venda("existente", 250, { data_criacao: "2025-01-01" })], historico).realizadoCentavos).toBe(100_00);
  });
  it("considera vendas ativas e concluídas, exclui outras categorias e outros anos", () => {
    const resultado = somarVgvEmpresa(2026, [
      venda("ativa", 10), venda("concluida", 20, { status: "concluido" }),
      venda("cancelada", 30, { status: "cancelado" }), venda("financiamento", 40, { categoria: "financiamento" }),
      venda("antiga", 50, { data_criacao: "2025-12-31" }), venda("futura", 60, { data_criacao: "2027-01-01" }),
    ], []);
    expect(resultado.realizadoCentavos).toBe(30_00);
  });
  it("sinaliza cadastros sem valor e soma centavos sem perda", () => {
    expect(somarVgvEmpresa(2026, [venda("a", null), venda("b", 0), venda("c", 0.1), venda("d", 0.2)], []))
      .toEqual({ realizadoCentavos: 30, cadastradoCentavos: 30, historicoCentavos: 0, semValor: 2, numeroVendas: 2 });
  });
  it("rejeita valores negativos e duplicações", () => {
    expect(() => somarVgvEmpresa(2026, [venda("a", -1)], [])).toThrow();
    expect(() => somarVgvEmpresa(2026, [venda("a", 1), venda("a", 1)], [])).toThrow();
    expect(() => somarVgvEmpresa(2026, [], [historico[0], historico[0]])).toThrow();
    expect(() => somarVgvEmpresa(2026, [], [historico[1], { ...historico[1], linha: 6 }])).toThrow();
  });
});

describe("ranking por participação", () => {
  const equipe = [{ id: "amanda", nome: "Amanda" }, { id: "plinio", nome: "Plínio", aliases: ["plinio-legado"] }];
  it("atribui o VGV integral aos dois e só uma vez à empresa", () => {
    const vendas = [venda("compartilhada", 500, { captador_id: "amanda", corretor_id: "plinio" })];
    expect(somarVgvEmpresa(2026, vendas, []).realizadoCentavos).toBe(500_00);
    expect(rankingVgvEmpresa(2026, vendas, [], equipe).ranking.map(r => r.valorCentavos)).toEqual([500_00, 500_00]);
  });
  it("não duplica o mesmo corretor nos dois papéis ou em IDs legados", () => {
    const resultado = rankingVgvEmpresa(2026, [venda("a", 500, { captador_id: "plinio", corretor_id: "plinio-legado" })], [], equipe);
    expect(resultado.ranking).toEqual([{ id: "plinio", nome: "Plínio", valorCentavos: 500_00, vendas: 1, posicao: 1 }]);
  });
  it("exclui parceiros do ranking sem retirar a venda do VGV geral", () => {
    const historico = [{ linha: 4, valorCentavos: 100_00, participantesIds: ["externo", "amanda", "amanda"] }];
    expect(rankingVgvEmpresa(2026, [], historico, equipe).ranking).toHaveLength(1);
    expect(somarVgvEmpresa(2026, [], historico).realizadoCentavos).toBe(100_00);
  });
  it("usa participação histórica com valor atual sem duplicar e aceita papéis atualizados", () => {
    const historico = [{ linha: 4, valorCentavos: 100_00, processoId: "a", participantesIds: ["amanda", "plinio"] }];
    expect(rankingVgvEmpresa(2026, [venda("a", 250)], historico, equipe).ranking.map(r => r.valorCentavos)).toEqual([250_00, 250_00]);
    expect(rankingVgvEmpresa(2026, [venda("a", 250, { captador_id: "amanda", corretor_id: "amanda" })], historico, equipe).ranking).toHaveLength(1);
  });
  it("respeita a remoção explícita do captador de uma participação histórica", () => {
    const historico = [{ linha: 4, valorCentavos: 100_00, processoId: "a", participantesIds: ["amanda", "plinio"] }];
    const resultado = rankingVgvEmpresa(2026, [venda("a", 250, { corretor_id: "amanda", captador_id: null, participacao_vgv_revisada: true })], historico, equipe);
    expect(resultado.ranking.map(r => r.id)).toEqual(["amanda"]);
  });
  it("não inventa corretor para participação ausente nem restaura vendas canceladas", () => {
    const resultado = rankingVgvEmpresa(2026, [venda("sem", 10), venda("cancelada", 30, { status: "cancelado", corretor_id: "amanda" })], [], equipe);
    expect(resultado).toEqual({ ranking: [], semParticipacao: 1 });
  });
});

// Processos antigos podem ser abertos no ano atual por pendências operacionais.
it("retira vendas de anos anteriores do total e ranking sem recuperar o histórico vinculado", () => {
  const vendas = [
    venda("oasis-antigo", 1_600_000, { corretor_id: "amanda" }),
    venda("bouganville-antigo", 345_000, { corretor_id: "amanda" }),
    venda("nova-venda-oasis", 900_000, { corretor_id: "amanda" }),
  ];
  const historico = [{ linha: 4, valorCentavos: 160_000_000, processoId: "oasis-antigo", participantesIds: ["amanda"] }];
  const excluidos = ["oasis-antigo", "bouganville-antigo"];
  expect(somarVgvEmpresa(2026, vendas, historico, excluidos).realizadoCentavos).toBe(90_000_000);
  expect(rankingVgvEmpresa(2026, vendas, historico, [{ id: "amanda", nome: "Amanda" }], excluidos).ranking)
    .toEqual([{ id: "amanda", nome: "Amanda", valorCentavos: 90_000_000, vendas: 1, posicao: 1 }]);
  expect(vendas).toHaveLength(3);
  expect(vendas.every(v => v.status === "ativo")).toBe(true);
});

 it("conta as vendas do VGV uma vez, sem vínculos cancelados e sem valor", () => {
  const resultado = somarVgvEmpresa(2026, [
    venda("vinculada", 250, { captador_id: "amanda", corretor_id: "plinio" }),
    venda("nova", 250), venda("cancelada", 100, { status: "cancelado" }),
    venda("sem", null), venda("antiga", 500),
  ], [
    { linha: 1, valorCentavos: 20000, processoId: "vinculada" },
    { linha: 2, valorCentavos: 10000 },
    { linha: 3, valorCentavos: 10000, processoId: "cancelada" },
    { linha: 4, valorCentavos: 10000, processoId: "excluida" },
    { linha: 5, valorCentavos: 0 },
  ], ["antiga"]);
  expect(resultado.numeroVendas).toBe(3);
  expect(resultado.realizadoCentavos).toBe(60000);
});
