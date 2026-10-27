/**
 * Multa e juros por atraso na locação (funções puras, centavos inteiros).
 *
 * Para cada débito em atraso:
 *   valor corrigido = valor original × (1 + correção acumulada informada)
 *   multa           = valor corrigido × multa moratória
 *   juros           = valor corrigido × juros ao mês × dias de atraso ÷ 30 (simples, pro rata die)
 *   total           = valor corrigido + multa + juros
 * Débito ainda não vencido na data do cálculo não tem multa nem juros.
 * Os percentuais vêm do contrato; o sistema não presume índice de correção.
 */

export const INDICES = ["IGP-M", "IPCA", "INPC", "IVAR"] as const;
export const LIMITES = { itens: 60, multaMax: 20, jurosMax: 10, correcaoMin: -50, correcaoMax: 200 } as const;
export const PADRAO = { multaPct: 10, jurosMensalPct: 1 } as const;

export type ItemAtraso = {
  descricao: string;
  /** aaaa-mm, opcional (mês de referência) */
  competencia?: string | null;
  vencimento: string;
  valorCentavos: number;
  /** correção monetária acumulada do vencimento até a data do cálculo, em %, quando houver índice */
  correcaoPct?: number | null;
};

export type EntradaAtraso = {
  dataCalculo: string;
  multaPct: number;
  jurosMensalPct: number;
  indice: string | null;
  itens: ItemAtraso[];
};

export type ItemCalculado = ItemAtraso & {
  dias: number;
  vencido: boolean;
  correcaoCentavos: number;
  corrigidoCentavos: number;
  multaCentavos: number;
  jurosCentavos: number;
  totalCentavos: number;
};

export type MemoriaAtraso = {
  entrada: EntradaAtraso;
  itens: ItemCalculado[];
  totais: { original: number; correcao: number; corrigido: number; multa: number; juros: number; total: number };
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function dataValida(iso: unknown): iso is string {
  if (typeof iso !== "string" || !ISO.test(iso)) return false;
  const d = new Date(`${iso}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

export function diasDeAtraso(vencimento: string, dataCalculo: string): number {
  const dias = Math.round((Date.parse(`${dataCalculo}T12:00:00Z`) - Date.parse(`${vencimento}T12:00:00Z`)) / 864e5);
  return Math.max(0, dias);
}

/** "2,5" | "2.5" | 2.5 → 2.5 ; vazio → null ; inválido → NaN */
export function percentual(bruto: unknown): number | null {
  if (bruto === null || bruto === undefined) return null;
  if (typeof bruto === "number") return Number.isFinite(bruto) ? bruto : NaN;
  const t = String(bruto).trim().replace("%", "").replace(",", ".");
  if (!t) return null;
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

/** Confere a entrada; devolve a lista de problemas (vazia = pode calcular). */
export function validarAtraso(e: EntradaAtraso): string[] {
  const erros: string[] = [];
  if (!dataValida(e.dataCalculo)) erros.push("Informe a data do cálculo.");
  if (!Number.isFinite(e.multaPct) || e.multaPct < 0 || e.multaPct > LIMITES.multaMax) erros.push(`A multa deve ficar entre 0% e ${LIMITES.multaMax}%.`);
  if (!Number.isFinite(e.jurosMensalPct) || e.jurosMensalPct < 0 || e.jurosMensalPct > LIMITES.jurosMax) erros.push(`Os juros devem ficar entre 0% e ${LIMITES.jurosMax}% ao mês.`);
  if (e.indice && !(INDICES as readonly string[]).includes(e.indice)) erros.push("Índice de correção desconhecido.");
  if (!e.itens.length) erros.push("Inclua ao menos um débito.");
  if (e.itens.length > LIMITES.itens) erros.push(`No máximo ${LIMITES.itens} débitos por cálculo.`);
  e.itens.forEach((it, i) => {
    const n = `Linha ${i + 1}`;
    if (!String(it.descricao ?? "").trim()) erros.push(`${n}: informe a descrição.`);
    if (!dataValida(it.vencimento)) erros.push(`${n}: informe o vencimento.`);
    if (!Number.isSafeInteger(it.valorCentavos) || it.valorCentavos <= 0) erros.push(`${n}: informe um valor maior que zero.`);
    if (it.competencia && !/^\d{4}-\d{2}$/.test(it.competencia)) erros.push(`${n}: mês de referência inválido.`);
    if (e.indice) {
      const c = it.correcaoPct ?? 0;
      if (!Number.isFinite(c) || c < LIMITES.correcaoMin || c > LIMITES.correcaoMax) erros.push(`${n}: correção acumulada fora do esperado.`);
    }
  });
  return erros;
}

export function calcularItem(it: ItemAtraso, e: Pick<EntradaAtraso, "dataCalculo" | "multaPct" | "jurosMensalPct" | "indice">): ItemCalculado {
  const dias = diasDeAtraso(it.vencimento, e.dataCalculo);
  const vencido = dias > 0;
  const correcaoPct = e.indice && vencido ? (it.correcaoPct ?? 0) : 0;
  const corrigido = Math.round(it.valorCentavos * (1 + correcaoPct / 100));
  const multa = vencido ? Math.round((corrigido * e.multaPct) / 100) : 0;
  const juros = vencido ? Math.round((corrigido * e.jurosMensalPct * dias) / 3000) : 0;
  return {
    ...it,
    descricao: it.descricao.trim(),
    correcaoPct: e.indice ? correcaoPct : null,
    dias,
    vencido,
    correcaoCentavos: corrigido - it.valorCentavos,
    corrigidoCentavos: corrigido,
    multaCentavos: multa,
    jurosCentavos: juros,
    totalCentavos: corrigido + multa + juros,
  };
}

export function calcularAtraso(e: EntradaAtraso): MemoriaAtraso {
  const itens = [...e.itens].sort((a, b) => a.vencimento.localeCompare(b.vencimento)).map((it) => calcularItem(it, e));
  const soma = (k: keyof Pick<ItemCalculado, "valorCentavos" | "correcaoCentavos" | "corrigidoCentavos" | "multaCentavos" | "jurosCentavos" | "totalCentavos">) => itens.reduce((s, i) => s + i[k], 0);
  return {
    entrada: e,
    itens,
    totais: {
      original: soma("valorCentavos"),
      correcao: soma("correcaoCentavos"),
      corrigido: soma("corrigidoCentavos"),
      multa: soma("multaCentavos"),
      juros: soma("jurosCentavos"),
      total: soma("totalCentavos"),
    },
  };
}

export function formatarPct(v: number): string {
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}%`;
}

/** Explicação de uma linha, como aparece no detalhamento do PDF. */
export function explicacaoItem(it: ItemCalculado, e: Pick<EntradaAtraso, "multaPct" | "jurosMensalPct" | "indice">, moeda: (c: number) => string): string[] {
  if (!it.vencido) return ["Ainda não vencido na data do cálculo: sem multa e sem juros."];
  const base = moeda(it.corrigidoCentavos);
  return [
    e.indice ? `Correção (${e.indice}): ${moeda(it.valorCentavos)} × ${formatarPct(it.correcaoPct ?? 0)} = ${moeda(it.correcaoCentavos)} → valor corrigido ${base}` : `Sem correção monetária: base ${base}`,
    `Multa: ${base} × ${formatarPct(e.multaPct)} = ${moeda(it.multaCentavos)}`,
    `Juros: ${base} × ${formatarPct(e.jurosMensalPct)} ao mês × ${it.dias} dia${it.dias === 1 ? "" : "s"} ÷ 30 = ${moeda(it.jurosCentavos)}`,
  ];
}
