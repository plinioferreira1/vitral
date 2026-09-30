import { describe, expect, it } from "vitest";
import { descreverDias, diferencaDias, montarResumoProcessos, type EtapaResumo, type ProcessoResumo } from "./resumo-processos";

const hoje = "2026-09-30";
const processos: ProcessoResumo[] = [
  { id: "p1", numero_processo: "V-001", categoria: "venda", endereco: "Scorpius 102", data_final_contrato: "2026-10-06" },
  { id: "p2", numero_processo: "F-002", categoria: "financiamento", endereco: null, data_final_contrato: "2026-12-31" },
  { id: "p3", numero_processo: "V-003", categoria: "venda", endereco: "Oasis 1802A", data_final_contrato: "2026-09-20" },
];
const etapa = (id: string, processo_id: string, data_prevista: string, nome = id): EtapaResumo => ({
  id,
  nome,
  data_prevista,
  processo_id,
  responsavel: null,
});

describe("montarResumoProcessos", () => {
  const r = montarResumoProcessos(
    processos,
    [
      etapa("registro", "p3", "2026-09-04"),
      etapa("liberacao", "p1", "2026-09-30"),
      etapa("vistoria", "p2", "2026-10-07"),
      etapa("longe", "p2", "2026-10-08"),
      etapa("orfa", "p-inexistente", "2026-09-30"),
    ],
    hoje
  );

  it("separa atrasadas, de hoje e dos próximos 7 dias (ignora além disso)", () => {
    expect(r.atrasadas.map((i) => [i.etapa, i.dias])).toEqual([["registro", -26]]);
    expect(r.hoje.map((i) => i.etapa)).toEqual(["liberacao"]);
    expect(r.proximos.map((i) => [i.etapa, i.dias])).toEqual([["vistoria", 7]]);
  });

  it("usa o endereço do imóvel, ou o número do processo se não houver", () => {
    expect(r.hoje[0].imovel).toBe("Scorpius 102");
    expect(r.proximos[0].imovel).toBe("F-002");
  });

  it("lista prazos de contrato vencidos ou nos próximos 30 dias, do mais urgente", () => {
    expect(r.prazosContrato.map((p) => [p.imovel, p.dias])).toEqual([
      ["Oasis 1802A", -10],
      ["Scorpius 102", 6],
    ]);
  });

  it("conta os processos em andamento", () => {
    expect(r.processosEmAndamento).toBe(3);
  });
});

describe("datas", () => {
  it("diferença em dias atravessa meses", () => {
    expect(diferencaDias("2026-09-30", "2026-10-01")).toBe(1);
    expect(diferencaDias("2026-10-01", "2026-09-30")).toBe(-1);
  });
  it("texto amigável", () => {
    expect(descreverDias(0)).toBe("hoje");
    expect(descreverDias(1)).toBe("em 1 dia");
    expect(descreverDias(-3)).toBe("há 3 dias");
  });
});
