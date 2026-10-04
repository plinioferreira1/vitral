import { describe, expect, it } from "vitest";
import {
  alertasDaAmostra,
  arredondarValor,
  calcularAvaliacao,
  estatisticas,
  fatorTotal,
  mediana,
  posicaoNaFaixa,
  precoPorM2,
  valorComMargem,
} from "./calculo";
import { hashConteudo, jsonEstavel, montarConteudo } from "./conteudo";
import { dividirLinhaCsv, parseCsvComparaveis } from "./csv";
import { podeAprovar, podeVerAvaliacao } from "./permissoes";
import { LIMIARES_PADRAO, type AvaliacaoBase, type Comparavel, type Responsavel } from "./tipos";
import { validarParaEmissao } from "./validacao";

function comp(parcial: Partial<Comparavel> & { id: string }): Comparavel {
  return {
    ordem: 0,
    identificacao: `Comparável ${parcial.id}`,
    regiao: "Águas Claras",
    finalidade: "venda",
    tipologia: "residencial",
    area_m2: 75,
    quartos: 3,
    suites: 1,
    vagas: 1,
    preco: 700000,
    tipo_preco: "oferta",
    fonte_tipo: "manual",
    fonte_nome: "Portal fictício",
    fonte_url: `https://exemplo.invalid/${parcial.id}`,
    referencia_interna: null,
    data_coleta: "2026-09-20",
    data_atualizacao: null,
    status_anuncio: "ativo",
    diferencas: null,
    observacoes: null,
    ajustes: [],
    incluido: true,
    duplicata: false,
    reconferir: false,
    motivo_exclusao: null,
    foto_caminho: null,
    ...parcial,
  };
}

const tres = [
  comp({ id: "a", area_m2: 72, preco: 665000 }),
  comp({ id: "b", area_m2: 78, preco: 720000 }),
  comp({ id: "c", area_m2: 74, preco: 680000 }),
];

describe("preço por m² e fatores", () => {
  it("só calcula com preço e área positivos", () => {
    expect(precoPorM2(700000, 70)).toBe(10000);
    expect(precoPorM2(700000, 0)).toBeNull();
    expect(precoPorM2(0, 70)).toBeNull();
    expect(precoPorM2(null, 70)).toBeNull();
  });

  it("fator total é o produto de (1 + p/100)", () => {
    expect(fatorTotal([])).toBe(1);
    expect(
      fatorTotal([
        { fator: "Conservação", percentual: 5, justificativa: "x" },
        { fator: "Oferta", percentual: -10, justificativa: "y" },
      ])
    ).toBeCloseTo(0.945, 10);
  });

  it("mediana com quantidade par e ímpar", () => {
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([4, 1, 3, 2])).toBe(2.5);
    expect(mediana([])).toBeNull();
  });

  it("estatísticas descritivas", () => {
    const e = estatisticas([10, 20, 30])!;
    expect(e).toMatchObject({ n: 3, minimo: 10, maximo: 30, mediana: 20, media: 20 });
    expect(e.desvioPadrao).toBeCloseTo(10, 10);
    expect(e.coeficienteVariacaoPct).toBeCloseTo(50, 10);
    expect(estatisticas([5])!.desvioPadrao).toBeNull();
  });
});

