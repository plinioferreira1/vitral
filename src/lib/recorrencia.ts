/**
 * Cálculo das datas de um lançamento financeiro recorrente.
 *
 * Tudo trabalha com datas "AAAA-MM-DD" em UTC, então o resultado não
 * depende do fuso do servidor.
 */

export type Frequencia = "semanal" | "mensal" | "trimestral" | "semestral" | "anual";

/** Quantos meses uma frequência avança — null quando não é "por mês" (semanal). */
export function mesesPorFrequencia(frequencia: Frequencia): number | null {
  switch (frequencia) {
    case "mensal":
      return 1;
    case "trimestral":
      return 3;
    case "semestral":
      return 6;
    case "anual":
      return 12;
    default:
      return null;
  }
}

function paraISO(ano: number, mesIndex0: number, dia: number): string {
  return new Date(Date.UTC(ano, mesIndex0, dia)).toISOString().slice(0, 10);
}

function partes(iso: string): [number, number, number] {
  const [a, m, d] = iso.split("-").map(Number);
  return [a, m - 1, d];
}

/**
 * Soma meses a uma data mantendo o dia original quando possível e
 * "encostando" no último dia quando o mês é mais curto
 * (31/01 + 1 mês = 28/02 ou 29/02; 31/01 + 2 meses = 31/03).
 */
export function somarMeses(iso: string, meses: number): string {
  const [ano, mes, dia] = partes(iso);
  const alvo = mes + meses;
  const anoAlvo = ano + Math.floor(alvo / 12);
  const mesAlvo = ((alvo % 12) + 12) % 12;
  const ultimoDia = new Date(Date.UTC(anoAlvo, mesAlvo + 1, 0)).getUTCDate();
  return paraISO(anoAlvo, mesAlvo, Math.min(dia, ultimoDia));
}

export function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = partes(iso);
  return paraISO(ano, mes, dia + dias);
}

/**
 * N-ésimo dia útil (seg a sex, sem considerar feriados) de um mês.
 * Se o mês não tiver dias úteis suficientes, cai no último dia útil dele.
 */
export function nEsimoDiaUtil(ano: number, mesIndex0: number, n: number): string {
  let contador = 0;
  let ultimoUtil = paraISO(ano, mesIndex0, 1);
  const ultimoDia = new Date(Date.UTC(ano, mesIndex0 + 1, 0)).getUTCDate();
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const semana = new Date(Date.UTC(ano, mesIndex0, dia)).getUTCDay();
    if (semana !== 0 && semana !== 6) {
      contador++;
      ultimoUtil = paraISO(ano, mesIndex0, dia);
      if (contador === n) return ultimoUtil;
    }
  }
  return ultimoUtil;
}

export const MAX_OCORRENCIAS = 60;

export interface ParametrosRecorrencia {
  dataInicio: string;
  frequencia: Frequencia;
  /** Última data permitida (inclusive). */
  dataFim?: string | null;
  numeroOcorrencias?: number | null;
  /** Se informado (e a frequência for mensal ou maior), vence no N-ésimo dia útil do mês. */
  diaUtil?: number | null;
  maximo?: number;
}

/**
 * Lista vencimento e competência de cada ocorrência. Cada data é
 * calculada a partir da data de início (não da ocorrência anterior),
 * então um lançamento do dia 31 volta a cair no dia 31 depois de
 * fevereiro, em vez de ficar preso no dia 28.
 */
export function datasDaRecorrencia(p: ParametrosRecorrencia): { vencimento: string; competencia: string }[] {
  const maximo = p.maximo ?? MAX_OCORRENCIAS;
  const limite = p.numeroOcorrencias ? Math.min(p.numeroOcorrencias, maximo) : maximo;
  const meses = mesesPorFrequencia(p.frequencia);
  const usaDiaUtil = !!p.diaUtil && meses !== null;
  const resultado: { vencimento: string; competencia: string }[] = [];

  for (let i = 0; i < limite; i++) {
    let vencimento: string;
    let competencia: string;

    if (usaDiaUtil) {
      const alvo = somarMeses(p.dataInicio, i * meses!);
      const [ano, mes] = partes(alvo);
      vencimento = nEsimoDiaUtil(ano, mes, p.diaUtil!);
      competencia = paraISO(ano, mes, 1);
    } else {
      vencimento = meses === null ? somarDias(p.dataInicio, i * 7) : somarMeses(p.dataInicio, i * meses);
      competencia = vencimento;
    }

    if (p.dataFim && vencimento > p.dataFim) break;
    resultado.push({ vencimento, competencia });
  }

  return resultado;
}
