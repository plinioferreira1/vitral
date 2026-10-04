/**
 * Cálculos da Avaliação de Imóveis — método comparativo direto com
 * homogeneização por fatores lançados por pessoa.
 *
 * Funções puras (sem banco) para poderem ser testadas e para que a
 * tela, a prévia e o PDF usem exatamente os mesmos números.
 *
 * O que NÃO existe aqui, de propósito: intervalo de confiança,
 * regressão, tendência histórica ou qualquer inferência estatística.
 * Só medidas descritivas da amostra.
 */

import type { AjusteComparavel, Comparavel, Finalidade, Limiares } from "./tipos";

/** Preço por m². Só existe com preço e área positivos. */
export function precoPorM2(preco: number | null | undefined, areaM2: number | null | undefined): number | null {
  if (!preco || !areaM2 || preco <= 0 || areaM2 <= 0) return null;
  return preco / areaM2;
}

/**
 * Fator total dos ajustes de um comparável: produto de (1 + p/100).
 * Ex.: +5% e −10% → 1,05 × 0,90 = 0,945.
 */
export function fatorTotal(ajustes: AjusteComparavel[]): number {
  return ajustes.reduce((fator, a) => fator * (1 + (Number(a.percentual) || 0) / 100), 1);
}

export type LinhaAmostra = {
  id: string;
  identificacao: string;
  areaM2: number;
  preco: number;
  tipoPreco: Comparavel["tipo_preco"];
  /** preço ÷ área, sem ajuste */
  m2Bruto: number;
  fator: number;
  /** m2Bruto × fator */
  m2Ajustado: number;
  ajustes: AjusteComparavel[];
};

/**
 * Comparáveis que entram no cálculo: marcados como incluídos, da mesma
 * finalidade da avaliação e com preço e área válidos.
 */
export function montarAmostra(comparaveis: Comparavel[], finalidade: Finalidade): LinhaAmostra[] {
  const linhas: LinhaAmostra[] = [];
  for (const c of comparaveis) {
    if (!c.incluido || c.finalidade !== finalidade) continue;
    const bruto = precoPorM2(c.preco, c.area_m2);
    if (bruto === null) continue;
    const fator = fatorTotal(c.ajustes ?? []);
    linhas.push({
      id: c.id,
      identificacao: c.identificacao,
      areaM2: c.area_m2 as number,
      preco: c.preco as number,
      tipoPreco: c.tipo_preco,
      m2Bruto: bruto,
      fator,
      m2Ajustado: bruto * fator,
      ajustes: c.ajustes ?? [],
    });
  }
  return linhas;
}

export function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 1 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
}

export type Estatisticas = {
  n: number;
  minimo: number;
  maximo: number;
  mediana: number;
  media: number;
  /** desvio padrão amostral (n − 1); null com menos de 2 elementos */
  desvioPadrao: number | null;
  /** desvio padrão ÷ média, em % — medida de dispersão */
  coeficienteVariacaoPct: number | null;
};

export function estatisticas(valores: number[]): Estatisticas | null {
  const n = valores.length;
  if (n === 0) return null;
  const media = valores.reduce((s, v) => s + v, 0) / n;
  const desvioPadrao =
    n >= 2 ? Math.sqrt(valores.reduce((s, v) => s + (v - media) ** 2, 0) / (n - 1)) : null;
  return {
    n,
    minimo: Math.min(...valores),
    maximo: Math.max(...valores),
    mediana: mediana(valores) as number,
    media,
    desvioPadrao,
    coeficienteVariacaoPct: desvioPadrao !== null && media > 0 ? (desvioPadrao / media) * 100 : null,
  };
}

/** Passo de arredondamento do valor total: venda R$ 1.000; locação R$ 10. */
export function passoArredondamento(finalidade: Finalidade): number {
  return finalidade === "venda" ? 1000 : 10;
}

export function arredondarValor(valor: number, finalidade: Finalidade): number {
  const passo = passoArredondamento(finalidade);
  return Math.round(valor / passo) * passo;
}

export type ResultadoCalculo = {
  finalidade: Finalidade;
  areaImovelM2: number | null;
  amostra: LinhaAmostra[];
  /** comparáveis cadastrados na mesma finalidade (incluídos + excluídos) */
  amostraInicial: number;
  amostraFinal: number;
  excluidos: number;
  ofertas: number;
  transacoes: number;
  bruto: Estatisticas | null;
  ajustado: Estatisticas | null;
  /** mediana do R$/m² ajustado × área do imóvel, arredondado */
  valorCalculado: number | null;
  /** menor e maior R$/m² ajustado × área do imóvel, arredondados */
  faixaCalculadaMin: number | null;
  faixaCalculadaMax: number | null;
};

/**
 * Regra de cálculo (explicada na tela e no PDF):
 *   R$/m² bruto      = preço ÷ área do comparável
 *   R$/m² ajustado   = R$/m² bruto × produto dos fatores (1 + p/100)
 *   valor calculado  = mediana do R$/m² ajustado × área do imóvel avaliando
 *   faixa calculada  = [menor ; maior] R$/m² ajustado × área do imóvel avaliando
 * Valores totais arredondados ao passo da finalidade.
 */
