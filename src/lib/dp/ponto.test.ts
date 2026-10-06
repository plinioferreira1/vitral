import { describe, expect, it } from "vitest";
import {
  JORNADA_PADRAO,
  bancoDeHoras,
  calcularDia,
  cargaSemanalHoras,
  diasDoMes,
  duracao,
  espelho,
  instanteDe,
  localDe,
  minutosDaJornada,
  minutosTrabalhados,
  normalizarJornada,
  permissoesDP,
  podeDecidirSobre,
  podeRegistrar,
  proximoRegistro,
  resumir,
  statusHoje,
  type ContextoPonto,
  type RegistrosDia,
} from "./ponto";

const regras = { toleranciaMin: 10, horaExtraLimiteDiarioMin: 120 };
const h = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3);
const dia = (registros: RegistrosDia, extra: Partial<Parameters<typeof calcularDia>[0]> = {}) =>
  calcularDia({ data: "2026-10-06", hoje: "2026-10-08", agoraMin: h("12:00"), jornada: JORNADA_PADRAO, registros, ferias: false, ausencia: null, regras, ...extra });
const completo = (entrada: string, saida: string): RegistrosDia => ({ entrada: h(entrada), saida_intervalo: h("12:00"), retorno_intervalo: h("13:00"), saida: h(saida) });

describe("tempo e jornada", () => {
  it("converte instante para a hora de Brasília e de volta", () => {
    expect(localDe("2026-10-06T12:05:00Z")).toEqual({ data: "2026-10-06", minutos: h("09:05") });
    expect(localDe("2026-10-07T01:30:00Z")).toEqual({ data: "2026-10-06", minutos: h("22:30") });
    expect(localDe(instanteDe("2026-10-06", "13:02"))).toEqual({ data: "2026-10-06", minutos: h("13:02") });
  });
  it("jornada padrão: 8h por dia, 40h por semana", () => {
    expect(minutosDaJornada(JORNADA_PADRAO)).toBe(480);
    expect(cargaSemanalHoras(JORNADA_PADRAO)).toBe(40);
    expect(normalizarJornada({ dias: [1, 2, 3, 4, 5, 6], entrada: "8:00", saida: "17:00", intervalo_min: 60 })).toEqual({ dias: [1, 2, 3, 4, 5, 6], entrada: "08:00", saida: "17:00", intervalo_min: 60 });
    expect(normalizarJornada(null)).toEqual(JORNADA_PADRAO);
    expect(duracao(125)).toBe("2h05");
    expect(duracao(-30, true)).toBe("−0h30");
    expect(duracao(45, true)).toBe("+0h45");
    expect(diasDoMes("2028-02").length).toBe(29);
  });
});

describe("sequência dos registros", () => {
  it("segue entrada, intervalo, retorno e saída; permite encerrar sem intervalo", () => {
    expect(proximoRegistro({})).toEqual({ proximo: "entrada", alternativa: null });
    expect(proximoRegistro({ entrada: 540 })).toEqual({ proximo: "saida_intervalo", alternativa: "saida" });
    expect(proximoRegistro({ entrada: 540, saida_intervalo: 720 })).toEqual({ proximo: "retorno_intervalo", alternativa: null });
    expect(proximoRegistro(completo("09:00", "18:00")).proximo).toBeNull();
  });
  it("recusa registro fora de ordem ou com horário anterior ao último", () => {
    expect(podeRegistrar({}, "saida", 600)).toContain("Entrada");
    expect(podeRegistrar({ entrada: 540 }, "saida_intervalo", 500)).toContain("anterior");
    expect(podeRegistrar({ entrada: 540 }, "saida", 900)).toBeNull();
    expect(podeRegistrar(completo("09:00", "18:00"), "entrada", 1100)).toContain("encerrado");
  });
  it("conta as horas com e sem intervalo, inclusive com o dia em andamento", () => {
    expect(minutosTrabalhados(completo("09:00", "18:00"))).toEqual({ minutos: 480, completo: true });
    expect(minutosTrabalhados({ entrada: h("09:00"), saida: h("15:00") })).toEqual({ minutos: 360, completo: true });
    expect(minutosTrabalhados({ entrada: h("09:00") }, h("11:30"))).toEqual({ minutos: 150, completo: false });
    expect(minutosTrabalhados({ entrada: h("09:00"), saida_intervalo: h("12:00") }, h("12:40")).minutos).toBe(180);
  });
});

