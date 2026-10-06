/**
 * Motor de proporcionalidade do Termo de Entrega de Chaves.
 *
 * Todo dinheiro é tratado em CENTAVOS INTEIROS (nunca em ponto
 * flutuante). Datas são "AAAA-MM-DD" e os períodos são inclusivos nas
 * duas pontas. Funções puras: a tela usa para mostrar o cálculo ao vivo
 * e o servidor refaz tudo antes de gravar.
 */

export const REGRA_CALCULO = "proporcional-dias-v1";
export const DESCRICAO_REGRA =
  "Valores em centavos inteiros. No proporcional por dias, a parte do comprador é valor × dias do comprador ÷ dias do período, arredondada para o centavo mais próximo (meio centavo para cima); a parte do vendedor é o restante. O dia do marco da proporcionalidade já é de responsabilidade do comprador.";

export const CATEGORIAS = [
  "condominio",
  "iptu_tlp",
  "agua",
  "energia",
  "gas",
  "fundo_reserva",
  "taxa_extraordinaria",
  "multa_condominial",
  "multa_contratual",
  "juros",
  "debito_anterior",
  "credito",
  "consumo_individual",
  "outro",
] as const;
export type Categoria = (typeof CATEGORIAS)[number];
export const ROTULO_CATEGORIA: Record<Categoria, string> = {
  condominio: "Condomínio",
  iptu_tlp: "IPTU/TLP",
  agua: "Água",
  energia: "Energia",
  gas: "Gás",
  fundo_reserva: "Fundo de reserva",
  taxa_extraordinaria: "Taxa extraordinária",
  multa_condominial: "Multa condominial",
  multa_contratual: "Multa contratual",
  juros: "Juros",
  debito_anterior: "Débito anterior",
  credito: "Crédito",
  consumo_individual: "Consumo individual",
  outro: "Outro",
};

export const PAGADORES = ["vendedor", "comprador", "nao_pago", "outro"] as const;
export type Pagador = (typeof PAGADORES)[number];
export const ROTULO_PAGADOR: Record<Pagador, string> = {
  vendedor: "Vendedor",
  comprador: "Comprador",
  nao_pago: "Não pago",
  outro: "Outro",
};

export const RESPONSAVEIS = ["vendedor", "comprador", "ambos", "proporcional"] as const;
export type Responsavel = (typeof RESPONSAVEIS)[number];
export const ROTULO_RESPONSAVEL: Record<Responsavel, string> = {
  vendedor: "Vendedor",
  comprador: "Comprador",
  ambos: "Ambos (meio a meio)",
  proporcional: "Definir proporcionalmente",
};

export const TIPOS_CALCULO = ["proporcional_dias", "integral", "manual"] as const;
export type TipoCalculo = (typeof TIPOS_CALCULO)[number];
export const ROTULO_TIPO_CALCULO: Record<TipoCalculo, string> = {
  proporcional_dias: "Proporcional por dias",
  integral: "Valor integral",
  manual: "Valor manual",
};

export const MARCOS = ["entrega", "escritura", "registro", "quitacao", "personalizada"] as const;
export type Marco = (typeof MARCOS)[number];
export const ROTULO_MARCO: Record<Marco, string> = {
  entrega: "Data da entrega das chaves",
  escritura: "Data da escritura",
  registro: "Data do registro",
  quitacao: "Data da quitação",
  personalizada: "Data personalizada",
};

export type Parte = "vendedor" | "comprador";

