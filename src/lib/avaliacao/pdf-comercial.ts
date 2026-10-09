import type { ConteudoAvaliacao } from "./conteudo";
import { COR, Diagramador, LARGURA_UTIL, MARGEM } from "./pdf-base";
import type { OpcoesPdf } from "./pdf";

const data = (iso: string | null) => iso ? iso.slice(0, 10).split("-").reverse().join("/") : "Não informada";
const numero = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const dinheiro = (n: number | null, aluguel: boolean) => n == null ? "Não informado" : `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${aluguel ? "/mês" : ""}`;

/** Relatório comercial compacto; referências e valor são os informados pela equipe. */
export async function gerarPdfComercial(c: ConteudoAvaliacao, o: OpcoesPdf): Promise<Uint8Array> {
  const g = new Diagramador("SACRA / AVALIAÇÃO DE IMÓVEL", o.imagens);
  await g.iniciar(o.fontes);
  g.doc.setTitle(`Avaliação comercial - ${c.titulo}`);
  g.doc.setAuthor("Sacra Netimóveis");
  g.doc.setCreator("Vitral");
  const d = c.dados;
  const aluguel = c.finalidade === "locacao";
  const cliente = d.solicitante_nome || c.proprietario_nome || d.destinatario || "Cliente";
  const fotos = c.arquivos.filter(x => x.tipo === "imovel" && x.mime_type.startsWith("image/"));
  const capa = fotos.find(x => x.capa) ?? fotos[0];
  const endereco = d.endereco_abreviado_pdf ? [c.bairro, c.cidade].filter(Boolean).join(", ") : [d.endereco, d.complemento, c.bairro, c.cidade, d.uf].filter(Boolean).join(", ");
  const comps = c.comparaveis.filter(x => x.incluido && x.finalidade === c.finalidade);

  g.novaPagina("Apresentação", "01", "vinho");
  const logo = await g.imagem("__logo_dourado");
  if (logo) g.imagemContida(logo, MARGEM, 695, 160, 60, "esquerda");
  g.y = 660;
  g.abertura(aluguel ? "Locação" : "Venda", "Avaliação\ncomercial de imóvel", { tamanho: 33 });
  g.paragrafo(c.titulo, { fonte: g.serif, tamanho: 19, cor: COR.branco, depois: 16 });
  g.paragrafo(`Preparada para ${cliente}`, { tamanho: 11, cor: COR.rosado });
  g.paragrafo(`Data de referência: ${data(c.data_base)}  |  ${c.codigo}${o.versao ? `  |  Versão ${o.versao}` : ""}`, { tamanho: 8.5, cor: COR.rosado, depois: 20 });
  const imagem = await g.imagem(capa?.caminho_storage);
  if (imagem) {
    const altura = Math.min(220, Math.max(100, g.y - 140));
    g.garantir(altura + 16);
    g.imagemCobrindo(imagem, MARGEM, g.y - altura, LARGURA_UTIL, altura);
    g.y -= altura + 20;
  }
  g.paragrafo("Sacra Netimóveis", { fonte: g.serif, tamanho: 14, cor: COR.dourado });

  g.novaPagina("Cliente e imóvel", "02");
  g.abertura("Identificação", "Seu imóvel,\nem detalhes.");
  g.fichas([
    ["Cliente", cliente], ["Contato", d.solicitante_contato],
    ["CPF/CNPJ", d.solicitante_documento], ["Proprietário", c.proprietario_nome],
    ["Endereço", endereco], ["Tipo", d.subtipo || c.tipologia],
    ["Área", c.area_m2 ? `${numero(c.area_m2)} m²` : null],
    ["Quartos", d.quartos == null ? null : numero(d.quartos)],
    ["Banheiros", d.banheiros == null ? null : numero(d.banheiros)],
    ["Vagas", d.vagas == null ? null : numero(d.vagas)],
    ["Conservação", d.estado_conservacao],
  ]);
  if (d.diferenciais?.trim()) {
    g.subtitulo("Descrição e diferenciais");
    g.paragrafo(d.diferenciais);
  }
  if (d.carta_texto?.trim()) {
    g.subtitulo("Apresentação");
    g.paragrafo(d.carta_texto);
  }

  if (comps.length) {
    g.novaPagina("Imóveis comparáveis", "03");
    g.abertura("Referências de mercado", "Imóveis semelhantes.", { introducao: "Preços e características informados pela equipe, apresentados sem fatores de ajuste." });
    for (const [i, x] of comps.entries()) {
      g.subtitulo(`Referência ${String(i + 1).padStart(2, "0")}`, { reservar: 115 });
      g.paragrafo(x.identificacao, { fonte: g.serif, tamanho: 15 });
      g.fichas([
        ["Localização", x.regiao], ["Área", x.area_m2 ? `${numero(x.area_m2)} m²` : null],
        [x.tipo_preco === "transacao" ? "Preço negociado / confirmado" : "Preço anunciado", dinheiro(x.preco, aluguel)],
        ["Data da consulta", x.data_coleta ? data(x.data_coleta) : null],
      ]);
      if (x.observacoes?.trim()) g.paragrafo(x.observacoes);
      if (x.fonte_url) g.paragrafo(`Referência: ${x.fonte_url}`, { tamanho: 8, cor: COR.cinza });
      else if (x.fonte_nome) g.paragrafo(`Fonte: ${x.fonte_nome}`, { tamanho: 8, cor: COR.cinza });
      g.espaco(8);
    }
  }

  g.novaPagina("Conclusão", comps.length ? "04" : "03");
  g.abertura("Recomendação comercial", "Valor sugerido.");
  g.garantir(108);
  g.pagina.drawRectangle({ x: MARGEM, y: g.y - 88, width: LARGURA_UTIL, height: 88, color: COR.marfim });
  g.pagina.drawRectangle({ x: MARGEM, y: g.y - 88, width: 3, height: 88, color: COR.dourado });
  g.rotulo(aluguel ? "Aluguel mensal" : "Venda", MARGEM + 18, g.y - 22);
  g.y -= 35;
  g.paragrafo(dinheiro(c.precificacao.valor_sugerido, aluguel), { fonte: g.serif, tamanho: 25, x: MARGEM + 18, largura: LARGURA_UTIL - 36, cor: COR.vinho, depois: 24 });
  if (d.parecer_avaliadora?.trim()) {
    g.subtitulo("Análise do imóvel e do mercado");
    g.paragrafo(d.parecer_avaliadora);
  }
  if (d.conclusao_texto?.trim()) {
    g.subtitulo("Conclusão");
    g.paragrafo(d.conclusao_texto);
  }
  if (d.limitacoes_texto?.trim()) {
    g.subtitulo("Observações finais");
    g.paragrafo(d.limitacoes_texto);
  }
  g.subtitulo("Sobre esta avaliação");
  g.paragrafo("Este relatório apresenta uma estimativa comercial para divulgação e negociação do imóvel, com base nas informações disponíveis na data de referência. O valor indicado não garante o preço de fechamento.", { tamanho: 8, cor: COR.cinza });
  if (d.vistoria_status === "realizada") {
    g.paragrafo(`Vistoria registrada em ${data(d.vistoria_data ?? null)}${d.vistoria_responsavel ? ` por ${d.vistoria_responsavel}` : ""}.`, { tamanho: 8, cor: COR.cinza });
  } else {
    g.paragrafo("A análise utiliza informações fornecidas sobre o imóvel, sem vistoria presencial registrada.", { tamanho: 8, cor: COR.cinza });
  }
  const assinante = o.aprovacao?.ehResponsavelTecnica ? c.responsavel.nome : o.aprovacao?.nome;
  g.subtitulo(o.rascunho ? "Elaboração" : "Responsável pela emissão", { reservar: 100 });
  if (!o.rascunho && o.assinatura) {
    const assinatura = await g.doc.embedPng(o.assinatura.bytes);
    g.imagemContida(assinatura, MARGEM, g.y - 45, 140, 45, "esquerda");
    g.y -= 52;
  }
  g.paragrafo(assinante || o.elaboradoPor || "Sacra Netimóveis", { fonte: g.sansNegrito });
  if (o.aprovacao?.ehResponsavelTecnica && c.responsavel.creci) g.paragrafo(`CRECI ${c.responsavel.creci}`, { tamanho: 8 });
  if (o.emitidoEm) g.paragrafo(`Emissão em ${data(o.emitidoEm)}`, { tamanho: 8, cor: COR.cinza });

  // Fotos adicionais têm legenda e paginação próprias.
  const adicionais = fotos.filter(x => x.id !== capa?.id);
  for (const [i, foto] of adicionais.entries()) {
    const img = await g.imagem(foto.caminho_storage);
    if (!img) continue;
    g.novaPagina("Fotos do imóvel", String((comps.length ? 5 : 4) + i).padStart(2, "0"));
    g.abertura("Registro fotográfico", "Conheça o imóvel.");
    g.imagemContida(img, MARGEM, 185, LARGURA_UTIL, 410, "centro");
    g.y = 155;
    if (foto.legenda) g.paragrafo(foto.legenda, { tamanho: 9 });
  }
  g.finalizar(`Sacra Netimóveis  |  ${c.codigo}  |  ${data(c.data_base)}`, {
    marcaDagua: o.rascunho ? "RASCUNHO" : null,
    avisoRodape: o.demonstracao ? "DADOS FICTÍCIOS - DOCUMENTO DE TESTE" : null,
  });
  return g.doc.save();
}
