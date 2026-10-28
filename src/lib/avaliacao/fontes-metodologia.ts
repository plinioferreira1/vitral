/**
 * Bloco "Fontes, metodologia e limitações" do estudo comercial.
 *
 * Só descreve o que a avaliação de fato usou: fontes dos comparáveis
 * incluídos, o método escolhido e o tamanho da amostra. Nunca cita
 * técnicas estatísticas que o Vitral não aplica (regressão, testes de
 * outliers, curvas de permanência).
 */
import type { Comparavel, Finalidade } from "./tipos";
import { ROTULO_FONTE_TIPO } from "./tipos";
import type { Metodo } from "./metodos";

export type BlocoFontesMetodologia = { fontes: string[]; metodologia: string[]; amostra: string | null; limitacoes: string[] };

const dataBR = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

function nomeDaFonte(c: Comparavel): string {
  if (c.fonte_nome?.trim()) return c.fonte_nome.trim();
  if (c.fonte_url) {
    try {
      return new URL(c.fonte_url).hostname.replace(/^www\./, "");
    } catch {
      /* URL inválida: cai no tipo da fonte */
    }
  }
  return ROTULO_FONTE_TIPO[c.fonte_tipo] ?? "Pesquisa da equipe";
}

export function fontesEMetodologia(o: {
  comparaveis: Comparavel[];
  finalidade: Finalidade;
  metodo: Metodo | null | undefined;
  vistoriaRealizada: boolean;
  dataBase: string | null;
}): BlocoFontesMetodologia {
  const mesmaFinalidade = o.comparaveis.filter((c) => c.finalidade === o.finalidade);
  const incluidos = mesmaFinalidade.filter((c) => c.incluido);

  const fontes: string[] = [];
  const contagem = new Map<string, number>();
  for (const c of incluidos) {
    const nome = nomeDaFonte(c);
    contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
  }
  for (const [nome, n] of [...contagem].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))) {
    fontes.push(`${nome} (${n} ${n === 1 ? "referência" : "referências"})`);
  }
  fontes.push(o.vistoriaRealizada ? "Vistoria do imóvel e informações do proprietário" : "Informações do imóvel fornecidas pelo proprietário ou cliente");
  fontes.push("Conhecimento de mercado da equipe Sacra Netimóveis");

  const metodologia: string[] = [];
  const metodo = o.metodo ?? "manual";
  const ajustou = incluidos.some((c) => (c.ajustes ?? []).length > 0);
  if (metodo === "comparativo") {
    metodologia.push("Método comparativo direto de dados de mercado (ABNT NBR 14.653-2)");
    if (ajustou) metodologia.push("Homogeneização das referências por fatores de ajuste justificados");
    metodologia.push(`Valor de referência pela mediana do preço por m²${ajustou ? " ajustado" : ""} da amostra`);
  } else if (metodo === "evolutivo") {
    metodologia.push("Método evolutivo: terreno + benfeitorias depreciadas × fator de comercialização (ABNT NBR 14.653-2)");
  } else if (metodo === "renda") {
    metodologia.push("Método da capitalização da renda: renda líquida anual ÷ taxa de capitalização (ABNT NBR 14.653-2)");
  } else if (metodo === "involutivo") {
    metodologia.push("Método involutivo: fluxo de caixa de empreendimento hipotético, descontado à data-base (ABNT NBR 14.653-2)");
  } else {
    metodologia.push(
      incluidos.length
        ? "Valor definido pela equipe a partir das referências de mercado e das características do imóvel"
        : "Valor definido pela equipe a partir do conhecimento de mercado e das características do imóvel"
    );
  }
  if (incluidos.some((c) => c.tipo_preco === "oferta")) metodologia.push("Preços de oferta considerados como anunciados, sem desconto presumido de negociação, salvo ajuste descrito");

  let amostra: string | null = null;
  if (mesmaFinalidade.length) {
    const datas = incluidos.map((c) => c.data_coleta).filter((d): d is string => Boolean(d)).sort();
    const periodo = datas.length ? (datas[0] === datas.at(-1) ? `, consultadas em ${dataBR(datas[0])}` : `, consultadas entre ${dataBR(datas[0])} e ${dataBR(datas.at(-1)!)}`) : "";
    amostra = `${incluidos.length} de ${mesmaFinalidade.length} ${mesmaFinalidade.length === 1 ? "referência levantada" : "referências levantadas"}${periodo}.`;
  }

  const limitacoes = [
    "Este relatório tem caráter informativo e comercial, para divulgação e negociação do imóvel.",
    "Não substitui laudo técnico de avaliação (PTAM), laudo de engenharia ou perícia judicial.",
    "O valor indicado não garante o preço de fechamento.",
    o.vistoriaRealizada ? "A análise considera a vistoria registrada." : "A análise não inclui vistoria presencial; considera as informações fornecidas sobre o imóvel.",
  ];
  if (o.dataBase) limitacoes.push(`Valor válido para as condições de mercado na data de referência (${dataBR(o.dataBase)}).`);

  return { fontes, metodologia, amostra, limitacoes };
}
