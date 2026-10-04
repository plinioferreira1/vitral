/**
 * Gera PDFs de TESTE da Avaliação de Imóveis com dados FICTÍCIOS, sem
 * tocar no banco. Serve para revisar o layout.
 *
 *   npx tsx scripts/avaliacao-pdf-teste.ts <pasta-de-saida> [pasta-de-fotos]
 *
 * A pasta de fotos é opcional (capa.jpg, sala.jpg, cozinha.jpg,
 * quarto.jpg, varanda.jpg, fachada.jpg, comp1..4.jpg, assinatura.png).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { montarConteudo } from "../src/lib/avaliacao/conteudo";
import { CHAVE_LOGO_BORDO, CHAVE_LOGO_DOURADO, gerarPdfAvaliacao } from "../src/lib/avaliacao/pdf";
import type { Imagem } from "../src/lib/avaliacao/pdf-base";
import { LIMIARES_PADRAO, type ArquivoAvaliacao, type AvaliacaoBase, type Comparavel, type Responsavel } from "../src/lib/avaliacao/tipos";
import { validarParaEmissao } from "../src/lib/avaliacao/validacao";

const saida = process.argv[2] ?? "./pdf-teste";
const pastaFotos = process.argv[3];
mkdirSync(saida, { recursive: true });

const imagens: Record<string, Imagem> = {
  [CHAVE_LOGO_BORDO]: { bytes: readFileSync("public/brand/sacra-logo-bordo.png"), mime: "image/png" },
  [CHAVE_LOGO_DOURADO]: { bytes: readFileSync("public/brand/sacra-logo-dourado.png"), mime: "image/png" },
};
const fonte = (arquivo: string) => new Uint8Array(readFileSync(path.join("public/fonts/avaliacao", arquivo)));
const fontes = {
  serif: fonte("LiberationSerif-Regular.ttf"),
  serifItalico: fonte("LiberationSerif-Italic.ttf"),
  sans: fonte("LiberationSans-Regular.ttf"),
  sansNegrito: fonte("LiberationSans-Bold.ttf"),
};
function foto(nome: string): string | null {
  if (!pastaFotos) return null;
  const arquivo = path.join(pastaFotos, nome);
  if (!existsSync(arquivo)) return null;
  imagens[nome] = { bytes: readFileSync(arquivo), mime: nome.endsWith(".png") ? "image/png" : "image/jpeg" };
  return nome;
}

const responsavel: Responsavel = {
  usuario_id: "ficticio",
  nome: "Avaliadora Fictícia de Teste",
  creci: "00.000",
  cnai: "00.000",
  curriculo:
    "Currículo fictício para teste de layout: corretora de imóveis, com formação em avaliação imobiliária e atuação em intermediação residencial no Distrito Federal.",
  telefone: "(61) 0000-0000",
  email: "teste@exemplo.invalid",
};

function comp(id: string, p: Partial<Comparavel>): Comparavel {
  return {
    id,
    ordem: Number(id),
    identificacao: `Referência fictícia ${id}`,
    regiao: "Bairro Fictício",
    finalidade: "venda",
    tipologia: "residencial",
    area_m2: 75,
    quartos: 3,
    suites: 1,
    vagas: 1,
    preco: 700000,
    tipo_preco: "oferta",
    fonte_tipo: "manual",
    fonte_nome: "Portal Fictício de Anúncios",
    fonte_url: `https://portal-ficticio.invalid/anuncio/${id}`,
    referencia_interna: null,
    data_coleta: "2026-09-28",
    data_atualizacao: null,
    status_anuncio: "Anúncio ativo",
    diferencas: null,
    observacoes: null,
    ajustes: [],
    incluido: true,
    duplicata: false,
    reconferir: false,
    motivo_exclusao: null,
    foto_caminho: null,
    ...p,
  };
}

function arquivos(lista: [string, ArquivoAvaliacao["tipo"], string, boolean?][]): ArquivoAvaliacao[] {
  return lista
    .map(([nome, tipo, legenda, capa], i) => ({ nome, tipo, legenda, capa: !!capa, i, caminho: foto(nome) }))
    .filter((a) => a.caminho)
    .map((a) => ({
      id: `arq${a.i}`,
      tipo: a.tipo,
      caminho_storage: a.caminho as string,
      nome_arquivo: a.nome,
      legenda: a.legenda,
      capa: a.capa,
      ordem: a.i,
      mime_type: a.nome.endsWith(".png") ? "image/png" : "image/jpeg",
    }));
}

async function main() {
  // ------------------------------------------------------------
  // 1) PTAM de venda, emitido (com fotos, ajustes, exclusão e assinatura)
  // ------------------------------------------------------------
  const ptam: AvaliacaoBase = {
    id: "teste-ptam",
    codigo: "AV-TESTE-0001",
    modalidade: "ptam",
    finalidade: "venda",
    tipologia: "residencial",
    status: "emitido",
    titulo: "Apartamento fictício — Residencial Exemplo",
    proprietario_nome: "Proprietária Fictícia da Silva",
    bairro: "Bairro Fictício",
    cidade: "Cidade Exemplo",
    data_base: "2026-10-01",
    area_m2: 75,
    dados: {
      solicitante_nome: "Solicitante Fictício de Souza",
      solicitante_documento: "CPF 000.000.000-00",
      proprietario_documento: "CPF 000.000.000-00",
      objetivo: "Determinar o valor de mercado do imóvel para orientar a venda (documento de teste).",
      subtipo: "Apartamento",
      endereco: "Rua Fictícia 16, lote 04, apartamento 1007",
      complemento: "Residencial Exemplo",
      uf: "DF",
      matricula: "00.000",
      cartorio: "0º Ofício de Registro de Imóveis (fictício)",
      inscricao_iptu: "00000000",
      area_total_m2: 98.5,
      quartos: 3,
      suites: 1,
      banheiros: 2,
      vagas: 1,
      andar: "10º andar",
      posicao_solar: "nascente",
      idade_anos: 9,
      estado_conservacao: "Bom, com pintura recente",
      padrao_acabamento: "Médio-alto",
      valor_condominio: 780,
      valor_iptu: 1450,
      diferenciais: "Varanda integrada à sala, armários planejados em todos os cômodos e vaga coberta próxima ao elevador.",
      benfeitorias: "Armários planejados na cozinha e nos quartos; fechamento da varanda em vidro; ar-condicionado em dois quartos.",
      confrontacoes: "Frente para a Rua Fictícia; fundos para a área de lazer do condomínio; laterais com os apartamentos 1006 e 1008.",
      medidas_perimetricas: "Unidade autônoma com 75,00 m² de área privativa e 98,50 m² de área total, conforme matrícula.",
      aproveitamento_economico: "Uso residencial; imóvel ocupado pela proprietária.",
      documentos_conferidos: "matrícula e carnê do IPTU (fictícios)",
      lacunas: "convenção do condomínio não apresentada",
      vistoria_status: "realizada",
      vistoria_data: "2026-09-29",
      vistoria_responsavel: "Avaliadora Fictícia de Teste",
      vistoria_checklist: {
        identificacao: { situacao: "conforme" },
        area: { situacao: "conforme" },
        estrutura: { situacao: "conforme" },
        pisos: { situacao: "atencao", observacao: "Desgaste do piso laminado no corredor dos quartos." },
        esquadrias: { situacao: "conforme" },
        hidraulica: { situacao: "conforme" },
        eletrica: { situacao: "conforme" },
        cozinha_banheiros: { situacao: "conforme" },
        garagem: { situacao: "conforme", observacao: "Vaga nº 45, coberta." },
        areas_comuns: { situacao: "conforme" },
        ocupacao: { situacao: "conforme", observacao: "Ocupado pela proprietária." },
      },
      vistoria_ressalvas: "Instalações embutidas não foram testadas; a conferência foi visual.",
      vistoria_divergencias: "Nenhuma divergência em relação ao cadastro.",
      localizacao_descricao:
        "Texto fictício: quadra residencial consolidada, com comércio de bairro a poucos minutos a pé e acesso por via arterial. O entorno é formado por edifícios de padrão semelhante.",
      localizacao_atributos: "Estação de transporte a cerca de 600 m\nSupermercado e farmácia na mesma quadra\nParque urbano a 1 km",
      localizacao_influencia: "A proximidade do transporte e do comércio favorece a procura por unidades de três quartos nesta quadra.",
      infraestrutura_entorno: "Via pavimentada, iluminação pública, rede de água, esgoto e energia; comércio e serviços no entorno imediato.",
      recorte_geografico: "Bairro Fictício, quadras vizinhas ao imóvel (raio aproximado de 1 km).",
      recorte_periodo: "Anúncios e negócios consultados entre 20/09/2026 e 28/09/2026.",
      recorte_criterios: "Apartamentos de 3 quartos, entre 70 m² e 85 m², com 1 vaga, em edifícios de padrão semelhante.",
      fundamentacao:
        "A amostra final reúne cinco referências de três quartos na mesma região. Depois dos ajustes por conservação, andar e oferta, os preços por m² ficaram próximos entre si. Adotou-se a mediana do preço por m² ajustado multiplicada pela área privativa do imóvel. O valor indicado foi mantido igual ao calculado.",
      parecer_avaliadora:
        "A amostra é homogênea quanto à tipologia e à localização. Os ajustes aplicados são moderados e estão justificados individualmente. Uma referência foi excluída por repetir outro anúncio.",
      conclusao_texto:
        "Com base na pesquisa realizada e na vistoria do imóvel, conclui-se pelo valor de avaliação indicado na página de resultado, na data de referência informada.",
      selo_numero: "",
    },
    valor_calculado: null,
    faixa_min: null,
    faixa_max: null,
    faixa_manual: false,
    valor_sugerido: null,
    margem_negociacao_pct: null,
    valor_proprietario: 720000,
    revisao: 3,
    versao_atual: 1,
  };
  const autor = { autor_nome: "Avaliadora Fictícia de Teste", em: "2026-09-30" };
  const compsPtam = [
    comp("1", { identificacao: "Ed. Fictício A, 3 quartos, 7º andar", area_m2: 72, preco: 665000, foto_caminho: foto("comp1.jpg"), diferencas: "Andar mais baixo e sem varanda fechada.", ajustes: [{ fator: "Andar", percentual: 2, justificativa: "Imóvel avaliando em andar mais alto, com vista livre.", origem: "critério da avaliadora", ...autor }, { fator: "Oferta (desconto de negociação)", percentual: -4, justificativa: "Preço pedido em anúncio; desconto usual observado nas negociações da equipe.", origem: "histórico interno", ...autor }] }),
    comp("2", { identificacao: "Ed. Fictício B, 3 quartos com suíte", area_m2: 78, preco: 720000, foto_caminho: foto("comp2.jpg"), diferencas: "Acabamento reformado recentemente.", ajustes: [{ fator: "Conservação", percentual: -3, justificativa: "Referência reformada; imóvel avaliando em bom estado, sem reforma recente.", origem: "fotos do anúncio", ...autor }, { fator: "Oferta (desconto de negociação)", percentual: -4, justificativa: "Preço pedido em anúncio.", origem: "histórico interno", ...autor }] }),
    comp("3", { identificacao: "Ed. Fictício C, 3 quartos, nascente", area_m2: 74, preco: 680000, foto_caminho: foto("comp3.jpg"), ajustes: [{ fator: "Oferta (desconto de negociação)", percentual: -4, justificativa: "Preço pedido em anúncio.", origem: "histórico interno", ...autor }] }),
    comp("4", { identificacao: "Venda intermediada — processo fictício 0000", area_m2: 76, preco: 668000, tipo_preco: "transacao", fonte_tipo: "interno", fonte_nome: "Base interna do Vitral (fictício)", fonte_url: null, referencia_interna: "PROC-TESTE-0000", status_anuncio: "Negócio concluído", data_coleta: "2026-09-25", foto_caminho: foto("comp4.jpg"), diferencas: "Mesmo padrão construtivo; negócio fechado há dois meses." }),
    comp("5", { identificacao: "Ed. Fictício D, 3 quartos, 2 vagas", area_m2: 82, preco: 760000, fonte_tipo: "externo", fonte_nome: "Fonte Externa Fictícia (planilha importada)", diferencas: "Uma vaga a mais.", ajustes: [{ fator: "Vagas de garagem", percentual: -3, justificativa: "Referência com duas vagas; imóvel avaliando com uma.", origem: "critério da avaliadora", ...autor }, { fator: "Oferta (desconto de negociação)", percentual: -4, justificativa: "Preço pedido em anúncio.", origem: "histórico interno", ...autor }] }),
    comp("6", { identificacao: "Ed. Fictício A, 3 quartos (anúncio repetido)", area_m2: 72, preco: 669000, incluido: false, duplicata: true, motivo_exclusao: "Mesmo imóvel da referência A, anunciado por outra imobiliária." }),
  ];
  const arqsPtam = arquivos([
    ["capa.jpg", "imovel", "Fachada (ilustração)", true],
    ["sala.jpg", "imovel", "Sala (ilustração)"],
    ["cozinha.jpg", "imovel", "Cozinha (ilustração)"],
    ["quarto.jpg", "imovel", "Suíte (ilustração)"],
    ["varanda.jpg", "vistoria", "Varanda — vistoria (ilustração)"],
    ["fachada.jpg", "vistoria", "Fachada — vistoria (ilustração)"],
  ]);
  let conteudo = montarConteudo({ avaliacao: ptam, comparaveis: compsPtam, arquivos: arqsPtam, responsavel, limiares: LIMIARES_PADRAO });
  ptam.valor_sugerido = conteudo.calculo.valorCalculado;
  conteudo = montarConteudo({ avaliacao: ptam, comparaveis: compsPtam, arquivos: arqsPtam, responsavel, limiares: LIMIARES_PADRAO });
  console.log("PTAM venda —", JSON.stringify({ valor: conteudo.precificacao.valor_sugerido, faixa: [conteudo.precificacao.faixa_min, conteudo.precificacao.faixa_max], validacao: validarParaEmissao(conteudo) }, null, 1));
  const assinatura = foto("assinatura.png") ? imagens["assinatura.png"] : null;
  writeFileSync(
    path.join(saida, "teste-ptam-venda-emitido.pdf"),
    await gerarPdfAvaliacao(conteudo, {
      rascunho: false,
      versao: 1,
      emitidoEm: "2026-10-01T15:30:00Z",
      elaboradoPor: "Corretor Fictício",
      aprovacao: { nome: responsavel.nome, cargo: "Diretora", em: "2026-10-01T15:10:00Z", ehResponsavelTecnica: true },
      assinatura,
      imagens,
      demonstracao: true,
      fontes,
    })
  );

  // ------------------------------------------------------------
  // 2) Estudo comercial de locação, em rascunho (sem fotos, 3 comparáveis,
  //    valor editado com justificativa, sem vistoria)
  // ------------------------------------------------------------
  const estudo: AvaliacaoBase = {
    id: "teste-estudo",
    codigo: "AV-TESTE-0002",
    modalidade: "estudo_comercial",
    finalidade: "locacao",
    tipologia: "comercial",
    status: "rascunho",
    titulo: "Sala comercial fictícia",
    proprietario_nome: "Locador Fictício Ltda.",
    bairro: "Centro Fictício",
    cidade: "Cidade Exemplo",
    data_base: "2026-10-01",
    area_m2: 48,
    dados: {
      objetivo: "Orientar o valor de anúncio para locação da sala (documento de teste).",
      subtipo: "Sala comercial",
      endereco: "Avenida Exemplo, 100, sala 305",
      endereco_abreviado_pdf: true,
      uf: "DF",
      vagas: 1,
      pe_direito_m: 2.8,
      estado_conservacao: "Bom",
      valor_condominio: 620,
      vistoria_status: "nao_realizada",
      recorte_geografico: "Edifícios comerciais do Centro Fictício.",
      recorte_periodo: "Anúncios consultados em 28/09/2026.",
      recorte_criterios: "Salas de 40 m² a 60 m², com 1 vaga.",
      justificativa_valor: "Arredondamento comercial para a faixa de busca dos portais (até R$ 2.500), dentro da faixa indicativa.",
      fundamentacao: "Três salas semelhantes anunciadas no mesmo bairro, sem ajustes. Adotou-se a mediana do aluguel por m² multiplicada pela área da sala.",
      estrategia_posicionamento: "Anunciar no valor sugerido, destacando a vaga e o condomínio abaixo da média do edifício.",
      estrategia_publico: "Profissionais liberais e pequenos escritórios (hipótese a confirmar com as primeiras consultas).",
      estrategia_preparacao: "Fotografar a sala vazia e limpa, com luz natural.",
      estrategia_canais: "Site da Sacra Netimóveis e portais em que a imobiliária já anuncia.",
      estrategia_reavaliacao: "Reavaliar o valor depois de 30 dias de anúncio ou de 5 visitas sem proposta.",
      conclusao_texto: "Sugere-se anunciar a locação pelo valor indicado, acompanhando a procura nas primeiras semanas.",
    },
    valor_calculado: null,
    faixa_min: null,
    faixa_max: null,
    faixa_manual: false,
    valor_sugerido: 2500,
    margem_negociacao_pct: 5,
    valor_proprietario: null,
    revisao: 1,
    versao_atual: 0,
  };
  const compsLoc = [
    comp("1", { identificacao: "Sala fictícia 1, Ed. Comercial Exemplo", regiao: "Centro Fictício", finalidade: "locacao", tipologia: "comercial", area_m2: 45, quartos: null, suites: null, preco: 2300 }),
    comp("2", { identificacao: "Sala fictícia 2, Ed. Empresarial Modelo", regiao: "Centro Fictício", finalidade: "locacao", tipologia: "comercial", area_m2: 52, quartos: null, suites: null, preco: 2750 }),
    comp("3", { identificacao: "Sala fictícia 3, Ed. Comercial Exemplo, com um nome propositalmente longo para testar a quebra de linha do cartão", regiao: "Centro Fictício", finalidade: "locacao", tipologia: "comercial", area_m2: 50, quartos: null, suites: null, preco: 2550 }),
  ];
  const conteudoLoc = montarConteudo({ avaliacao: estudo, comparaveis: compsLoc, arquivos: [], responsavel, limiares: LIMIARES_PADRAO });
  console.log("Estudo locação —", JSON.stringify({ calculado: conteudoLoc.precificacao.valor_calculado, faixa: [conteudoLoc.precificacao.faixa_min, conteudoLoc.precificacao.faixa_max], validacao: validarParaEmissao(conteudoLoc) }, null, 1));
  writeFileSync(
    path.join(saida, "teste-estudo-locacao-rascunho.pdf"),
    await gerarPdfAvaliacao(conteudoLoc, {
      rascunho: true,
      versao: null,
      emitidoEm: null,
      elaboradoPor: "Corretor Fictício",
      aprovacao: null,
      assinatura: null,
      imagens,
      demonstracao: true,
      fontes,
    })
  );
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