export function calcularAvaliacao(
  comparaveis: Comparavel[],
  finalidade: Finalidade,
  areaImovelM2: number | null | undefined
): ResultadoCalculo {
  const daFinalidade = comparaveis.filter((c) => c.finalidade === finalidade);
  const amostra = montarAmostra(comparaveis, finalidade);
  const bruto = estatisticas(amostra.map((l) => l.m2Bruto));
  const ajustado = estatisticas(amostra.map((l) => l.m2Ajustado));
  const area = areaImovelM2 && areaImovelM2 > 0 ? areaImovelM2 : null;

  return {
    finalidade,
    areaImovelM2: area,
    amostra,
    amostraInicial: daFinalidade.length,
    amostraFinal: amostra.length,
    excluidos: daFinalidade.filter((c) => !c.incluido).length,
    ofertas: amostra.filter((l) => l.tipoPreco === "oferta").length,
    transacoes: amostra.filter((l) => l.tipoPreco === "transacao").length,
    bruto,
    ajustado,
    valorCalculado: ajustado && area ? arredondarValor(ajustado.mediana * area, finalidade) : null,
    faixaCalculadaMin: ajustado && area ? arredondarValor(ajustado.minimo * area, finalidade) : null,
    faixaCalculadaMax: ajustado && area ? arredondarValor(ajustado.maximo * area, finalidade) : null,
  };
}

/** Valor calculado acrescido da margem de negociação configurada. */
export function valorComMargem(valor: number | null, margemPct: number | null | undefined, finalidade: Finalidade) {
  if (valor === null || !margemPct || margemPct <= 0) return null;
  return arredondarValor(valor * (1 + margemPct / 100), finalidade);
}

export type PosicaoNaFaixa = "abaixo" | "dentro" | "acima" | "sem_faixa";

export function posicaoNaFaixa(valor: number | null, min: number | null, max: number | null): PosicaoNaFaixa {
  if (valor === null || min === null || max === null) return "sem_faixa";
  if (valor < min) return "abaixo";
  if (valor > max) return "acima";
  return "dentro";
}

// ---------------------------------------------------------------
// Alertas de qualidade da amostra (avisam, não bloqueiam)
// ---------------------------------------------------------------

export type AlertaComparavel = { comparavelId: string; tipo: string; mensagem: string };

function diasEntre(deIso: string, ateIso: string): number {
  const [a1, m1, d1] = deIso.split("-").map(Number);
  const [a2, m2, d2] = ateIso.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

function normalizar(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function alertasDaAmostra(
  comparaveis: Comparavel[],
  contexto: {
    finalidade: Finalidade;
    areaImovelM2: number | null;
    bairro: string | null;
    tipologia: string | null;
    dataBase: string | null;
    limiares: Limiares;
  }
): AlertaComparavel[] {
  const alertas: AlertaComparavel[] = [];
  const { limiares } = contexto;
  const incluidos = comparaveis.filter((c) => c.incluido && c.finalidade === contexto.finalidade);
  const amostra = montarAmostra(comparaveis, contexto.finalidade);
  const med = mediana(amostra.map((l) => l.m2Ajustado));
  const bairro = normalizar(contexto.bairro);

  const vistos = new Map<string, string>();
  for (const c of incluidos) {
    const add = (tipo: string, mensagem: string) => alertas.push({ comparavelId: c.id, tipo, mensagem });

    if (precoPorM2(c.preco, c.area_m2) === null) {
      add("sem_calculo", "Sem preço ou área válidos: não entra no cálculo.");
    }
    if (!c.data_coleta) {
      add("sem_data", "Sem data de consulta registrada.");
    } else if (contexto.dataBase) {
      const idade = diasEntre(c.data_coleta, contexto.dataBase);
      if (idade > limiares.idadeMaximaDias) {
        add("fonte_antiga", `Consulta feita há ${idade} dias da data-base (limite de alerta: ${limiares.idadeMaximaDias}).`);
      }
    }
    if (c.fonte_tipo !== "interno" && !c.fonte_url && !c.referencia_interna) {
      add("sem_fonte", "Sem link ou referência da fonte.");
    }
    if (contexto.areaImovelM2 && c.area_m2) {
      const dif = (Math.abs(c.area_m2 - contexto.areaImovelM2) / contexto.areaImovelM2) * 100;
      if (dif > limiares.diferencaAreaPct) {
        add("area_divergente", `Área ${dif.toFixed(0)}% diferente do imóvel avaliando (limite de alerta: ${limiares.diferencaAreaPct}%).`);
      }
    }
    if (bairro && c.regiao && !normalizar(c.regiao).includes(bairro) && !bairro.includes(normalizar(c.regiao))) {
      add("regiao_divergente", "Região diferente do bairro do imóvel avaliando — registre a justificativa da ampliação.");
    }
    if (contexto.tipologia && c.tipologia && c.tipologia !== contexto.tipologia) {
      add("tipologia_divergente", "Tipologia diferente da do imóvel avaliando.");
    }
    if (c.reconferir) {
      add("reconferir", "Trazido de um estudo anterior: reconfira preço, status e data.");
    }
    if (c.duplicata) {
      add("duplicata_marcada", "Marcado como duplicata.");
    }

    const linha = amostra.find((l) => l.id === c.id);
    if (linha && med && amostra.length >= 3) {
      const desvio = (Math.abs(linha.m2Ajustado - med) / med) * 100;
      if (desvio > limiares.desvioAtipicoPct) {
        add("atipico", `R$/m² ajustado ${desvio.toFixed(0)}% distante da mediana (limite de alerta: ${limiares.desvioAtipicoPct}%).`);
      }
    }

    const chave = c.fonte_url
      ? `url:${normalizar(c.fonte_url)}`
      : `dados:${normalizar(c.identificacao)}|${c.area_m2 ?? ""}|${c.preco ?? ""}`;
    const anterior = vistos.get(chave);
    if (anterior && !c.duplicata) {
      add("possivel_duplicata", "Parece repetir outro comparável (mesmo link ou mesmos dados).");
    } else if (!anterior) {
      vistos.set(chave, c.id);
    }
  }
  return alertas;
}