// ---------------------------------------------------------------
// datas
// ---------------------------------------------------------------

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function dataValida(iso: string | null | undefined): iso is string {
  const m = ISO.exec(iso ?? "");
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

function diaAbsoluto(iso: string): number {
  const [a, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(a, m - 1, d) / 86_400_000);
}

/** Dias de um período inclusivo: 01/10 a 31/10 = 31. */
export function diasNoPeriodo(inicio: string, fim: string): number {
  return diaAbsoluto(fim) - diaAbsoluto(inicio) + 1;
}

export function somarDias(iso: string, dias: number): string {
  return new Date((diaAbsoluto(iso) + dias) * 86_400_000).toISOString().slice(0, 10);
}

export function anoBissexto(ano: number): boolean {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

export function periodoDoMes(ano: number, mes: number): { inicio: string; fim: string } {
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const mm = String(mes).padStart(2, "0");
  return { inicio: `${ano}-${mm}-01`, fim: `${ano}-${mm}-${String(ultimo).padStart(2, "0")}` };
}

export function periodoDoAno(ano: number): { inicio: string; fim: string } {
  return { inicio: `${ano}-01-01`, fim: `${ano}-12-31` };
}

export function dataBR(iso: string | null | undefined): string {
  if (!dataValida(iso)) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
/** "02 de outubro de 2026" */
export function dataPorExtenso(iso: string | null | undefined): string {
  if (!dataValida(iso)) return "";
  const [a, m, d] = iso.split("-");
  return `${d} de ${MESES[Number(m) - 1]} de ${a}`;
}

// ---------------------------------------------------------------
// encargo
// ---------------------------------------------------------------

export type EncargoEntrada = {
  id: string;
  categoria: Categoria;
  descricao: string;
  competencia: string;
  periodoInicio: string | null;
  periodoFim: string | null;
  vencimento: string | null;
  valorTotalCentavos: number;
  pagoPor: Pagador;
  responsavel: Responsavel;
  tipoCalculo: TipoCalculo;
  /** só no cálculo manual */
  manualVendedorCentavos: number;
  manualCompradorCentavos: number;
  observacao: string;
};

export type EncargoCalculado = {
  valido: boolean;
  erros: string[];
  avisos: string[];
  diasTotal: number | null;
  diasVendedor: number | null;
  diasComprador: number | null;
  /** período de responsabilidade de cada parte (proporcional) */
  periodoVendedor: { inicio: string; fim: string } | null;
  periodoComprador: { inicio: string; fim: string } | null;
  parteVendedorCentavos: number;
  parteCompradorCentavos: number;
  /** quem ressarce quem por causa deste item */
  ressarcimentoCentavos: number;
  ressarcimentoDe: Parte | null;
  ressarcimentoPara: Parte | null;
  /** valores que cada parte ainda paga a terceiros (item não pago) */
  emAbertoVendedorCentavos: number;
  emAbertoCompradorCentavos: number;
  /** conta mostrada na tela e guardada no banco */
  memoria: string;
};

/** valor × numerador ÷ denominador em centavos, meio centavo para cima, só com inteiros. */
export function proporcao(valorCentavos: number, numerador: number, denominador: number): number {
  if (denominador <= 0) return 0;
  const sinal = valorCentavos < 0 ? -1 : 1;
  const bruto = BigInt(Math.abs(Math.round(valorCentavos))) * BigInt(numerador);
  const den = BigInt(denominador);
  const resultado = (bruto * BigInt(2) + den) / (den * BigInt(2));
  return sinal * Number(resultado);
}

function fmt(centavos: number): string {
  const abs = Math.abs(Math.round(centavos));
  const reais = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${centavos < 0 ? "-" : ""}R$ ${reais},${String(abs % 100).padStart(2, "0")}`;
}

/**
 * Calcula um encargo. `marco` é a data a partir da qual a
 * responsabilidade é do comprador (o próprio dia do marco já é dele).
 */
export function calcularEncargo(e: EncargoEntrada, marco: string | null): EncargoCalculado {
  const r: EncargoCalculado = {
    valido: true,
    erros: [],
    avisos: [],
    diasTotal: null,
    diasVendedor: null,
    diasComprador: null,
    periodoVendedor: null,
    periodoComprador: null,
    parteVendedorCentavos: 0,
    parteCompradorCentavos: 0,
    ressarcimentoCentavos: 0,
    ressarcimentoDe: null,
    ressarcimentoPara: null,
    emAbertoVendedorCentavos: 0,
    emAbertoCompradorCentavos: 0,
    memoria: "",
  };
  const total = Math.round(e.valorTotalCentavos);
  if (!Number.isFinite(total) || total < 0) r.erros.push("Informe um valor total válido.");

  if (e.tipoCalculo === "proporcional_dias") {
    if (!dataValida(e.periodoInicio) || !dataValida(e.periodoFim)) r.erros.push("Informe o período inicial e final.");
    else if (e.periodoFim < e.periodoInicio) r.erros.push("O período final é anterior ao inicial.");
    if (!dataValida(marco)) r.erros.push("Informe a data do marco da proporcionalidade.");
    if (r.erros.length === 0) {
      const inicio = e.periodoInicio as string;
      const fim = e.periodoFim as string;
      const m = marco as string;
      const diasTotal = diasNoPeriodo(inicio, fim);
      // vendedor: do início até a véspera do marco; comprador: do marco ao fim
      const diasVendedor = m <= inicio ? 0 : m > fim ? diasTotal : diasNoPeriodo(inicio, somarDias(m, -1));
      const diasComprador = diasTotal - diasVendedor;
      r.diasTotal = diasTotal;
      r.diasVendedor = diasVendedor;
      r.diasComprador = diasComprador;
      if (diasVendedor > 0) r.periodoVendedor = { inicio, fim: somarDias(inicio, diasVendedor - 1) };
      if (diasComprador > 0) r.periodoComprador = { inicio: somarDias(fim, -(diasComprador - 1)), fim };
      r.parteCompradorCentavos = proporcao(total, diasComprador, diasTotal);
      r.parteVendedorCentavos = total - r.parteCompradorCentavos;
      r.memoria = `${fmt(total)} ÷ ${diasTotal} dias × ${diasComprador} dias do comprador = ${fmt(r.parteCompradorCentavos)}; vendedor: ${diasVendedor} dias = ${fmt(r.parteVendedorCentavos)}`;
      if (m > fim) r.avisos.push("O marco é posterior ao período: todo o valor fica com o vendedor.");
      if (m <= inicio) r.avisos.push("O marco é anterior ao período: todo o valor fica com o comprador.");
    }
  } else if (e.tipoCalculo === "integral") {
    if (e.responsavel === "comprador") r.parteCompradorCentavos = total;
    else if (e.responsavel === "ambos") {
      r.parteCompradorCentavos = Math.floor(total / 2);
      r.parteVendedorCentavos = total - r.parteCompradorCentavos;
    } else if (e.responsavel === "vendedor") r.parteVendedorCentavos = total;
    else r.erros.push("No valor integral, escolha o responsável: vendedor, comprador ou ambos.");
    r.memoria =
      e.responsavel === "ambos"
        ? `${fmt(total)} dividido meio a meio: vendedor ${fmt(r.parteVendedorCentavos)}, comprador ${fmt(r.parteCompradorCentavos)}`
        : `Valor integral de ${fmt(total)} sob responsabilidade do ${e.responsavel === "comprador" ? "comprador" : "vendedor"}`;
  } else {
    const v = Math.round(e.manualVendedorCentavos);
    const c = Math.round(e.manualCompradorCentavos);
    if (v < 0 || c < 0) r.erros.push("Os valores manuais não podem ser negativos.");
    r.parteVendedorCentavos = Math.max(0, v);
    r.parteCompradorCentavos = Math.max(0, c);
    if (v + c !== total) r.avisos.push(`A soma das partes (${fmt(v + c)}) é diferente do valor total (${fmt(total)}).`);
    r.memoria = `Valor manual: vendedor ${fmt(r.parteVendedorCentavos)}, comprador ${fmt(r.parteCompradorCentavos)}`;
  }

  if (r.erros.length > 0) {
    r.valido = false;
    r.parteVendedorCentavos = 0;
    r.parteCompradorCentavos = 0;
    return r;
  }

  // quem pagou x quem deve
  if (e.pagoPor === "vendedor" && r.parteCompradorCentavos > 0) {
    r.ressarcimentoCentavos = r.parteCompradorCentavos;
    r.ressarcimentoDe = "comprador";
    r.ressarcimentoPara = "vendedor";
  } else if (e.pagoPor === "comprador" && r.parteVendedorCentavos > 0) {
    r.ressarcimentoCentavos = r.parteVendedorCentavos;
    r.ressarcimentoDe = "vendedor";
    r.ressarcimentoPara = "comprador";
  } else if (e.pagoPor === "nao_pago" || e.pagoPor === "outro") {
    r.emAbertoVendedorCentavos = r.parteVendedorCentavos;
    r.emAbertoCompradorCentavos = r.parteCompradorCentavos;
  }
  return r;
}

// ---------------------------------------------------------------
// acerto final (compensação)
// ---------------------------------------------------------------

export type Acerto = {
  compradorDeveCentavos: number;
  vendedorDeveCentavos: number;
  saldoCentavos: number;
  /** quem recebe o saldo */
  aFavorDe: Parte | null;
  /** quem paga o saldo */
  devedor: Parte | null;
  emAbertoVendedorCentavos: number;
  emAbertoCompradorCentavos: number;
};

export function calcularAcerto(calculados: EncargoCalculado[]): Acerto {
  let compradorDeve = 0;
  let vendedorDeve = 0;
  let abertoV = 0;
  let abertoC = 0;
  for (const c of calculados) {
    if (!c.valido) continue;
    if (c.ressarcimentoDe === "comprador") compradorDeve += c.ressarcimentoCentavos;
    if (c.ressarcimentoDe === "vendedor") vendedorDeve += c.ressarcimentoCentavos;
    abertoV += c.emAbertoVendedorCentavos;
    abertoC += c.emAbertoCompradorCentavos;
  }
  const diferenca = compradorDeve - vendedorDeve;
  return {
    compradorDeveCentavos: compradorDeve,
    vendedorDeveCentavos: vendedorDeve,
    saldoCentavos: Math.abs(diferenca),
    aFavorDe: diferenca > 0 ? "vendedor" : diferenca < 0 ? "comprador" : null,
    devedor: diferenca > 0 ? "comprador" : diferenca < 0 ? "vendedor" : null,
    emAbertoVendedorCentavos: abertoV,
    emAbertoCompradorCentavos: abertoC,
  };
}

/** Frase do resultado: "COMPRADOR DEVE AO VENDEDOR R$ 403,26." */
export function fraseAcerto(a: Acerto, plural: { vendedores: number; compradores: number } = { vendedores: 1, compradores: 1 }): string {
  if (!a.devedor) return "NÃO HÁ VALORES A RESSARCIR.";
  const vend = plural.vendedores > 1 ? "VENDEDORES" : "VENDEDOR";
  const comp = plural.compradores > 1 ? "COMPRADORES" : "COMPRADOR";
  return a.devedor === "comprador"
    ? `${comp} ${plural.compradores > 1 ? "DEVEM" : "DEVE"} ${plural.vendedores > 1 ? "AOS" : "AO"} ${vend} ${fmt(a.saldoCentavos)}.`
    : `${vend} ${plural.vendedores > 1 ? "DEVEM" : "DEVE"} ${plural.compradores > 1 ? "AOS" : "AO"} ${comp} ${fmt(a.saldoCentavos)}.`;
}