describe("cálculo do dia", () => {
  it("normal, com tolerância", () => {
    expect(dia(completo("09:00", "18:00"))).toMatchObject({ previstas: 480, trabalhadas: 480, saldo: 0, situacao: "normal" });
    expect(dia(completo("09:08", "18:00"))).toMatchObject({ saldo: 0, situacao: "normal" });
  });
  it("hora extra e atraso além da tolerância", () => {
    expect(dia(completo("09:00", "19:30"))).toMatchObject({ saldo: 90, situacao: "hora_extra", excedeLimite: false });
    expect(dia(completo("09:00", "21:30"))).toMatchObject({ saldo: 210, excedeLimite: true });
    expect(dia(completo("09:40", "18:00"))).toMatchObject({ saldo: -40, situacao: "atraso" });
  });
  it("dia útil passado sem registro é falta; hoje é só 'ainda não registrou'", () => {
    expect(dia({})).toMatchObject({ saldo: -480, situacao: "falta" });
    expect(dia({}, { data: "2026-10-08" })).toMatchObject({ saldo: 0, situacao: "sem_registro" });
    expect(dia({}, { data: "2026-10-04" })).toMatchObject({ previstas: 0, situacao: "folga" }); // domingo
  });
  it("férias e ausência abonada nunca geram falta", () => {
    expect(dia({}, { ferias: true })).toMatchObject({ previstas: 0, saldo: 0, situacao: "ferias" });
    expect(dia({}, { ausencia: { tipo: "Atestado", abona: true } })).toMatchObject({ previstas: 0, saldo: 0, situacao: "afastamento", detalhe: "Atestado" });
    expect(dia({}, { ausencia: { tipo: "Folga", abona: true } }).situacao).toBe("folga");
    expect(dia({}, { ausencia: { tipo: "Falta", abona: false } })).toMatchObject({ saldo: -480, situacao: "falta" });
  });
  it("ponto incompleto não entra no saldo até ser corrigido", () => {
    expect(dia({ entrada: h("09:00"), saida_intervalo: h("12:00") })).toMatchObject({ saldo: 0, situacao: "ponto_incompleto", trabalhadas: 180 });
    expect(dia({ entrada: h("09:00"), saida_intervalo: h("12:00"), saida: h("18:00") }).situacao).toBe("ponto_incompleto");
    expect(dia({ entrada: h("09:00") }, { data: "2026-10-08" })).toMatchObject({ situacao: "em_andamento", trabalhadas: 180, saldo: 0 });
  });
  it("trabalho em dia de folga é todo extra", () => {
    expect(dia({ entrada: h("09:00"), saida: h("13:00") }, { data: "2026-10-03" })).toMatchObject({ previstas: 0, saldo: 240, situacao: "hora_extra" });
  });
});

describe("espelho e banco de horas", () => {
  const ctx: ContextoPonto = {
    hoje: "2026-10-09",
    agoraMin: h("10:00"),
    jornada: JORNADA_PADRAO,
    regras,
    inicio: "2026-10-05",
    registros: new Map([
      ["2026-10-05", completo("09:00", "19:00")], // +60
      ["2026-10-06", completo("09:30", "18:00")], // −30
      ["2026-10-09", { entrada: h("09:00") }], // hoje, em andamento
    ]),
    ferias: [{ inicio: "2026-10-07", fim: "2026-10-07" }],
    ausencias: [],
  };
  it("soma o saldo dos dias fechados; férias não contam; dia sem registro é falta", () => {
    const dias = espelho(ctx, ["2026-10-01", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"]);
    expect(dias.map((d) => d.situacao)).toEqual(["folga", "hora_extra", "atraso", "ferias", "falta", "em_andamento"]);
    expect(dias[0].contabiliza).toBe(false); // antes do início do controle
    expect(resumir(dias)).toMatchObject({ saldo: 60 - 30 - 480, extras: 60, atrasos: 30, faltas: 1 });
  });
  it("banco acumulado considera ajustes e recalcula quando o ponto é corrigido", () => {
    expect(bancoDeHoras(ctx, [{ minutos: 120 }])).toBe(60 - 30 - 480 + 120);
    const corrigido = { ...ctx, registros: new Map(ctx.registros).set("2026-10-08", completo("09:00", "18:00")) };
    expect(bancoDeHoras(corrigido, [])).toBe(30);
    expect(bancoDeHoras({ ...ctx, inicio: null }, [{ minutos: -15 }])).toBe(-15);
  });
});

describe("situação de hoje e permissões", () => {
  it("traduz o dia para o status do resumo", () => {
    const hoje = { data: "2026-10-08" };
    expect(statusHoje(dia({}, hoje), true)).toBe("sem_entrada");
    expect(statusHoje(dia({ entrada: 540 }, hoje), true)).toBe("trabalhando");
    expect(statusHoje(dia({ entrada: 540, saida_intervalo: 720 }, hoje), true)).toBe("intervalo");
    expect(statusHoje(dia(completo("09:00", "18:00"), hoje), true)).toBe("finalizado");
    expect(statusHoje(dia({}, { ...hoje, ferias: true }), true)).toBe("ferias");
    expect(statusHoje(dia({}, { ...hoje, ausencia: { tipo: "Atestado", abona: true } }), true)).toBe("afastado");
    expect(statusHoje(dia({}, hoje), false)).toBe("sem_ponto");
  });
  it("administrador, gestor de equipe e colaborador", () => {
    expect(permissoesDP("diretor", false, 0)).toEqual({ ver: true, administrador: true, gestorDeEquipe: true, colaborador: false });
    expect(permissoesDP("supervisor", true, 2)).toEqual({ ver: true, administrador: false, gestorDeEquipe: true, colaborador: true });
    expect(permissoesDP("auxiliar", true, 0)).toEqual({ ver: true, administrador: false, gestorDeEquipe: false, colaborador: true });
    expect(permissoesDP("corretor", false, 0).ver).toBe(false);
    const gestor = permissoesDP("supervisor", true, 1);
    expect(podeDecidirSobre(gestor, "g", { id: "c", gestor_id: "g" })).toBe(true);
    expect(podeDecidirSobre(gestor, "g", { id: "x", gestor_id: "outro" })).toBe(false);
    expect(podeDecidirSobre(permissoesDP("diretor", true, 0), "eu", { id: "eu", gestor_id: null })).toBe(false);
  });
});