describe("calcularAvaliacao", () => {
  it("venda: mediana do m² ajustado × área, arredondada ao milhar", () => {
    const r = calcularAvaliacao(tres, "venda", 75);
    expect(r.amostraFinal).toBe(3);
    // 665000/72 = 9236,11 · 720000/78 = 9230,77 · 680000/74 = 9189,19
    expect(r.ajustado!.mediana).toBeCloseTo(9230.769, 2);
    expect(r.valorCalculado).toBe(692000);
    expect(r.faixaCalculadaMin).toBe(689000);
    expect(r.faixaCalculadaMax).toBe(693000);
  });

  it("ajustes mudam o m² ajustado, não o bruto", () => {
    const comAjuste = [
      comp({ id: "a", area_m2: 100, preco: 1000000, ajustes: [{ fator: "Oferta", percentual: -10, justificativa: "margem usual" }] }),
    ];
    const r = calcularAvaliacao(comAjuste, "venda", 50);
    expect(r.amostra[0].m2Bruto).toBe(10000);
    expect(r.amostra[0].m2Ajustado).toBeCloseTo(9000, 6);
    expect(r.valorCalculado).toBe(450000);
  });

  it("nunca mistura venda e locação na mesma amostra", () => {
    const misto = [...tres, comp({ id: "aluguel", finalidade: "locacao", preco: 3500, area_m2: 75 })];
    expect(calcularAvaliacao(misto, "venda", 75).amostraFinal).toBe(3);
    const loc = calcularAvaliacao(misto, "locacao", 75);
    expect(loc.amostraFinal).toBe(1);
    expect(loc.valorCalculado).toBe(3500);
  });

  it("locação arredonda à dezena", () => {
    expect(arredondarValor(3456.78, "locacao")).toBe(3460);
    expect(arredondarValor(692307.7, "venda")).toBe(692000);
  });

  it("excluídos e inválidos ficam fora, mas contam na amostra inicial", () => {
    const r = calcularAvaliacao(
      [...tres, comp({ id: "x", incluido: false, motivo_exclusao: "duplicado" }), comp({ id: "y", area_m2: null })],
      "venda",
      75
    );
    expect(r.amostraInicial).toBe(5);
    expect(r.amostraFinal).toBe(3);
    expect(r.excluidos).toBe(1);
  });

  it("sem área do imóvel não há valor calculado", () => {
    const r = calcularAvaliacao(tres, "venda", null);
    expect(r.ajustado).not.toBeNull();
    expect(r.valorCalculado).toBeNull();
  });

  it("margem de negociação e posição na faixa", () => {
    expect(valorComMargem(692000, 5, "venda")).toBe(727000);
    expect(valorComMargem(692000, 0, "venda")).toBeNull();
    expect(posicaoNaFaixa(699000, 689000, 693000)).toBe("acima");
    expect(posicaoNaFaixa(690000, 689000, 693000)).toBe("dentro");
    expect(posicaoNaFaixa(690000, null, 693000)).toBe("sem_faixa");
  });
});

describe("alertas da amostra", () => {
  const contexto = {
    finalidade: "venda" as const,
    areaImovelM2: 75,
    bairro: "Águas Claras",
    tipologia: "residencial",
    dataBase: "2026-10-01",
    limiares: LIMIARES_PADRAO,
  };

  it("fonte antiga, área e região divergentes, duplicata e atípico", () => {
    const lista = [
      ...tres,
      comp({ id: "velho", data_coleta: "2026-01-01" }),
      comp({ id: "grande", area_m2: 150, preco: 1400000 }),
      comp({ id: "longe", regiao: "Guará" }),
      comp({ id: "dup", fonte_url: "https://exemplo.invalid/a" }),
      comp({ id: "caro", preco: 1500000 }),
    ];
    const tipos = (id: string) => alertasDaAmostra(lista, contexto).filter((a) => a.comparavelId === id).map((a) => a.tipo);
    expect(tipos("velho")).toContain("fonte_antiga");
    expect(tipos("grande")).toContain("area_divergente");
    expect(tipos("longe")).toContain("regiao_divergente");
    expect(tipos("dup")).toContain("possivel_duplicata");
    expect(tipos("caro")).toContain("atipico");
    expect(tipos("a")).toEqual([]);
  });
});

// ---------------------------------------------------------------

const responsavel: Responsavel = {
  usuario_id: "u-amanda",
  nome: "Avaliadora Fictícia",
  creci: "00.000",
  cnai: "00.000",
  curriculo: "Corretora de imóveis e avaliadora.",
  telefone: "",
  email: "",
};

function avaliacao(parcial: Partial<AvaliacaoBase> = {}): AvaliacaoBase {
  return {
    id: "av1",
    codigo: "AV-2026-0001",
    modalidade: "estudo_comercial",
    finalidade: "venda",
    tipologia: "residencial",
    status: "rascunho",
    titulo: "Apartamento fictício",
    proprietario_nome: "Proprietária Fictícia",
    bairro: "Águas Claras",
    cidade: "Brasília",
    data_base: "2026-10-01",
    area_m2: 75,
    dados: {
      objetivo: "Orientar o preço de anúncio.",
      endereco: "Rua Fictícia, 1",
      vistoria_status: "nao_realizada",
      recorte_geografico: "Águas Claras Sul",
      recorte_periodo: "Setembro de 2026",
      fundamentacao: "Mediana dos preços pedidos por m².",
      conclusao_texto: "Sugere-se anunciar pelo valor calculado.",
    },
    valor_calculado: 692000,
    faixa_min: null,
    faixa_max: null,
    faixa_manual: false,
    valor_sugerido: 692000,
    margem_negociacao_pct: null,
    valor_proprietario: null,
    revisao: 1,
    versao_atual: 0,
    ...parcial,
  };
}

