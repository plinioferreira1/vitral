import { calcularAvaliacao } from "./calculo";
import type { Comparavel, Finalidade, Tipologia } from "./tipos";

export const METODOS = ["manual", "comparativo", "evolutivo", "renda", "involutivo"] as const;
export type Metodo = typeof METODOS[number];
export const ROTULO_METODO: Record<Metodo, string> = {
  manual: "Valor definido pela equipe",
  comparativo: "Comparativo direto de mercado",
  evolutivo: "Evolutivo (terreno e construção)",
  renda: "Renda (capitalização direta)",
  involutivo: "Involutivo (empreendimento hipotético)",
};
export type PremissasMetodo = {
  metodo: Metodo;
  justificativa: string;
  terreno?: number;
  areaConstruida?: number;
  custoM2?: number;
  depreciacaoPct?: number;
  fatorComercializacao?: number;
  aluguelMensal?: number;
  vacanciaPct?: number;
  despesasMensais?: number;
  taxaCapitalizacaoPct?: number;
  taxaDescontoPct?: number;
  lucroPct?: number;
  /** Meses contados a partir da data-base. Custos excluem aquisição do terreno e lucro. */
  fluxo?: { mes: number; receita: number; custo: number }[];
};
export type ResultadoMetodo = { valor: number | null; memoria: string[]; erros: string[] };
const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 4 });

