/**
 * Regras do Departamento Pessoal: jornada, cálculo do dia de ponto,
 * espelho mensal, banco de horas, situação de hoje e permissões.
 * Funções puras, sem banco. Horários do dia são minutos desde a
 * meia-noite no fuso de Brasília; datas são "AAAA-MM-DD".
 */

export const FUSO = "America/Sao_Paulo";

// ---------------------------------------------------------------
// tempo
// ---------------------------------------------------------------

/** Instante (ISO) -> data e minutos do dia em Brasília. */
export function localDe(iso: string): { data: string; minutos: number } {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? "00";
  return { data: `${p("year")}-${p("month")}-${p("day")}`, minutos: Number(p("hour")) * 60 + Number(p("minute")) };
}

/** Data + "HH:MM" de Brasília -> instante ISO (Brasília não tem horário de verão: UTC−3). */
export function instanteDe(data: string, hhmm: string): string {
  return new Date(`${data}T${hhmm}:00-03:00`).toISOString();
}

export function paraMinutos(hhmm: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? "");
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return +m[1] * 60 + +m[2];
}
export function hhmm(minutos: number | null | undefined): string {
  if (minutos === null || minutos === undefined) return "—";
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}
/** Duração/saldo: 125 -> "2h05", -30 -> "−0h30". */
export function duracao(minutos: number, comSinal = false): string {
  const abs = Math.abs(Math.round(minutos));
  const texto = `${Math.floor(abs / 60)}h${String(abs % 60).padStart(2, "0")}`;
  if (minutos < 0) return `−${texto}`;
  return comSinal && minutos > 0 ? `+${texto}` : texto;
}

