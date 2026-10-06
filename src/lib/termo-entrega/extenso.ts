/**
 * Valor em reais por extenso, sempre a partir dos centavos inteiros —
 * o número e o texto do documento saem da mesma fonte e não divergem.
 */

const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const partes: string[] = [];
  const c = Math.floor(n / 100);
  const resto = n % 100;
  if (c) partes.push(CENTENAS[c]);
  if (resto) {
    if (resto < 20) partes.push(UNIDADES[resto]);
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]);
    }
  }
  return partes.join(" e ");
}

const ESCALAS: [string, string][] = [
  ["", ""],
  ["mil", "mil"],
  ["milhão", "milhões"],
  ["bilhão", "bilhões"],
];

/** Número inteiro (0 a 999.999.999.999) por extenso. */
export function inteiroPorExtenso(numero: number): string {
  const n = Math.floor(Math.abs(numero));
  if (n === 0) return "zero";
  const grupos: number[] = [];
  let resto = n;
  while (resto > 0) {
    grupos.push(resto % 1000);
    resto = Math.floor(resto / 1000);
  }
  const partes: { texto: string; valor: number }[] = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i];
    if (!g) continue;
    let texto: string;
    if (i === 1) texto = g === 1 ? "mil" : `${ate999(g)} mil`;
    else if (i >= 2) texto = `${ate999(g)} ${g === 1 ? ESCALAS[i][0] : ESCALAS[i][1]}`;
    else texto = ate999(g);
    partes.push({ texto, valor: g });
  }
  // "e" antes do último grupo quando ele é menor que 100 ou centena redonda
  let saida = "";
  partes.forEach((p, i) => {
    if (i === 0) {
      saida = p.texto;
      return;
    }
    const ultimo = i === partes.length - 1;
    const ligaComE = ultimo && (p.valor < 100 || p.valor % 100 === 0);
    saida += ligaComE ? ` e ${p.texto}` : ` ${p.texto}`;
  });
  return saida;
}

/** 48326 -> "quatrocentos e oitenta e três reais e vinte e seis centavos" */
export function valorPorExtenso(centavos: number): string {
  const total = Math.round(Math.abs(centavos));
  const reais = Math.floor(total / 100);
  const cents = total % 100;
  const partes: string[] = [];
  if (reais > 0) {
    const texto = inteiroPorExtenso(reais);
    // "um milhão de reais", "dois milhões de reais"
    const redondoEmMilhoes = reais >= 1_000_000 && reais % 1_000_000 === 0;
    partes.push(`${texto} ${redondoEmMilhoes ? "de " : ""}${reais === 1 ? "real" : "reais"}`);
  }
  if (cents > 0) partes.push(`${inteiroPorExtenso(cents)} ${cents === 1 ? "centavo" : "centavos"}`);
  if (partes.length === 0) return "zero real";
  return partes.join(" e ");
}

/** 48326 -> "R$ 483,26" (sem depender de ponto flutuante) */
export function formatarCentavos(centavos: number): string {
  const total = Math.round(centavos);
  const sinal = total < 0 ? "-" : "";
  const abs = Math.abs(total);
  const reais = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sinal}R$ ${reais},${String(abs % 100).padStart(2, "0")}`;
}

/** "R$ 483,26 (quatrocentos e oitenta e três reais e vinte e seis centavos)" */
export function valorComExtenso(centavos: number): string {
  return `${formatarCentavos(centavos)} (${valorPorExtenso(centavos)})`;
}

/** Texto digitado ("1.234,56", "1234.56", "R$ 12") -> centavos inteiros, sem float. */
export function textoParaCentavos(valor: unknown): number {
  if (typeof valor === "number") return Number.isFinite(valor) ? Math.round(valor * 100) : 0;
  let s = String(valor ?? "").replace(/[^\d,.-]/g, "");
  if (!s) return 0;
  const negativo = s.startsWith("-");
  s = s.replace(/-/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if ((s.match(/\./g) ?? []).length > 1 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, "");
  const [inteiro, decimal = ""] = s.split(".");
  const cents = Number(inteiro || "0") * 100 + Number((decimal + "00").slice(0, 2));
  // terceira casa decimal: meio centavo para cima
  const arredonda = decimal.length > 2 && Number(decimal[2]) >= 5 ? 1 : 0;
  const total = cents + arredonda;
  return Number.isFinite(total) ? (negativo ? -total : total) : 0;
}