/** Os mesmos cálculos são usados no servidor, na tela e nos PDFs, inclusive nas versões. */
export function calcularMetodo(p: PremissasMetodo | undefined, finalidade: Finalidade, area: number | null, tipologia: Tipologia, comparaveis: Comparavel[]): ResultadoMetodo {
  const memoria: string[] = [], erros: string[] = [];
  const falha = (s: string) => { erros.push(s); };
  const n = (v: number | undefined, rotulo: string, min: number, max = 1e12) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) { falha(`Revise ${rotulo}.`); return 0; }
    return v;
  };
  if (!p || p.metodo === "manual") return { valor: null, memoria, erros };
  if (!METODOS.includes(p.metodo)) return { valor: null, memoria, erros: ["Método desconhecido."] };
  if (!p.justificativa?.trim()) falha("Informe as fontes e a justificativa das premissas do método.");
  if (finalidade !== "venda" && p.metodo !== "comparativo") falha("Este método estima o valor de venda. Para aluguel mensal, use o comparativo ou o valor definido pela equipe.");
  let valor = 0;
  if (p.metodo === "comparativo") {
    const incluidos = comparaveis.filter(x => x.incluido);
    for (const x of incluidos) {
      if (x.finalidade !== finalidade || (x.tipologia && x.tipologia !== tipologia)) falha(`Revise a finalidade e o tipo de "${x.identificacao}".`);
      if (!x.preco || !Number.isFinite(x.preco) || x.preco <= 0 || !x.area_m2 || !Number.isFinite(x.area_m2) || x.area_m2 <= 0) falha(`Informe preço e área válidos em "${x.identificacao}".`);
      if (x.duplicata || x.reconferir) falha(`Confira a referência "${x.identificacao}" antes de calcular.`);
      for (const ajuste of x.ajustes ?? []) {
        if (!Number.isFinite(ajuste.percentual) || Math.abs(ajuste.percentual) > 60 || !ajuste.justificativa?.trim()) falha(`Revise o ajuste de "${x.identificacao}" e sua justificativa.`);
      }
    }
    if (!area || !Number.isFinite(area) || area <= 0) falha("Informe a área do imóvel.");
    const c = calcularAvaliacao(incluidos, finalidade, area);
    if (!c.amostraFinal) falha("Adicione ao menos um comparável válido para calcular por este método.");
    valor = c.valorCalculado ?? 0;
    memoria.push("Preço ajustado por m² = preço / área × produto de (1 + ajuste percentual / 100). O valor de referência usa a mediana ajustada × área do imóvel.");
    for (const x of c.amostra) {
      memoria.push(`${x.identificacao}: ${moeda(x.preco)} / ${num(x.areaM2)} m² × ${num(x.fator)} = ${moeda(x.m2Ajustado)}/m²${finalidade === "locacao" ? "/mês" : ""}.`);
      for (const aj of x.ajustes) memoria.push(`${aj.fator}: ${num(aj.percentual)}%. ${aj.justificativa}${aj.origem ? ` Fonte: ${aj.origem}.` : ""}`);
    }
    if (c.ajustado) memoria.push(`Amostra: ${c.amostraFinal} referência(s). Mediana: ${moeda(c.ajustado.mediana)}/m². Área avaliada: ${num(area ?? 0)} m². Arredondamento: ${finalidade === "venda" ? "R$ 1.000" : "R$ 10"}.`);
    memoria.push("A mediana descreve esta amostra; não representa intervalo de confiança nem certificação de fundamentação técnica.");
  } else if (p.metodo === "evolutivo") {
    const terreno = n(p.terreno, "o valor do terreno", 0);
    const area = n(p.areaConstruida, "a área construída", 0.01);
    const custo = n(p.custoM2, "o custo de reconstrução por m²", 0.01);
    const depreciacao = n(p.depreciacaoPct, "a depreciação (0 a 100%)", 0, 100);
    const fator = n(p.fatorComercializacao, "o fator de comercialização (maior que zero)", 0.0001, 100);
    const benfeitorias = area * custo * (1 - depreciacao / 100);
    valor = (terreno + benfeitorias) * fator;
    memoria.push(`Terreno: ${moeda(terreno)}. Construção: ${num(area)} m² × ${moeda(custo)}/m². Depreciação: ${num(depreciacao)}%.`, `Benfeitorias depreciadas: ${moeda(benfeitorias)}. Fator de comercialização: ${num(fator)}.`, "Valor = (terreno + benfeitorias depreciadas) × fator de comercialização.");
  } else if (p.metodo === "renda") {
    const aluguel = n(p.aluguelMensal, "a receita mensal bruta", 0.01);
    const vacancia = n(p.vacanciaPct, "a vacância (0 a 100%)", 0, 100);
    const despesas = n(p.despesasMensais, "as despesas mensais do proprietário", 0);
    const taxa = n(p.taxaCapitalizacaoPct, "a taxa anual de capitalização (maior que zero)", 0.0001, 100);
    const liquida = aluguel * (1 - vacancia / 100) - despesas;
    if (liquida <= 0) falha("A renda líquida precisa ser positiva.");
    valor = liquida * 12 / (taxa / 100);
    memoria.push(`Receita mensal bruta: ${moeda(aluguel)}. Vacância: ${num(vacancia)}%. Despesas mensais: ${moeda(despesas)}.`, `Renda líquida anual: ${moeda(liquida * 12)}. Taxa anual de capitalização: ${num(taxa)}%.`, "Valor do imóvel = renda líquida anual / taxa anual de capitalização.", "Capitalização direta de renda estabilizada. Não projeta variações futuras nem substitui fluxo de caixa detalhado de um negócio.");
  } else {
    const taxa = n(p.taxaDescontoPct, "a taxa anual de desconto", 0, 100);
    const lucro = n(p.lucroPct, "a margem do empreendedor sobre receitas (0 a 100%)", 0, 100);
    const fluxo = p.fluxo ?? [];
    if (!fluxo.length || fluxo.length > 120) falha("Informe de 1 a 120 períodos do empreendimento.");
    const meses = new Set<number>();
    memoria.push(`Taxa efetiva anual de desconto: ${num(taxa)}%. Margem do empreendedor: ${num(lucro)}% das receitas, descontada em cada período.`, "Valor residual do terreno = soma de [receita × (1 - margem) - custos] / (1 + taxa anual)^(mês / 12).", "Custos devem incluir obras, projetos, tributos, comercialização e demais gastos, sem repetir aquisição do terreno nem a margem informada. Receitas e custos no fim de cada mês; mês zero é a data-base.");
    let receitas = 0;
    for (const f of fluxo) {
      const mes = n(f.mes, "o mês do fluxo (0 a 600)", 0, 600);
      if (!Number.isInteger(mes) || meses.has(mes)) falha("Os meses precisam ser inteiros e únicos.");
      meses.add(mes);
      const receita = n(f.receita, "a receita de cada período", 0);
      const custo = n(f.custo, "o custo de cada período", 0);
      receitas += receita;
      const presente = (receita * (1 - lucro / 100) - custo) / (1 + taxa / 100) ** (mes / 12);
      valor += presente;
      memoria.push(`Mês ${mes}: receita ${moeda(receita)}, custo ${moeda(custo)}, valor presente após margem ${moeda(presente)}.`);
    }
    if (receitas <= 0) falha("Informe receitas para o empreendimento hipotético.");
    if (valor <= 0) falha("O cenário não gera valor residual positivo para o terreno. Revise a viabilidade.");
    memoria.push("Cenário comercial condicionado à viabilidade legal e econômica do empreendimento descrito; não comprova potencial construtivo.");
  }
  if (!Number.isFinite(valor) || !Number.isSafeInteger(Math.round(valor * 100)) || valor <= 0) falha("O resultado precisa ser positivo e estar dentro do limite de cálculo.");
  return { valor: erros.length ? null : Math.round(valor * 100) / 100, memoria, erros };
}

