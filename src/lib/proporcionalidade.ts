export type TipoDivisor = "annual" | "monthDays" | "fixed30";

export function parseDataISO(str: string): Date | null {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

export function diasEntre(d1: Date, d2: Date): number {
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}

export function diasNoMes(date: Date): number {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

export function anoBissexto(ano: number): boolean {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

export function brl(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseBR(str: string): number {
  if (str === null || str === undefined) return NaN;
  let s = String(str).trim();
  if (s === "") return NaN;
  s = s.replace(/[^\d.,-]/g, "");
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  return parseFloat(s);
}

export function formatarEntradaBR(num: number): string {
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export interface InfoDias {
  dias: number;
  divisor: number;
  divisorLabel: string;
}

export function calcularInfoDias(
  inicio: string,
  fim: string,
  tipoDivisor: TipoDivisor,
  bissexto: boolean
): InfoDias | null {
  const dInicio = parseDataISO(inicio);
  const dFim = parseDataISO(fim);
  if (!dInicio || !dFim) return null;

  const dias = diasEntre(dInicio, dFim) + 1;
  let divisor: number;
  let divisorLabel: string;

  if (tipoDivisor === "annual") {
    divisor = bissexto ? 366 : 365;
    divisorLabel = `Dias no ano: ${divisor}`;
  } else if (tipoDivisor === "fixed30") {
    divisor = 30;
    divisorLabel = `Divisor: 30 (fixo)`;
  } else {
    divisor = diasNoMes(dFim);
    divisorLabel = `Dias no mês de referência: ${divisor}`;
  }

  return { dias, divisor, divisorLabel };
}
