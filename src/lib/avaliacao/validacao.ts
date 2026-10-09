/**
 * Conferência antes de emitir. "Bloqueios" impedem a emissão (o
 * rascunho sempre pode ser salvo); "alertas" só chamam a atenção.
 *
 * Para o PTAM, os bloqueios cobrem o conteúdo mínimo do art. 5º da
 * Resolução COFECI nº 1.066/2007.
 */

import { alertasDaAmostra, posicaoNaFaixa } from "./calculo";
import type { ConteudoAvaliacao } from "./conteudo";
import type { EtapaEditor } from "./tipos";

export type ItemValidacao = { etapa: EtapaEditor; mensagem: string };
export type ResultadoValidacao = { bloqueios: ItemValidacao[]; alertas: ItemValidacao[] };

const PADRAO_PLACEHOLDER = /\[[^\]]{0,60}\]|\bTODO\b|\bXXX+\b|lorem ipsum/i;

function vazio(valor: unknown): boolean {
  return valor === null || valor === undefined || String(valor).trim() === "";
}

export function validarParaEmissao(c: ConteudoAvaliacao): ResultadoValidacao {
  const bloqueios: ItemValidacao[] = [];
  const alertas: ItemValidacao[] = [];
  const bloquear = (etapa: EtapaEditor, mensagem: string) => bloqueios.push({ etapa, mensagem });
  const alertar = (etapa: EtapaEditor, mensagem: string) => alertas.push({ etapa, mensagem });
  const d = c.dados;
  const p = c.precificacao;
  const ptam = c.modalidade === "ptam";

  if (!ptam) {
    if (vazio(c.data_base)) bloquear("dados", "Informe a data da avaliação.");
    if (vazio(d.solicitante_nome) && vazio(c.proprietario_nome) && vazio(d.destinatario)) bloquear("dados", "Informe o nome do cliente.");
    if (vazio(d.endereco)) bloquear("dados", "Informe o endereço do imóvel.");
    if (!c.area_m2 || !Number.isFinite(c.area_m2) || c.area_m2 <= 0) bloquear("dados", "Informe uma área maior que zero.");
    if (!p.valor_sugerido || !Number.isFinite(p.valor_sugerido) || p.valor_sugerido <= 0) bloquear("revisao", "Informe o valor sugerido.");
    if (vazio(d.conclusao_texto)) bloquear("revisao", "Escreva e salve a conclusão do laudo.");
    for (const chave of ["carta_texto", "parecer_avaliadora", "conclusao_texto", "limitacoes_texto"] as const) {
      if (PADRAO_PLACEHOLDER.test(d[chave] ?? "")) bloquear("revisao", "Revise os textos provisórios do laudo antes de emitir.");
    }
    for (const x of c.comparaveis.filter((x) => x.incluido)) {
      if (x.finalidade !== c.finalidade) bloquear("comparaveis", "Venda e locação não podem ser misturadas nos comparáveis.");
      if (!x.identificacao.trim() || !x.preco || !Number.isFinite(x.preco) || x.preco <= 0 || !x.area_m2 || !Number.isFinite(x.area_m2) || x.area_m2 <= 0) bloquear("comparaveis", `Complete identificação, área e preço do comparável \"${x.identificacao}\".`);
      if (x.fonte_url && !/^https?:\/\//i.test(x.fonte_url)) bloquear("comparaveis", "Revise o link do comparável: use http:// ou https://.");
    }
    return { bloqueios, alertas };
  }

  // --- identificação e finalidade
  if (vazio(c.data_base)) bloquear("dados", "Informe a data-base da avaliação.");
  if (vazio(d.objetivo)) bloquear("dados", "Descreva o objetivo da avaliação.");
  if (vazio(c.proprietario_nome) && vazio(d.destinatario) && vazio(d.solicitante_nome)) {
    bloquear("dados", "Informe o proprietário, o solicitante ou o destinatário do documento.");
  }

  // --- imóvel
  if (vazio(d.endereco)) bloquear("imovel", "Informe o endereço do imóvel.");
  if (vazio(c.bairro)) bloquear("imovel", "Informe o bairro.");
  if (vazio(c.cidade)) bloquear("imovel", "Informe a cidade.");
  if (!c.area_m2 || c.area_m2 <= 0) bloquear("imovel", "Informe a área do imóvel (maior que zero).");
  if (c.arquivos.filter((a) => a.tipo === "imovel").length === 0) {
    alertar("imovel", "Nenhuma foto do imóvel: a capa sairá sem fotografia.");
  }
  if (!vazio(d.lacunas)) alertar("imovel", "Há lacunas de informação registradas; elas aparecerão nas limitações.");

  // --- vistoria
  if (vazio(d.vistoria_status)) {
    bloquear("vistoria", "Indique a situação da vistoria (não realizada, agendada ou realizada).");
  } else if (d.vistoria_status === "realizada") {
    if (vazio(d.vistoria_data)) bloquear("vistoria", "Informe a data da vistoria realizada.");
    if (vazio(d.vistoria_responsavel)) bloquear("vistoria", "Informe quem realizou a vistoria.");
  } else {
    alertar("vistoria", "Sem vistoria realizada: o PDF declara que a análise se baseou em informações fornecidas.");
  }

  // --- pesquisa de mercado
  if (vazio(d.recorte_geografico)) bloquear("comparaveis", "Descreva o recorte geográfico da pesquisa.");
  if (vazio(d.recorte_periodo)) bloquear("comparaveis", "Informe o período da pesquisa.");
  const incluidos = c.comparaveis.filter((x) => x.incluido && x.finalidade === c.finalidade);
  if (c.comparaveis.some((x) => x.finalidade !== c.finalidade)) {
    bloquear("comparaveis", "Há comparáveis de finalidade diferente da avaliação (venda e locação não se misturam).");
  }
  if (c.calculo.amostraFinal === 0) {
    bloquear("comparaveis", "Não há comparáveis válidos: sem amostra não há sustentação para conclusão numérica.");
  } else if (c.calculo.amostraFinal < c.limiares.amostraMinima && vazio(d.amostra_justificativa)) {
    bloquear(
      "comparaveis",
      `Amostra com ${c.calculo.amostraFinal} comparável(is), abaixo de ${c.limiares.amostraMinima}: registre a justificativa para prosseguir.`
    );
  }
  for (const x of incluidos) {
    if (vazio(x.data_coleta)) bloquear("comparaveis", `"${x.identificacao}": falta a data de consulta.`);
    if (x.fonte_tipo !== "interno" && vazio(x.fonte_url) && vazio(x.referencia_interna)) {
      bloquear("comparaveis", `"${x.identificacao}": falta o link ou a referência da fonte.`);
    }
    if (vazio(x.fonte_nome)) bloquear("comparaveis", `"${x.identificacao}": falta o nome da fonte.`);
    for (const aj of x.ajustes ?? []) {
      if (vazio(aj.justificativa)) bloquear("preco", `"${x.identificacao}": ajuste "${aj.fator}" sem justificativa.`);
    }
  }
  if (c.calculo.ofertas > 0 && c.calculo.transacoes > 0) {
    alertar("comparaveis", "A amostra mistura preços de oferta e transações confirmadas; o PDF identifica cada um.");
  }
  if (c.calculo.transacoes === 0 && c.calculo.amostraFinal > 0) {
    alertar("comparaveis", "Amostra só com preços de oferta: a conclusão se refere a preços pedidos, não a vendas realizadas.");
  }
  const alertasAmostra = alertasDaAmostra(c.comparaveis, {
    finalidade: c.finalidade,
    areaImovelM2: c.area_m2,
    bairro: c.bairro,
    tipologia: c.tipologia,
    dataBase: c.data_base,
    limiares: c.limiares,
  });
  if (alertasAmostra.length > 0) {
    alertar("comparaveis", `${alertasAmostra.length} alerta(s) de qualidade nos comparáveis (veja na etapa Comparáveis).`);
  }
  if (
    alertasAmostra.some((al) => al.tipo === "regiao_divergente") &&
    vazio(d.ampliacao_justificativa)
  ) {
    bloquear("comparaveis", "Há comparáveis de outra região: registre a justificativa da ampliação do recorte.");
  }

  // --- precificação
  if (p.faixa_min === null || p.faixa_max === null || p.faixa_min <= 0 || p.faixa_max <= 0) {
    bloquear("preco", "Defina a faixa indicativa de mercado.");
  } else if (p.faixa_min > p.faixa_max) {
    bloquear("preco", "Faixa indicativa incoerente: o mínimo é maior que o máximo.");
  }
  if (!p.valor_sugerido || p.valor_sugerido <= 0) {
    bloquear("preco", c.finalidade === "venda" ? "Defina o valor sugerido de anúncio." : "Defina o valor sugerido de locação.");
  } else {
    const posicao = posicaoNaFaixa(p.valor_sugerido, p.faixa_min, p.faixa_max);
    if (posicao === "abaixo" || posicao === "acima") {
      alertar("preco", `O valor sugerido está ${posicao} da faixa indicativa.`);
    }
    if (p.valor_calculado !== null && p.valor_sugerido !== p.valor_calculado && vazio(p.justificativa_valor)) {
      bloquear("preco", "O valor sugerido difere do calculado e não tem justificativa registrada.");
    }
  }
  if (p.faixa_manual && vazio(p.justificativa_faixa)) {
    bloquear("preco", "A faixa foi editada manualmente e não tem justificativa registrada.");
  }
  if (p.faixa_manual) alertar("preco", "A faixa indicativa foi editada manualmente (registrado no histórico).");
  if (vazio(d.fundamentacao)) bloquear("preco", "Escreva a fundamentação do valor (como se chegou ao resultado).");

  // --- textos
  for (const [chave, valor] of Object.entries(d)) {
    if (typeof valor === "string" && PADRAO_PLACEHOLDER.test(valor)) {
      bloquear("textos", `Há texto provisório (marcador entre colchetes, "TODO" ou "XXX") no campo "${chave}".`);
    }
  }
  if (vazio(d.conclusao_texto)) bloquear("textos", "Escreva a conclusão.");

  // --- PTAM: conteúdo mínimo da Resolução COFECI nº 1.066/2007, art. 5º
  if (ptam) {
    if (vazio(d.solicitante_nome)) bloquear("dados", "PTAM: identifique o solicitante.");
    if (vazio(c.proprietario_nome)) bloquear("dados", "PTAM: identifique o proprietário do imóvel.");
    if (vazio(d.matricula)) bloquear("imovel", "PTAM: informe o número da matrícula.");
    if (vazio(d.cartorio)) bloquear("imovel", "PTAM: informe o Cartório de Registro de Imóveis.");
    if (vazio(d.confrontacoes)) bloquear("imovel", "PTAM: descreva localização e confrontações.");
    if (vazio(d.medidas_perimetricas)) bloquear("imovel", "PTAM: informe as medidas perimétricas/superfície.");
    if (vazio(d.benfeitorias)) bloquear("imovel", "PTAM: descreva acessórios e benfeitorias (ou registre que não há).");
    if (vazio(d.aproveitamento_economico)) bloquear("imovel", "PTAM: descreva o aproveitamento econômico do imóvel.");
    if (vazio(d.infraestrutura_entorno)) bloquear("localizacao", "PTAM: descreva a vizinhança e a infraestrutura disponível.");
    if (d.vistoria_status !== "realizada") {
      bloquear("vistoria", "PTAM: a vistoria precisa estar realizada, com data (a Resolução exige a data da vistoria).");
    }
    if (vazio(d.parecer_avaliadora)) bloquear("textos", "PTAM: registre a análise da avaliadora.");
    if (vazio(c.responsavel.nome) || vazio(c.responsavel.creci)) {
      bloquear("revisao", "PTAM: configure a identificação e o CRECI da avaliadora responsável.");
    }
    if (vazio(c.responsavel.curriculo)) {
      bloquear("revisao", "PTAM: cadastre o breve currículo da avaliadora (Configuração da avaliação).");
    }
    if (vazio(d.selo_numero)) {
      alertar("textos", "PTAM sem número de selo certificador: o PDF informará que o selo não foi aplicado.");
    }
    const tiposAnexos = new Set(c.arquivos.map((a) => a.tipo));
    if (!tiposAnexos.has("matricula")) alertar("imovel", "PTAM: recomenda-se anexar a certidão atualizada da matrícula.");
    if (!tiposAnexos.has("mapa")) alertar("imovel", "PTAM: recomenda-se anexar o mapa de localização.");
    if (!tiposAnexos.has("vistoria") && !tiposAnexos.has("imovel")) {
      alertar("vistoria", "PTAM: recomenda-se o relatório fotográfico.");
    }
  }

  return { bloqueios, alertas };
}
