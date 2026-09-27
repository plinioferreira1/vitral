import { afterEach, describe, expect, it, vi } from "vitest";
import { calcularInfoDias, parseBR, anoBissexto } from "./proporcionalidade";
import { buscarFaixa, FAIXAS_ESCRITURA, FAIXAS_REGISTRO } from "./emolumentos-cartorio";
import { calcularUrgencia } from "./alertas";
import { ocorrenciasDaTarefa, type RegraTarefa } from "./tarefas-recorrentes";
import { gerarEtapas, recalcularDataDependente } from "./motor-processos";
import type { ModeloEtapa } from "./types";

describe("proporcionalidade", () => {
  it("conta os dias incluindo início e fim", () => {
    expect(calcularInfoDias("2026-09-01", "2026-09-15", "monthDays", false)).toEqual({
      dias: 15,
      divisor: 30,
      divisorLabel: "Dias no mês de referência: 30",
    });
  });
  it("divisores: anual (bissexto ou não) e fixo 30", () => {
    expect(calcularInfoDias("2026-01-01", "2026-12-31", "annual", false)?.divisor).toBe(365);
    expect(calcularInfoDias("2028-01-01", "2028-12-31", "annual", true)).toMatchObject({ dias: 366, divisor: 366 });
    expect(calcularInfoDias("2026-02-01", "2026-02-28", "fixed30", false)).toMatchObject({ dias: 28, divisor: 30 });
  });
  it("mês de referência é o da data final (fevereiro)", () => {
    expect(calcularInfoDias("2026-02-10", "2026-02-28", "monthDays", false)?.divisor).toBe(28);
  });
  it("datas inválidas", () => {
    expect(calcularInfoDias("", "2026-02-28", "monthDays", false)).toBeNull();
  });
  it("parseBR entende valores digitados", () => {
    expect(parseBR("R$ 2.500,75")).toBe(2500.75);
    expect(parseBR("1500")).toBe(1500);
    expect(parseBR("")).toBeNaN();
  });
  it("ano bissexto", () => {
    expect(anoBissexto(2028)).toBe(true);
    expect(anoBissexto(2100)).toBe(false);
    expect(anoBissexto(2000)).toBe(true);
  });
});

describe("emolumentos de cartório", () => {
  it("valor exatamente no limite fica na faixa", () => {
    expect(buscarFaixa(9524.89, FAIXAS_ESCRITURA)).toBe(461.27);
    expect(buscarFaixa(9524.9, FAIXAS_ESCRITURA)).toBe(701.11);
  });
  it("faixas intermediárias e última faixa sem limite", () => {
    expect(buscarFaixa(450000, FAIXAS_ESCRITURA)).toBe(2490.81);
    expect(buscarFaixa(5_000_000, FAIXAS_ESCRITURA)).toBe(3044.32);
    expect(buscarFaixa(450000, FAIXAS_REGISTRO)).toBe(1383.78);
    expect(buscarFaixa(5_000_000, FAIXAS_REGISTRO)).toBe(2306.3);
  });
  it("faixas estão em ordem crescente e só a última é aberta", () => {
    for (const faixas of [FAIXAS_ESCRITURA, FAIXAS_REGISTRO]) {
      const limites = faixas.slice(0, -1).map((f) => f.ate as number);
      expect([...limites].sort((a, b) => a - b)).toEqual(limites);
      expect(faixas[faixas.length - 1].ate).toBeNull();
    }
  });
});

describe("urgência das etapas", () => {
  afterEach(() => vi.useRealTimers());
  // 26/09/2026 12:00 em Brasília
  const agora = new Date("2026-09-26T15:00:00Z");

  it("classifica por dias até o vencimento", () => {
    vi.useFakeTimers();
    vi.setSystemTime(agora);
    const u = (data: string | null, status = "pendente") =>
      calcularUrgencia({ status: status as "pendente", data_prevista: data }).urgencia;
    expect(u("2026-09-25")).toBe("atrasada");
    expect(u("2026-09-26")).toBe("vence_hoje");
    expect(u("2026-10-03")).toBe("vence_em_breve");
    expect(u("2026-10-04")).toBe("no_prazo");
    expect(u(null)).toBe("sem_data");
    expect(u("2026-01-01", "concluida")).toBe("concluida");
  });

  it("às 22h em Brasília ainda é o mesmo dia (servidor em UTC já virou)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-27T01:00:00Z")); // 26/09 22h em Brasília
    expect(calcularUrgencia({ status: "pendente", data_prevista: "2026-09-26" }).urgencia).toBe("vence_hoje");
  });
});

describe("tarefas recorrentes da locação", () => {
  const tarefa = (tipo_regra: RegraTarefa["tipo_regra"], dia_fixo: number | null = null): RegraTarefa => ({
    id: "t",
    nome: "t",
    tipo_regra,
    dia_fixo,
    periodicidade: tipo_regra === "toda_segunda" ? "semanal" : "mensal",
  });
  const ref = new Date(2026, 7, 15); // agosto/2026 (dia 1 é sábado)
  const dias = (r: { data: Date }[]) => r.map((o) => o.data.getDate());

  it("primeiro dia útil pula o fim de semana", () => {
    expect(dias(ocorrenciasDaTarefa(tarefa("primeiro_dia_util"), ref))).toEqual([3]);
  });
  it("dia fixo no fim de semana antecipa para sexta", () => {
    // 08/08/2026 é sábado → sexta 07/08
    expect(dias(ocorrenciasDaTarefa(tarefa("dia_fixo", 8), ref))).toEqual([7]);
  });
  it("toda segunda gera uma competência por semana", () => {
    const r = ocorrenciasDaTarefa(tarefa("toda_segunda"), ref);
    expect(dias(r)).toEqual([3, 10, 17, 24, 31]);
    expect(r[0].competencia).toBe("2026-08-03");
  });
  it("primeira segunda usa competência do mês", () => {
    expect(ocorrenciasDaTarefa(tarefa("primeira_segunda"), ref)).toEqual([
      { data: new Date(2026, 7, 3), competencia: "2026-08-01" },
    ]);
  });
});

describe("motor de etapas dos processos", () => {
  const modelo = (p: Partial<ModeloEtapa> & Pick<ModeloEtapa, "id" | "ordem" | "tipo_regra_data">): ModeloEtapa => ({
    modelo_processo_id: "m",
    nome: p.id,
    responsavel_padrao_perfil: null,
    dias_offset: 0,
    etapa_referencia_id: null,
    obrigatoria: true,
    ...p,
  });

  it("gera datas por regra e encadeia etapas dependentes", () => {
    const base = new Date(2026, 8, 1);
    const etapas = gerarEtapas(
      [
        modelo({ id: "registro", ordem: 3, tipo_regra_data: "relativa_etapa_anterior", dias_offset: 10, etapa_referencia_id: "itbi" }),
        modelo({ id: "assinatura", ordem: 1, tipo_regra_data: "fixa" }),
        modelo({ id: "itbi", ordem: 2, tipo_regra_data: "relativa_criacao", dias_offset: 5 }),
        modelo({ id: "vistoria", ordem: 4, tipo_regra_data: "manual" }),
      ],
      base
    );
    expect(etapas.map((e) => [e.nome, e.data_prevista])).toEqual([
      ["assinatura", "2026-09-01"],
      ["itbi", "2026-09-06"],
      ["registro", "2026-09-16"],
      ["vistoria", null],
    ]);
  });

  it("recalcula a dependente a partir da data realizada", () => {
    expect(recalcularDataDependente(new Date(2026, 8, 20), 10)).toBe("2026-09-30");
  });
});