const diaAbs = (iso: string) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000);
export const somarDias = (iso: string, n: number) => new Date((diaAbs(iso) + n) * 86_400_000).toISOString().slice(0, 10);
export const diaDaSemana = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();
export function diasDoMes(mes: string): string[] {
  const [a, m] = mes.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return Array.from({ length: ultimo }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`);
}
export function intervaloDeDatas(inicio: string, fim: string): string[] {
  const lista: string[] = [];
  for (let d = inicio; d <= fim && lista.length < 4000; d = somarDias(d, 1)) lista.push(d);
  return lista;
}

// ---------------------------------------------------------------
// jornada
// ---------------------------------------------------------------

export type Jornada = { dias: number[]; entrada: string; saida: string; intervalo_min: number };
export const JORNADA_PADRAO: Jornada = { dias: [1, 2, 3, 4, 5], entrada: "09:00", saida: "18:00", intervalo_min: 60 };
export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function normalizarJornada(bruto: unknown, padrao: Jornada = JORNADA_PADRAO): Jornada {
  const o = bruto && typeof bruto === "object" ? (bruto as Record<string, unknown>) : null;
  if (!o) return padrao;
  const dias = Array.isArray(o.dias) ? [...new Set(o.dias.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : padrao.dias;
  const entrada = paraMinutos(String(o.entrada ?? "")) !== null ? String(o.entrada).padStart(5, "0") : padrao.entrada;
  const saida = paraMinutos(String(o.saida ?? "")) !== null ? String(o.saida).padStart(5, "0") : padrao.saida;
  const intervalo = Number(o.intervalo_min);
  return { dias, entrada, saida, intervalo_min: Number.isFinite(intervalo) && intervalo >= 0 && intervalo <= 240 ? Math.round(intervalo) : padrao.intervalo_min };
}

/** Minutos a cumprir num dia de trabalho da jornada. */
export function minutosDaJornada(j: Jornada): number {
  return Math.max(0, (paraMinutos(j.saida) ?? 0) - (paraMinutos(j.entrada) ?? 0) - j.intervalo_min);
}
export const cargaSemanalHoras = (j: Jornada) => Math.round(((minutosDaJornada(j) * j.dias.length) / 60) * 100) / 100;
export const ehDiaDeTrabalho = (j: Jornada, data: string) => j.dias.includes(diaDaSemana(data));

// ---------------------------------------------------------------
// registros do dia
// ---------------------------------------------------------------

export const TIPOS_REGISTRO = ["entrada", "saida_intervalo", "retorno_intervalo", "saida"] as const;
export type TipoRegistro = (typeof TIPOS_REGISTRO)[number];
export const ROTULO_REGISTRO: Record<TipoRegistro, string> = { entrada: "Entrada", saida_intervalo: "Saída para intervalo", retorno_intervalo: "Retorno do intervalo", saida: "Saída" };

export type RegistrosDia = Partial<Record<TipoRegistro, number>>;

/** Próximo registro esperado; depois da entrada também é possível encerrar sem intervalo. */
export function proximoRegistro(r: RegistrosDia): { proximo: TipoRegistro | null; alternativa: TipoRegistro | null } {
  if (r.saida !== undefined) return { proximo: null, alternativa: null };
  if (r.entrada === undefined) return { proximo: "entrada", alternativa: null };
  if (r.saida_intervalo === undefined) return { proximo: "saida_intervalo", alternativa: "saida" };
  if (r.retorno_intervalo === undefined) return { proximo: "retorno_intervalo", alternativa: null };
  return { proximo: "saida", alternativa: null };
}

/** Um registro só é aceito na ordem certa e depois do anterior. */
export function podeRegistrar(r: RegistrosDia, tipo: TipoRegistro, minutos: number): string | null {
  const { proximo, alternativa } = proximoRegistro(r);
  if (tipo !== proximo && tipo !== alternativa) return proximo ? `O próximo registro esperado é: ${ROTULO_REGISTRO[proximo]}.` : "O ponto de hoje já foi encerrado.";
  const ultimo = Math.max(...TIPOS_REGISTRO.map((t) => r[t] ?? -1));
  if (minutos < ultimo) return "O horário não pode ser anterior ao último registro.";
  return null;
}

/** Minutos trabalhados até `ate` (para o dia em andamento) ou até a saída. */
export function minutosTrabalhados(r: RegistrosDia, ate?: number | null): { minutos: number; completo: boolean } {
  if (r.entrada === undefined) return { minutos: 0, completo: false };
  const fim = r.saida ?? ate ?? null;
  if (r.saida_intervalo !== undefined) {
    const manha = Math.max(0, r.saida_intervalo - r.entrada);
    if (r.retorno_intervalo === undefined) return { minutos: manha, completo: false };
    if (fim === null) return { minutos: manha, completo: false };
    return { minutos: manha + Math.max(0, fim - r.retorno_intervalo), completo: r.saida !== undefined };
  }
  if (fim === null) return { minutos: 0, completo: false };
  return { minutos: Math.max(0, fim - r.entrada), completo: r.saida !== undefined };
}

// ---------------------------------------------------------------
// cálculo do dia
// ---------------------------------------------------------------

export const SITUACOES_DIA = ["normal", "hora_extra", "atraso", "falta", "ferias", "folga", "afastamento", "ponto_incompleto", "em_andamento", "sem_registro"] as const;
export type SituacaoDia = (typeof SITUACOES_DIA)[number];
export const ROTULO_SITUACAO_DIA: Record<SituacaoDia, string> = {
  normal: "Normal",
  hora_extra: "Hora extra",
  atraso: "Atraso",
  falta: "Falta",
  ferias: "Férias",
  folga: "Folga",
  afastamento: "Afastamento",
  ponto_incompleto: "Ponto incompleto",
  em_andamento: "Em andamento",
  sem_registro: "Ainda não registrou",
};

export type RegrasPonto = { toleranciaMin: number; horaExtraLimiteDiarioMin: number };
export type AusenciaDia = { tipo: string; abona: boolean };

export type DiaPonto = {
  data: string;
  registros: RegistrosDia;
  previstas: number;
  trabalhadas: number;
  /** o que entra no banco de horas (0 enquanto o dia não fecha) */
  saldo: number;
  situacao: SituacaoDia;
  /** rótulo do tipo de ausência quando houver (ex.: "Atestado") */
  detalhe: string | null;
  /** horas extras além do limite diário configurado (alerta) */
  excedeLimite: boolean;
};

export function calcularDia(p: { data: string; hoje: string; agoraMin: number; jornada: Jornada; registros: RegistrosDia; ferias: boolean; ausencia: AusenciaDia | null; regras: RegrasPonto }): DiaPonto {
  const { data, hoje, jornada, registros, regras } = p;
  const base = { data, registros, detalhe: null as string | null, excedeLimite: false };
  const temRegistro = registros.entrada !== undefined;
  const diaUtil = ehDiaDeTrabalho(jornada, data);
  const previstasJornada = diaUtil ? minutosDaJornada(jornada) : 0;

  // férias e ausências abonadas: nada a cumprir, nunca vira falta; o que for trabalhado é extra
  if (p.ferias || p.ausencia?.abona) {
    const { minutos, completo } = minutosTrabalhados(registros);
    const trabalhadas = completo ? minutos : 0;
    const situacao: SituacaoDia = p.ferias ? "ferias" : p.ausencia!.tipo.toLowerCase() === "folga" ? "folga" : "afastamento";
    return { ...base, previstas: 0, trabalhadas, saldo: trabalhadas, situacao, detalhe: p.ferias ? null : p.ausencia!.tipo };
  }
  // falta lançada pela gestão
  if (p.ausencia && !p.ausencia.abona && !temRegistro) {
    return { ...base, previstas: previstasJornada, trabalhadas: 0, saldo: -previstasJornada, situacao: "falta", detalhe: p.ausencia.tipo };
  }
  if (data > hoje) return { ...base, previstas: previstasJornada, trabalhadas: 0, saldo: 0, situacao: diaUtil ? "sem_registro" : "folga" };

  if (!temRegistro) {
    if (!diaUtil) return { ...base, previstas: 0, trabalhadas: 0, saldo: 0, situacao: "folga" };
    if (data === hoje) return { ...base, previstas: previstasJornada, trabalhadas: 0, saldo: 0, situacao: "sem_registro" };
    return { ...base, previstas: previstasJornada, trabalhadas: 0, saldo: -previstasJornada, situacao: "falta" };
  }

  if (registros.saida === undefined) {
    // dia de hoje ainda em andamento; em dia passado, falta bater algum registro
    if (data === hoje) return { ...base, previstas: previstasJornada, trabalhadas: minutosTrabalhados(registros, p.agoraMin).minutos, saldo: 0, situacao: "em_andamento" };
    return { ...base, previstas: previstasJornada, trabalhadas: minutosTrabalhados(registros).minutos, saldo: 0, situacao: "ponto_incompleto" };
  }
  if (registros.saida_intervalo !== undefined && registros.retorno_intervalo === undefined) {
    return { ...base, previstas: previstasJornada, trabalhadas: minutosTrabalhados(registros).minutos, saldo: 0, situacao: "ponto_incompleto" };
  }

  const trabalhadas = minutosTrabalhados(registros).minutos;
  const diferenca = trabalhadas - previstasJornada;
  const saldo = Math.abs(diferenca) <= regras.toleranciaMin ? 0 : diferenca;
  return {
    ...base,
    previstas: previstasJornada,
    trabalhadas,
    saldo,
    situacao: saldo > 0 ? "hora_extra" : saldo < 0 ? "atraso" : "normal",
    excedeLimite: saldo > regras.horaExtraLimiteDiarioMin,
  };
}

// ---------------------------------------------------------------
// espelho e banco de horas
// ---------------------------------------------------------------

export type ContextoPonto = {
  hoje: string;
  agoraMin: number;
  jornada: Jornada;
  regras: RegrasPonto;
  /** o ponto só conta a partir desta data */
  inicio: string | null;
  /** até quando contar (desligamento) */
  fim?: string | null;
  registros: Map<string, RegistrosDia>;
  ferias: { inicio: string; fim: string }[];
  ausencias: { inicio: string; fim: string; tipo: string; abona: boolean }[];
};

export function diaDoContexto(ctx: ContextoPonto, data: string): DiaPonto {
  const ausencia = ctx.ausencias.find((a) => a.inicio <= data && a.fim >= data) ?? null;
  return calcularDia({
    data,
    hoje: ctx.hoje,
    agoraMin: ctx.agoraMin,
    jornada: ctx.jornada,
    registros: ctx.registros.get(data) ?? {},
    ferias: ctx.ferias.some((f) => f.inicio <= data && f.fim >= data),
    ausencia: ausencia ? { tipo: ausencia.tipo, abona: ausencia.abona } : null,
    regras: ctx.regras,
  });
}

/** Dias fora do período de controle não contam (nem falta nem saldo). */
const foraDoControle = (ctx: ContextoPonto, data: string) => !ctx.inicio || data < ctx.inicio || (!!ctx.fim && data > ctx.fim);

export function espelho(ctx: ContextoPonto, datas: string[]): (DiaPonto & { contabiliza: boolean })[] {
  return datas.map((data) => {
    const dia = diaDoContexto(ctx, data);
    const fora = foraDoControle(ctx, data);
    if (fora && dia.registros.entrada === undefined) return { ...dia, previstas: 0, saldo: 0, situacao: dia.situacao === "ferias" || dia.situacao === "afastamento" ? dia.situacao : "folga", contabiliza: false };
    return { ...dia, contabiliza: !fora };
  });
}

export type ResumoPeriodo = { previstas: number; trabalhadas: number; saldo: number; extras: number; atrasos: number; faltas: number; incompletos: number };

export function resumir(dias: (DiaPonto & { contabiliza: boolean })[]): ResumoPeriodo {
  const r: ResumoPeriodo = { previstas: 0, trabalhadas: 0, saldo: 0, extras: 0, atrasos: 0, faltas: 0, incompletos: 0 };
  for (const d of dias) {
    if (!d.contabiliza) continue;
    r.previstas += d.previstas;
    r.trabalhadas += d.trabalhadas;
    r.saldo += d.saldo;
    if (d.saldo > 0) r.extras += d.saldo;
    if (d.situacao === "atraso") r.atrasos += -d.saldo;
    if (d.situacao === "falta") r.faltas++;
    if (d.situacao === "ponto_incompleto") r.incompletos++;
  }
  return r;
}

/** Banco de horas acumulado: todos os dias do início do controle até ontem (hoje só entra depois de encerrado) + ajustes. */
export function bancoDeHoras(ctx: ContextoPonto, ajustes: { minutos: number }[]): number {
  if (!ctx.inicio || ctx.inicio > ctx.hoje) return ajustes.reduce((t, a) => t + a.minutos, 0);
  const dias = espelho(ctx, intervaloDeDatas(ctx.inicio, ctx.hoje));
  return resumir(dias).saldo + ajustes.reduce((t, a) => t + a.minutos, 0);
}

// ---------------------------------------------------------------
// situação de hoje (Resumo do DP)
// ---------------------------------------------------------------

export const STATUS_HOJE = ["trabalhando", "intervalo", "sem_entrada", "ferias", "folga", "afastado", "falta", "finalizado", "sem_ponto"] as const;
export type StatusHoje = (typeof STATUS_HOJE)[number];
export const ROTULO_STATUS_HOJE: Record<StatusHoje, string> = {
  trabalhando: "Trabalhando",
  intervalo: "Em intervalo",
  sem_entrada: "Ainda não registrou entrada",
  ferias: "Em férias",
  folga: "Folga",
  afastado: "Afastado",
  falta: "Falta",
  finalizado: "Expediente finalizado",
  sem_ponto: "Não registra ponto",
};

export function statusHoje(dia: DiaPonto, registraPonto: boolean): StatusHoje {
  if (dia.situacao === "ferias") return "ferias";
  if (dia.situacao === "afastamento") return "afastado";
  if (dia.situacao === "falta") return "falta";
  if (dia.situacao === "folga") return "folga";
  if (!registraPonto) return "sem_ponto";
  const r = dia.registros;
  if (r.saida !== undefined) return "finalizado";
  if (r.entrada === undefined) return "sem_entrada";
  if (r.saida_intervalo !== undefined && r.retorno_intervalo === undefined) return "intervalo";
  return "trabalhando";
}
export const presenteHoje = (s: StatusHoje) => s === "trabalhando" || s === "intervalo" || s === "finalizado";
export const ausenteHoje = (s: StatusHoje) => s === "afastado" || s === "falta";

// ---------------------------------------------------------------
// permissões (nível do Vitral + vínculo com a ficha de colaborador)
// ---------------------------------------------------------------

export type PermissoesDP = {
  /** dp.view */
  ver: boolean;
  /** diretor/gerente: tudo (dp.employees.manage, dp.timeclock.manage, dp.absences.manage, dp.documents.manage, dp.settings.manage) */
  administrador: boolean;
  /** tem colaboradores sob sua gestão (dp.employees.view da equipe, dp.vacations.approve, dp.timeclock.approve_adjustments) */
  gestorDeEquipe: boolean;
  /** tem ficha própria (dp.vacations.request, dp.timeclock.view, dp.documents.view dos próprios) */
  colaborador: boolean;
};

export function permissoesDP(nivel: string, temFicha: boolean, subordinados: number): PermissoesDP {
  const administrador = nivel === "diretor" || nivel === "gerente";
  return { ver: administrador || temFicha || subordinados > 0, administrador, gestorDeEquipe: administrador || subordinados > 0, colaborador: temFicha };
}

/** Pode decidir (ponto, ausência) sobre este colaborador? Ninguém decide o que é seu. */
export function podeDecidirSobre(p: PermissoesDP, meuColaboradorId: string | null, alvo: { id: string; gestor_id: string | null }): boolean {
  if (alvo.id === meuColaboradorId) return false;
  return p.administrador || (!!meuColaboradorId && alvo.gestor_id === meuColaboradorId);
}