/** Leitura estrita, sem transformar texto inválido em zero ou aceitar parâmetros do método anterior. */
export function lerPremissas(form: FormData): PremissasMetodo | undefined {
  const metodo = form.get("metodo");
  if (typeof metodo !== "string" || !METODOS.some(m => m === metodo)) throw new Error("Selecione um método válido.");
  if (metodo === "manual") return undefined;
  const rotulos: Record<string, string> = { terreno: "o valor do terreno", areaConstruida: "a área construída", custoM2: "o custo por m²", depreciacaoPct: "a depreciação", fatorComercializacao: "o fator de comercialização", aluguelMensal: "a receita mensal", vacanciaPct: "a vacância", despesasMensais: "as despesas mensais", taxaCapitalizacaoPct: "a taxa anual de capitalização", taxaDescontoPct: "a taxa anual de desconto", lucroPct: "a margem do empreendedor" };
  const numero = (chave: string) => {
    const s = String(form.get(chave) ?? "").trim();
    if (!s || !/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(s)) throw new Error(`Preencha ${rotulos[chave] ?? chave} com um número válido, usando vírgula para decimais.`);
    const n = Number(s.replaceAll(".", "").replace(",", "."));
    if (!Number.isFinite(n)) throw new Error("Número fora do limite.");
    return n;
  };
  const p: PremissasMetodo = { metodo: METODOS.find(m => m === metodo)!, justificativa: String(form.get("premissas_justificativa") ?? "").trim().slice(0, 6000) };
  const campos = metodo === "evolutivo" ? ["terreno", "areaConstruida", "custoM2", "depreciacaoPct", "fatorComercializacao"] as const
    : metodo === "renda" ? ["aluguelMensal", "vacanciaPct", "despesasMensais", "taxaCapitalizacaoPct"] as const
    : metodo === "involutivo" ? ["taxaDescontoPct", "lucroPct"] as const : [];
  for (const chave of campos) p[chave] = numero(chave);
  if (metodo === "involutivo") {
    const linhas = String(form.get("fluxo") ?? "").trim().split(/\r?\n/).filter(s => s.trim());
    if (linhas.length > 120) throw new Error("Use no máximo 120 períodos.");
    p.fluxo = linhas.map((s, i) => {
      const partes = s.split(";").map(s => s.trim());
      if (partes.length !== 3) throw new Error(`Linha ${i + 1}: use mês; receita; custo.`);
      const valores = partes.map((v, coluna) => {
        // Mesmo formato decimal estrito dos demais campos, sem remover sinais inválidos.
        if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/.test(v)) throw new Error(`Linha ${i + 1}, coluna ${coluna + 1}: número inválido.`);
        return Number(v.replaceAll(".", "").replace(",", "."));
      });
      return { mes: valores[0], receita: valores[1], custo: valores[2] };
    });
  }
  return p;
}