const conteudo = (a = avaliacao(), comparaveis = tres) =>
  montarConteudo({ avaliacao: a, comparaveis, arquivos: [], responsavel, limiares: LIMIARES_PADRAO });

describe("conteúdo e hash", () => {
  it("json estável independe da ordem das chaves", () => {
    expect(jsonEstavel({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe(jsonEstavel({ a: [2, { c: 2, d: 1 }], b: 1 }));
  });

  it("qualquer mudança de conteúdo muda o hash (aprovação deixa de valer)", () => {
    const h1 = hashConteudo(conteudo());
    expect(hashConteudo(conteudo())).toBe(h1);
    expect(hashConteudo(conteudo(avaliacao({ valor_sugerido: 699000 })))).not.toBe(h1);
    expect(hashConteudo(conteudo(avaliacao(), [...tres.slice(0, 2), comp({ id: "c", area_m2: 74, preco: 681000 })]))).not.toBe(h1);
  });

  it("a faixa do conteúdo é a calculada, salvo edição manual", () => {
    expect(conteudo().precificacao).toMatchObject({ faixa_min: 689000, faixa_max: 693000 });
    const manual = conteudo(avaliacao({ faixa_manual: true, faixa_min: 680000, faixa_max: 710000 }));
    expect(manual.precificacao).toMatchObject({ faixa_min: 680000, faixa_max: 710000 });
  });
});

describe("validação para emissão", () => {
  it("estudo comercial de venda com 3 comparáveis completos não tem bloqueios", () => {
    expect(validarParaEmissao(conteudo()).bloqueios).toEqual([]);
  });

  it("valor diferente do calculado exige justificativa", () => {
    const semJust = validarParaEmissao(conteudo(avaliacao({ valor_sugerido: 699000 })));
    expect(semJust.bloqueios.some((b) => b.mensagem.includes("justificativa"))).toBe(true);
    const base = avaliacao({ valor_sugerido: 699000 });
    base.dados = { ...base.dados, justificativa_valor: "Margem para negociação combinada com a proprietária." };
    expect(validarParaEmissao(conteudo(base)).bloqueios).toEqual([]);
  });

  it("amostra pequena sem justificativa bloqueia; sem amostra não há conclusão", () => {
    const dois = validarParaEmissao(conteudo(avaliacao(), tres.slice(0, 2)));
    expect(dois.bloqueios.some((b) => b.mensagem.includes("Amostra com 2"))).toBe(true);
    const zero = validarParaEmissao(conteudo(avaliacao(), []));
    expect(zero.bloqueios.some((b) => b.mensagem.includes("sem amostra"))).toBe(true);
  });

  it("comparável sem data ou sem fonte bloqueia", () => {
    const r = validarParaEmissao(conteudo(avaliacao(), [...tres, comp({ id: "d", data_coleta: null, fonte_url: null })]));
    expect(r.bloqueios.filter((b) => b.mensagem.includes("Comparável d")).length).toBe(2);
  });

  it("texto provisório bloqueia", () => {
    const a = avaliacao();
    a.dados = { ...a.dados, conclusao_texto: "Valor de [inserir valor]." };
    expect(validarParaEmissao(conteudo(a)).bloqueios.some((b) => b.mensagem.includes("provisório"))).toBe(true);
  });

  it("PTAM exige o conteúdo mínimo da Resolução COFECI 1.066/2007", () => {
    const r = validarParaEmissao(conteudo(avaliacao({ modalidade: "ptam" })));
    const texto = r.bloqueios.map((b) => b.mensagem).join(" | ");
    for (const trecho of ["solicitante", "matrícula", "Cartório", "confrontações", "benfeitorias", "aproveitamento econômico", "vizinhança", "vistoria precisa estar realizada"]) {
      expect(texto).toContain(trecho);
    }
  });

  it("PTAM completo passa", () => {
    const a = avaliacao({ modalidade: "ptam" });
    a.dados = {
      ...a.dados,
      solicitante_nome: "Solicitante Fictício",
      matricula: "00.000",
      cartorio: "0º Ofício (fictício)",
      confrontacoes: "Frente para a via; fundos para a área comum.",
      medidas_perimetricas: "Unidade com 75 m² de área privativa.",
      benfeitorias: "Armários planejados.",
      aproveitamento_economico: "Uso residencial.",
      infraestrutura_entorno: "Comércio e transporte próximos.",
      vistoria_status: "realizada",
      vistoria_data: "2026-09-28",
      vistoria_responsavel: "Avaliadora Fictícia",
      parecer_avaliadora: "A amostra é homogênea.",
    };
    expect(validarParaEmissao(conteudo(a)).bloqueios).toEqual([]);
  });

  it("locação: mesma regra, unidade mensal, sem comparáveis de venda", () => {
    const alugueis = ["a", "b", "c"].map((id, i) => comp({ id, finalidade: "locacao", preco: 3400 + i * 100, area_m2: 75 }));
    const a = avaliacao({ finalidade: "locacao", valor_sugerido: 3500 });
    const c = conteudo(a, [...alugueis, ...tres]);
    expect(c.calculo.amostraFinal).toBe(3);
    expect(c.calculo.valorCalculado).toBe(3500);
    expect(validarParaEmissao(c).bloqueios.some((b) => b.mensagem.includes("não se misturam"))).toBe(true);
    expect(validarParaEmissao(conteudo(a, alugueis)).bloqueios).toEqual([]);
  });
});

describe("permissões", () => {
  const amanda = { usuarioId: "u-amanda", nivel: "diretor", ehResponsavelTecnica: true };
  const gerente = { usuarioId: "g", nivel: "gerente", ehResponsavelTecnica: false };
  const corretor = { usuarioId: "c", nivel: "corretor", ehResponsavelTecnica: false };

  it("PTAM só a responsável técnica aprova; estudo comercial também diretor/gerente", () => {
    expect(podeAprovar(amanda, "ptam")).toBe(true);
    expect(podeAprovar(gerente, "ptam")).toBe(false);
    expect(podeAprovar(gerente, "estudo_comercial")).toBe(true);
    expect(podeAprovar(corretor, "estudo_comercial")).toBe(false);
  });

  it("corretor só vê o que criou", () => {
    expect(podeVerAvaliacao(corretor, "c")).toBe(true);
    expect(podeVerAvaliacao(corretor, "outro")).toBe(false);
    expect(podeVerAvaliacao(gerente, "outro")).toBe(true);
  });
});

describe("importação de comparáveis por planilha", () => {
  it("lê cabeçalho com acento, valores BR e datas BR", () => {
    const { itens, erros } = parseCsvComparaveis(
      [
        "Identificação;Bairro;Área;Quartos;Vagas;Preço;Tipo;Link;Data de consulta",
        'Ed. Fictício, ap. 101;Águas Claras;72 m²;3;1;R$ 665.000,00;oferta;https://exemplo.invalid/1;20/09/2026',
        '"Ed. Exemplo; bloco B";Águas Claras;78;3;1;720000;transação;;2026-09-21',
        ";;;;;;;;",
      ].join("\n")
    );
    expect(itens).toHaveLength(2);
    expect(itens[0]).toMatchObject({ area_m2: 72, preco: 665000, tipo_preco: "oferta", data_coleta: "2026-09-20", vagas: 1 });
    expect(itens[1]).toMatchObject({ identificacao: "Ed. Exemplo; bloco B", tipo_preco: "transacao", fonte_url: null });
    expect(erros).toHaveLength(1);
  });

  it("campo entre aspas com delimitador dentro", () => {
    expect(dividirLinhaCsv('"a;b";c', ";")).toEqual(["a;b", "c"]);
  });

  it("sem coluna de identificação, nada é importado", () => {
    expect(parseCsvComparaveis("area;preco\n70;500000").itens).toEqual([]);
  });
});
