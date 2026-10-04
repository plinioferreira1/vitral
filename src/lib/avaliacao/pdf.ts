/**
 * PDF editorial da Avaliação de Imóveis (estudo comercial e PTAM).
 *
 * Recebe o conteúdo já montado (montarConteudo) e as imagens em bytes;
 * não acessa banco nem rede — por isso a mesma função serve à prévia,
 * à emissão e ao PDF de teste. Seções sem dados não são impressas.
 */

import { arredondarValor, passoArredondamento, posicaoNaFaixa, precoPorM2 } from "./calculo";
import type { ConteudoAvaliacao } from "./conteudo";
import { A4, BASE, COR, Diagramador, LARGURA_UTIL, MARGEM, limpar, type FontesPdf, type Imagem } from "./pdf-base";
import {
  CHECKLIST_VISTORIA,
  ROTULO_FINALIDADE,
  ROTULO_FONTE_TIPO,
  ROTULO_SITUACAO_CHECKLIST,
  ROTULO_TIPOLOGIA,
  ROTULO_VISTORIA,
  type Comparavel,
  type Finalidade,
} from "./tipos";

export const CHAVE_LOGO_BORDO = "__logo_bordo";
export const CHAVE_LOGO_DOURADO = "__logo_dourado";

export type OpcoesPdf = {
  /** true = prévia (marca d'água RASCUNHO, sem assinatura) */
  rascunho: boolean;
  versao: number | null;
  emitidoEm: string | null;
  elaboradoPor: string | null;
  aprovacao: { nome: string; cargo: string | null; em: string; ehResponsavelTecnica: boolean } | null;
  /** imagem da assinatura da responsável; só é passada na emissão feita por ela */
  assinatura: Imagem | null;
  /** fotos por caminho + logos nas chaves CHAVE_LOGO_* */
  imagens: Record<string, Imagem>;
  /** fontes a incorporar (Liberation); se faltarem, usa as fontes padrão do leitor */
  fontes?: FontesPdf | null;
  /** PDF de teste: avisa em todas as páginas que os dados são fictícios */
  demonstracao?: boolean;
};

// ---------- formatação ----------

const FUSO = "America/Sao_Paulo";

function numero(v: number, casas = 0): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
export function moedaTotal(v: number | null | undefined, finalidade: Finalidade): string {
  if (v === null || v === undefined) return "—";
  return `R$ ${numero(v)}${finalidade === "locacao" ? "/mês" : ""}`;
}
export function moedaM2(v: number | null | undefined, finalidade: Finalidade): string {
  if (v === null || v === undefined) return "—";
  return finalidade === "locacao" ? `R$ ${numero(v, 2)}/m²/mês` : `R$ ${numero(v)}/m²`;
}
function area(v: number | null | undefined): string {
  if (!v) return "—";
  return `${numero(v, Number.isInteger(v) ? 0 : 2)} m²`;
}
function dataBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}
function dataHoraBR(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: FUSO, dateStyle: "short", timeStyle: "short" });
}
function mesAno(iso: string | null | undefined): string {
  if (!iso) return "";
  const [a, m] = iso.split("-").map(Number);
  const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return `${meses[m - 1]} ${a}`;
}
function tem(v: unknown): boolean {
  return v !== null && v !== undefined && String(v).trim() !== "";
}
function percentual(p: number): string {
  return `${p > 0 ? "+" : ""}${numero(p, Number.isInteger(p) ? 0 : 1)}%`;
}
function letra(i: number): string {
  return i < 26 ? String.fromCharCode(65 + i) : `${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) + 1}`;
}
function configuracao(c: { quartos: number | null; suites: number | null; vagas: number | null }): string {
  const partes: string[] = [];
  if (c.quartos) partes.push(`${c.quartos} quarto${c.quartos > 1 ? "s" : ""}`);
  if (c.suites) partes.push(`${c.suites} suíte${c.suites > 1 ? "s" : ""}`);
  if (c.vagas) partes.push(`${c.vagas} vaga${c.vagas > 1 ? "s" : ""}`);
  return partes.join(" • ");
}

// ---------- documento ----------

export async function gerarPdfAvaliacao(c: ConteudoAvaliacao, o: OpcoesPdf): Promise<Uint8Array> {
  const ptam = c.modalidade === "ptam";
  const fin = c.finalidade;
  const d = c.dados;
  const p = c.precificacao;
  const calc = c.calculo;
  const tituloDoc = ptam ? "Parecer Técnico de Avaliação Mercadológica" : "Estudo de Mercado";
  const nomeCurto = ptam ? "PTAM" : "ESTUDO DE MERCADO";

  const g = new Diagramador(`SACRA  /  ${nomeCurto}`, o.imagens);
  await g.iniciar(o.fontes);
  g.doc.setTitle(`${tituloDoc} — ${c.titulo}`);
  g.doc.setAuthor("Sacra Netimóveis");
  g.doc.setSubject(`${c.codigo}${o.versao ? ` v${o.versao}` : " (prévia)"}`);
  g.doc.setCreator("Vitral");

  const fotos = c.arquivos.filter((a) => a.tipo === "imovel" && a.mime_type.startsWith("image/"));
  const fotoCapa = fotos.find((f) => f.capa) ?? fotos[0] ?? null;
  const fotosVistoria = c.arquivos.filter((a) => a.tipo === "vistoria" && a.mime_type.startsWith("image/"));
  const incluidos = c.comparaveis.filter((x) => x.incluido && x.finalidade === fin);
  const excluidos = c.comparaveis.filter((x) => !x.incluido && x.finalidade === fin);
  const letras = new Map(incluidos.map((x, i) => [x.id, letra(i)]));
  const enderecoPdf =
    !ptam && d.endereco_abreviado_pdf
      ? [c.bairro, c.cidade].filter(tem).join(", ")
      : [d.endereco, d.complemento, c.bairro, c.cidade && `${c.cidade}${d.uf ? `/${d.uf}` : ""}`].filter(tem).join(", ");
  const tipoImovel = (d.subtipo?.trim() || ROTULO_TIPOLOGIA[c.tipologia]).toUpperCase();
  const rotuloValor = ptam
    ? fin === "venda"
      ? "Valor de avaliação para venda"
      : "Valor de avaliação para locação"
    : fin === "venda"
      ? "Valor sugerido de anúncio"
      : "Valor sugerido de locação";

  const vistoriaTexto =
    d.vistoria_status === "realizada"
      ? `Vistoria realizada em ${dataBR(d.vistoria_data)}${tem(d.vistoria_responsavel) ? ` por ${d.vistoria_responsavel}` : ""}.`
      : d.vistoria_status === "agendada"
        ? `Vistoria agendada${tem(d.vistoria_data) ? ` para ${dataBR(d.vistoria_data)}` : ""} e ainda não realizada: esta análise se baseou somente em informações fornecidas e em dados de mercado.`
        : "Não houve vistoria: esta análise se baseou somente em informações fornecidas e em dados de mercado, sem conferência presencial do imóvel.";

  const vistoriaRealizada = d.vistoria_status === "realizada";

  // ----- seções presentes (definem a numeração e o sumário) -----
  const temLocalizacao = [d.localizacao_descricao, d.localizacao_atributos, d.localizacao_influencia, d.infraestrutura_entorno].some(tem);
  const temEstrategia =
    !ptam &&
    [d.estrategia_posicionamento, d.estrategia_publico, d.estrategia_preparacao, d.estrategia_canais, d.estrategia_reavaliacao].some(tem);
  const temAjustes = incluidos.some((x) => (x.ajustes ?? []).length > 0) || excluidos.length > 0;
  const temFundamentacao = [d.fundamentacao, p.justificativa_valor, p.justificativa_faixa, d.parecer_avaliadora].some(tem);

  const secoes: { rotulo: string; resumo: string; desenhar: () => Promise<void> }[] = [];
  const abrir = (rotulo: string, fundo: "claro" | "vinho" = "claro") => {
    const n = secoes.findIndex((s) => s.rotulo === rotulo) + 1;
    g.novaPagina(rotulo, String(n).padStart(2, "0"), fundo);
  };

  // =============== CAPA ===============
  async function capa() {
    g.novaPagina("Capa", "", "capa");
    const pg = g.pagina;
    const alturaFoto = 560;
    const img = await g.imagem(fotoCapa?.caminho_storage);
    if (img) {
      g.imagemCobrindo(img, 0, A4.altura - alturaFoto, A4.largura, alturaFoto);
      pg.drawRectangle({ x: 0, y: A4.altura - alturaFoto, width: A4.largura, height: 230, color: COR.preto, opacity: 0.42 });
      pg.drawRectangle({ x: 0, y: A4.altura - 90, width: A4.largura, height: 90, color: COR.preto, opacity: 0.25 });
    } else {
      // composição sem fotografia: bloco vinho com moldura dourada
      pg.drawRectangle({ x: 0, y: A4.altura - alturaFoto, width: A4.largura, height: alturaFoto, color: COR.vinho });
      pg.drawRectangle({
        x: 28,
        y: A4.altura - alturaFoto + 28,
        width: A4.largura - 56,
        height: alturaFoto - 56,
        borderColor: COR.dourado,
        borderWidth: 0.8,
      });
      const logo = await g.imagem(CHAVE_LOGO_DOURADO);
      if (logo) g.imagemContida(logo, MARGEM + 6, A4.altura - 190, 150, 60, "esquerda");
    }
    pg.drawRectangle({ x: MARGEM, y: A4.altura - 62, width: 62, height: 1.6, color: COR.dourado });
    g.rotulo("Sacra Netimóveis", MARGEM, A4.altura - 80, { tamanho: 6.6, cor: COR.branco });

    const linhasTitulo = ptam ? ["PARECER TÉCNICO", "DE AVALIAÇÃO", "MERCADOLÓGICA"] : ["ESTUDO DE", "MERCADO"];
    const tamTitulo = ptam ? 30 : 38;
    let yTitulo = A4.altura - alturaFoto + 44 + (linhasTitulo.length - 1) * tamTitulo * 1.12;
    for (const linha of linhasTitulo) {
      g.escrever(linha, MARGEM, yTitulo, { fonte: g.sansNegrito, tamanho: tamTitulo, cor: COR.branco });
      yTitulo -= tamTitulo * 1.12;
    }

    let y = A4.altura - alturaFoto - 52;
    g.escrever(c.bairro?.trim() || c.titulo, MARGEM, y, { fonte: g.serif, tamanho: 24, cor: COR.vinho });
    const logo = await g.imagem(CHAVE_LOGO_BORDO);
    if (logo) g.imagemContida(logo, A4.largura - MARGEM - 150, y - 26, 150, 50, "direita");
    y -= 20;
    g.escrever([c.cidade, d.uf].filter(tem).join(" / "), MARGEM, y, { tamanho: 10, cor: COR.tinta });
    y -= 34;
    pg.drawRectangle({ x: MARGEM, y, width: LARGURA_UTIL, height: 1.4, color: COR.dourado });
    y -= 20;
    g.rotulo(`${tipoImovel}  •  ${area(c.area_m2).toUpperCase()}  •  ${ROTULO_FINALIDADE[fin]}`, MARGEM, y, { tamanho: 6.6 });
    g.rotulo(mesAno(c.data_base), A4.largura - MARGEM, y, { tamanho: 6.6, alinhar: "direita" });
    y -= 30;
    const destinatario = d.destinatario?.trim() || c.proprietario_nome?.trim() || d.solicitante_nome?.trim();
    if (destinatario) {
      g.rotulo("Preparado para", MARGEM, y, { tamanho: 5.8, cor: COR.cinzaClaro });
      g.escrever(destinatario, MARGEM, y - 15, { fonte: g.serif, tamanho: 12, cor: COR.tinta });
    }
    g.rotulo("Documento", A4.largura - MARGEM, y, { tamanho: 5.8, cor: COR.cinzaClaro, alinhar: "direita" });
    g.escrever(`${c.codigo}${o.versao ? `  •  versão ${o.versao}` : "  •  prévia"}`, A4.largura - MARGEM, y - 15, {
      tamanho: 9.5,
      cor: COR.tinta,
      alinhar: "direita",
    });
    if (o.demonstracao) {
      g.rotulo("Documento de teste  •  imóvel, pessoas, referências e valores fictícios", MARGEM, 40, {
        tamanho: 5.8,
        cor: COR.cinzaClaro,
      });
    }
  }

  // =============== APRESENTAÇÃO ===============
  secoes.push({
    rotulo: "Apresentação",
    resumo: "Objetivo, finalidade e escopo deste documento.",
    desenhar: async () => {
      abrir("Apresentação");
      g.abertura(ptam ? "Objeto do parecer" : "Um olhar estratégico", "O valor começa\npela leitura\ndo mercado.");
      const saudacao = c.proprietario_nome?.trim() || d.destinatario?.trim() || d.solicitante_nome?.trim();
      const cartaPadrao = ptam
        ? `Este Parecer Técnico de Avaliação Mercadológica apresenta a análise de mercado do imóvel descrito a seguir, para fins de ${fin === "venda" ? "venda" : "locação"}, com data de referência em ${dataBR(c.data_base)}. O valor indicado resulta da comparação com imóveis semelhantes identificados nesta pesquisa, com os ajustes e as justificativas registrados neste documento.`
        : `Este estudo mostra como o imóvel se posiciona diante das opções que ${fin === "venda" ? "o comprador" : "o locatário"} encontra hoje no mercado, com data-base em ${dataBR(c.data_base)}. A partir de referências identificadas, com fonte e data de consulta, ele indica uma faixa de mercado e um valor sugerido para ${fin === "venda" ? "o anúncio de venda" : "a locação mensal"}, explicando como se chegou a cada número.`;
      if (saudacao) g.paragrafo(`${saudacao},`, { fonte: g.serif, tamanho: 12.5, depois: 6 });
      g.paragrafo(tem(d.carta_texto) ? (d.carta_texto as string) : cartaPadrao, { fonte: g.serif, tamanho: 11.5, entrelinha: 18, depois: 18 });

      g.fichas([
        ["Solicitante", [d.solicitante_nome, d.solicitante_documento].filter(tem).join(" — ")],
        ["Proprietário", [c.proprietario_nome, ptam ? d.proprietario_documento : null].filter(tem).join(" — ")],
        ["Objetivo", d.objetivo],
        ["Finalidade", fin === "venda" ? "Venda" : "Locação (valores mensais)"],
        ["Data-base", dataBR(c.data_base)],
        ["Documento", `${ptam ? "PTAM" : "Estudo comercial de preço"} ${c.codigo}${o.versao ? `, versão ${o.versao}` : " (prévia não emitida)"}`],
      ]);

      g.subtitulo("Neste documento", { antes: 6 });
      g.indice(secoes.map((s) => ({ titulo: s.rotulo, texto: s.resumo })));
    },
  });

  // =============== O IMÓVEL ===============
  secoes.push({
    rotulo: "O imóvel",
    resumo: "Dados e características que pesam na comparação.",
    desenhar: async () => {
      abrir("O imóvel");
      g.abertura("O ponto de partida", "A singularidade\nde cada imóvel.");

      const principal = fotos.find((f) => f !== fotoCapa) ?? fotoCapa;
      const img = await g.imagem(principal?.caminho_storage);
      const metricas: [string, string][] = [];
      if (c.area_m2) metricas.push([area(c.area_m2).toUpperCase(), c.tipologia === "terreno" ? "Área do terreno" : "Área privativa"]);
      if (c.tipologia === "residencial") {
        if (d.quartos) metricas.push([String(d.quartos).padStart(2, "0"), d.quartos > 1 ? "Quartos" : "Quarto"]);
        if (d.suites) metricas.push([String(d.suites).padStart(2, "0"), d.suites > 1 ? "Suítes" : "Suíte"]);
        if (d.vagas) metricas.push([String(d.vagas).padStart(2, "0"), d.vagas > 1 ? "Vagas" : "Vaga"]);
      } else if (c.tipologia === "comercial") {
        if (d.vagas) metricas.push([String(d.vagas).padStart(2, "0"), d.vagas > 1 ? "Vagas" : "Vaga"]);
        if (d.pe_direito_m) metricas.push([`${numero(d.pe_direito_m, 1)} M`, "Pé-direito"]);
        if (d.frente_m) metricas.push([`${numero(d.frente_m, 1)} M`, "Frente"]);
      } else {
        if (d.frente_m) metricas.push([`${numero(d.frente_m, 1)} M`, "Frente"]);
        if (tem(d.topografia)) metricas.push([String(d.topografia).toUpperCase().slice(0, 14), "Topografia"]);
      }

      const alturaFoto = img ? 215 : 0;
      if (img) {
        g.imagemCobrindo(img, MARGEM, g.y - alturaFoto, LARGURA_UTIL, alturaFoto);
        g.y -= alturaFoto;
      }
      if (metricas.length > 0) {
        const alturaFaixa = 62;
        g.pagina.drawRectangle({ x: MARGEM, y: g.y - alturaFaixa, width: LARGURA_UTIL, height: alturaFaixa, color: COR.vinho });
        const coluna = LARGURA_UTIL / Math.max(metricas.length, 4);
        metricas.slice(0, 4).forEach(([valor, rot], i) => {
          const x = MARGEM + 16 + i * coluna;
          g.escrever(valor, x, g.y - 30, { fonte: g.sansNegrito, tamanho: 14, cor: COR.branco });
          g.rotulo(rot, x, g.y - 46, { tamanho: 5.6, cor: COR.dourado });
        });
        g.y -= alturaFaixa;
      }
      g.espaco(22);

      g.fichas([
        ["Endereço", enderecoPdf],
        ["Tipo", [ROTULO_TIPOLOGIA[c.tipologia], d.subtipo].filter(tem).join(" — ")],
        ["Área privativa", c.tipologia === "terreno" ? null : area(c.area_m2)],
        ["Área total", d.area_total_m2 ? area(d.area_total_m2) : null],
        ["Área do terreno", d.area_terreno_m2 ? area(d.area_terreno_m2) : c.tipologia === "terreno" ? area(c.area_m2) : null],
        ["Banheiros", d.banheiros ? String(d.banheiros) : null],
        ["Andar / posição", [d.andar, d.posicao_solar].filter(tem).join(" • ")],
        ["Idade aparente", d.idade_anos ? `${d.idade_anos} anos` : null],
        ["Estado de conservação", d.estado_conservacao],
        ["Padrão de acabamento", d.padrao_acabamento],
        ["Condomínio", d.valor_condominio ? `R$ ${numero(d.valor_condominio, 2)}/mês` : null],
        ["IPTU", d.valor_iptu ? `R$ ${numero(d.valor_iptu, 2)}/ano` : null],
        ["Zoneamento / uso", d.zoneamento],
        ["Topografia", c.tipologia === "terreno" ? d.topografia : null],
      ]);

      if (tem(d.diferenciais)) {
        g.subtitulo("Diferenciais observados");
        g.paragrafo(d.diferenciais as string);
      }

      if (ptam) {
        g.subtitulo("Identificação e caracterização do imóvel");
        g.fichas(
          [
            ["Proprietário", [c.proprietario_nome, d.proprietario_documento].filter(tem).join(" — ")],
            ["Matrícula", d.matricula],
            ["Cartório de Registro de Imóveis", d.cartorio],
            ["Inscrição imobiliária (IPTU)", d.inscricao_iptu],
            ["Medidas perimétricas e superfície", d.medidas_perimetricas],
            ["Localização e confrontações", d.confrontacoes],
            ["Acessórios e benfeitorias", d.benfeitorias],
            ["Aproveitamento econômico", d.aproveitamento_economico],
            ["Documentos conferidos", d.documentos_conferidos],
          ],
          { colunas: 1 }
        );
      } else {
        g.fichas(
          [
            ["Benfeitorias", d.benfeitorias],
            ["Matrícula", d.matricula],
            ["Documentos conferidos", d.documentos_conferidos],
          ],
          { colunas: 1 }
        );
      }

      const demais = fotos.filter((f) => f !== principal && f !== fotoCapa).slice(0, 6);
      if (demais.length > 0) {
        g.subtitulo("Registro fotográfico", { reservar: 200 });
        await grade(demais);
      }
      if (!vistoriaRealizada) {
        g.destaque(`Situação da vistoria: ${ROTULO_VISTORIA[d.vistoria_status ?? "nao_realizada"]}`, vistoriaTexto);
        if (tem(d.vistoria_ressalvas)) {
          g.subtitulo("Ressalvas");
          g.paragrafo(d.vistoria_ressalvas as string);
        }
      }
    },
  });

  /** Grade de fotos 2 por linha, com legenda. */
  async function grade(lista: { caminho_storage: string; legenda: string | null }[], colunas = 2) {
    const larguraFoto = (LARGURA_UTIL - 14 * (colunas - 1)) / colunas;
    const alturaFoto = colunas === 2 ? 150 : 104;
    for (let i = 0; i < lista.length; i += colunas) {
      g.garantir(alturaFoto + 30);
      const topo = g.y;
      for (let k = 0; k < colunas; k++) {
        const foto = lista[i + k];
        if (!foto) continue;
        const img = await g.imagem(foto.caminho_storage);
        const x = MARGEM + k * (larguraFoto + 14);
        if (img) g.imagemCobrindo(img, x, topo - alturaFoto, larguraFoto, alturaFoto);
        else g.pagina.drawRectangle({ x, y: topo - alturaFoto, width: larguraFoto, height: alturaFoto, color: COR.marfim });
        if (tem(foto.legenda)) {
          g.escrever(limpar(foto.legenda).slice(0, colunas === 2 ? 70 : 44), x, topo - alturaFoto - 12, { tamanho: 7.4, cor: COR.cinza });
        }
      }
      g.y = topo - alturaFoto - 26;
    }
  }

  // =============== LOCALIZAÇÃO ===============
  if (temLocalizacao) {
    secoes.push({
      rotulo: "Localização",
      resumo: "O entorno e como ele influencia o preço.",
      desenhar: async () => {
        abrir("Localização");
        g.abertura("O entorno", "Onde o imóvel\nestá conta.");
        if (tem(d.localizacao_descricao)) g.paragrafo(d.localizacao_descricao as string, { fonte: g.serif, tamanho: 11.5, entrelinha: 18, depois: 14 });
        if (tem(d.localizacao_atributos)) {
          g.subtitulo("Atributos verificáveis");
          for (const linha of String(d.localizacao_atributos).split("\n").map((l) => l.trim()).filter(Boolean)) {
            g.garantir(16);
            g.pagina.drawRectangle({ x: MARGEM, y: g.y - 7, width: 5, height: 1.4, color: COR.dourado });
            g.paragrafo(linha.replace(/^[-•]\s*/, ""), { x: MARGEM + 14, largura: LARGURA_UTIL - 14, depois: 3 });
          }
          g.espaco(6);
        }
        if (tem(d.infraestrutura_entorno)) {
          g.subtitulo("Vizinhança e infraestrutura");
          g.paragrafo(d.infraestrutura_entorno as string);
        }
        if (tem(d.localizacao_influencia)) {
          g.subtitulo("Influência no preço");
          g.paragrafo(d.localizacao_influencia as string);
        }
        g.destaque(
          null,
          "Observações sobre a localização são análise da equipe da Sacra Netimóveis. Este documento não apresenta indicadores populacionais, de renda ou de valorização sem fonte e data identificadas."
        );
      },
    });
  }

  // =============== VISTORIA ===============
  // (sem vistoria realizada, a declaração vai em destaque na página do imóvel)
  if (vistoriaRealizada) secoes.push({
    rotulo: "Vistoria",
    resumo: "Situação da conferência presencial e ressalvas.",
    desenhar: async () => {
      abrir("Vistoria");
      g.abertura("Conferência do imóvel", d.vistoria_status === "realizada" ? "O que foi visto\nno local." : "O que não foi\nconferido no local.");
      g.destaque(`Situação da vistoria: ${ROTULO_VISTORIA[d.vistoria_status ?? "nao_realizada"]}`, vistoriaTexto);

      if (d.vistoria_status === "realizada") {
        const itens = CHECKLIST_VISTORIA[c.tipologia]
          .map((item) => ({ ...item, marca: d.vistoria_checklist?.[item.chave] }))
          .filter((item) => item.marca?.situacao);
        if (itens.length > 0) {
          g.subtitulo("Itens conferidos");
          for (const item of itens) {
            const obs = item.marca?.observacao?.trim();
            const altura = 20 + (obs ? g.alturaParagrafo(obs, { tamanho: 7.8, largura: LARGURA_UTIL - 150 }) : 0);
            g.garantir(altura + 4);
            const topo = g.y;
            g.escrever(item.rotulo, MARGEM, topo - 12, { tamanho: 8.8 });
            const situacao = item.marca!.situacao!;
            g.rotulo(ROTULO_SITUACAO_CHECKLIST[situacao], A4.largura - MARGEM, topo - 12, {
              tamanho: 5.8,
              alinhar: "direita",
              cor: situacao === "atencao" ? COR.vinho : COR.cinzaClaro,
            });
            g.y = topo - 18;
            if (obs) g.paragrafo(obs, { tamanho: 7.8, cor: COR.cinza, largura: LARGURA_UTIL - 150, depois: 0 });
            g.y = topo - altura;
            g.filete({ depois: 4 });
          }
          g.espaco(8);
        }
      }
      if (tem(d.vistoria_ressalvas)) {
        g.subtitulo("Ressalvas");
        g.paragrafo(d.vistoria_ressalvas as string);
      }
      if (tem(d.vistoria_divergencias)) {
        g.subtitulo("Divergências em relação ao cadastro");
        g.paragrafo(d.vistoria_divergencias as string);
      }
      if (d.vistoria_status === "realizada" && fotosVistoria.length > 0) {
        // cabe na mesma página? grade compacta; senão, fotos maiores na página seguinte
        const compacta = g.y - BASE > 175;
        g.subtitulo("Fotos da vistoria", { reservar: compacta ? 150 : 210 });
        await grade(fotosVistoria.slice(0, compacta ? 9 : 8), compacta ? 3 : 2);
      }
    },
  });

  // =============== MÉTODO ===============
  const fontesUsadas = [...new Set(incluidos.map((x) => x.fonte_nome?.trim()).filter(Boolean))] as string[];
  const totalAjustes = incluidos.reduce((s, x) => s + (x.ajustes ?? []).length, 0);
  secoes.push({
    rotulo: "Método",
    resumo: "Como a análise foi conduzida, etapa por etapa.",
    desenhar: async () => {
      abrir("Método");
      g.abertura("O caminho da avaliação", "Da informação\nà conclusão.", {
        introducao:
          "Método comparativo direto de dados de mercado: o imóvel é comparado a referências semelhantes, e as diferenças relevantes são tratadas por fatores de ajuste justificados.",
      });
      g.passos([
        {
          titulo: "Dados e finalidade",
          texto: `${ROTULO_TIPOLOGIA[c.tipologia]} avaliado para ${fin === "venda" ? "venda" : "locação"}, data-base ${dataBR(c.data_base)}.${tem(d.documentos_conferidos) ? ` Documentos conferidos: ${d.documentos_conferidos}.` : ""}${tem(d.lacunas) ? ` Lacunas registradas: ${d.lacunas}.` : ""}`,
        },
        { titulo: "Vistoria", texto: vistoriaTexto },
        {
          titulo: "Pesquisa de mercado",
          texto: `${calc.amostraInicial} referência(s) levantada(s) — ${calc.ofertas + calc.transacoes > 0 ? `${calc.ofertas} oferta(s) e ${calc.transacoes} transação(ões) confirmada(s) na amostra final` : "sem amostra válida"}.${fontesUsadas.length ? ` Fontes: ${fontesUsadas.join("; ")}.` : ""}`,
        },
        {
          titulo: "Saneamento e homogeneização",
          texto: `${calc.excluidos} referência(s) excluída(s) com justificativa e ${totalAjustes} fator(es) de ajuste lançado(s) por pessoa identificada.`,
        },
        {
          titulo: "Tratamento dos dados",
          texto: "Medidas descritivas do preço por m² da amostra final: mínimo, máximo, mediana, média e dispersão.",
        },
        {
          titulo: ptam ? "Análise da avaliadora" : "Análise e revisão",
          texto: ptam
            ? `Interpretação dos dados, dos ajustes e das limitações por ${c.responsavel.nome}.`
            : "Interpretação da amostra pela equipe da Sacra Netimóveis e revisão por pessoa autorizada antes da emissão.",
        },
        {
          titulo: "Emissão",
          texto: o.versao
            ? `Versão ${o.versao}, emitida em ${o.emitidoEm ? dataHoraBR(o.emitidoEm) : "—"}; o conteúdo emitido fica preservado no histórico do Vitral.`
            : "Prévia ainda não emitida; a versão emitida recebe número, data e fica preservada no histórico do Vitral.",
        },
      ]);
      g.filete({ depois: 10 });

      g.subtitulo("Fórmulas e arredondamento");
      g.paragrafo(
        [
          `Preço por m² = preço ÷ área do comparável${fin === "locacao" ? " (aluguel mensal)" : ""}.`,
          "Preço por m² ajustado = preço por m² × produto dos fatores (1 + percentual ÷ 100).",
          "Valor calculado = mediana do preço por m² ajustado × área do imóvel avaliando.",
          "Faixa calculada = menor e maior preço por m² ajustado × área do imóvel avaliando.",
          `Valores totais arredondados para múltiplos de R$ ${numero(passoArredondamento(fin))}.`,
        ].join("\n"),
        { tamanho: 8.4, entrelinha: 12, depois: 6 }
      );
      g.destaque(
        "O que este documento não afirma",
        "Não há inferência estatística, regressão, intervalo de confiança nem projeção de tendência, e não se declara grau de fundamentação ou de precisão da ABNT NBR 14653. Os resultados são medidas descritivas de uma amostra identificada."
      );
    },
  });

  // =============== COMPARÁVEIS ===============
  secoes.push({
    rotulo: "Comparáveis",
    resumo: "Referências identificadas, com fonte e data de consulta.",
    desenhar: async () => {
      abrir("Comparáveis");
      g.abertura("O entorno", "Comparar é\ndar contexto.", {
        introducao:
          incluidos.length > 0
            ? `${incluidos.length} referência(s) de ${fin === "venda" ? "venda" : "locação"} com características próximas às do imóvel. Cada uma traz a origem, a data de consulta e o tipo de preço.`
            : "Nenhuma referência válida foi registrada para esta finalidade.",
      });
      if (calc.ofertas > 0) {
        g.destaque(
          null,
          "Preços de oferta indicam a concorrência que o imóvel enfrenta; não comprovam valores de negócios concluídos. Transações confirmadas, quando existem, estão identificadas como tal."
        );
      }
      g.subtitulo("Recorte da pesquisa", { antes: 2 });
      g.fichas(
        [
          ["Recorte geográfico", d.recorte_geografico],
          ["Período da pesquisa", d.recorte_periodo],
          ["Critérios de seleção", d.recorte_criterios],
          ["Ampliação do recorte (justificativa)", d.ampliacao_justificativa],
          ["Amostra reduzida (justificativa)", d.amostra_justificativa],
        ],
        { colunas: 1 }
      );

      if (incluidos.length > 0) g.subtitulo("Referências");
      for (const x of incluidos) await cartaoComparavel(x);
      if (incluidos.length > 0) g.filete({ depois: 0 });
    },
  });

  async function cartaoComparavel(x: Comparavel) {
    const img = await g.imagem(x.foto_caminho);
    const xTexto = MARGEM + 30 + (img ? 96 : 0);
    const larguraTexto = A4.largura - MARGEM - 132 - xTexto;
    const m2 = precoPorM2(x.preco, x.area_m2);
    const linhaConfig = [x.regiao, x.area_m2 ? area(x.area_m2) : null, configuracao(x)].filter(tem).join("  •  ");
    const linhaFonte = [
      x.fonte_nome || ROTULO_FONTE_TIPO[x.fonte_tipo],
      `consulta em ${dataBR(x.data_coleta)}`,
      x.data_atualizacao ? `atualizado em ${dataBR(x.data_atualizacao)}` : null,
      x.status_anuncio,
    ]
      .filter(tem)
      .join("  •  ");
    const referencia = x.fonte_url || x.referencia_interna || "";
    const alturaTitulo = g.alturaParagrafo(x.identificacao, { fonte: g.sansNegrito, tamanho: 9.4, largura: larguraTexto, entrelinha: 12.5 });
    const alturaDif = tem(x.diferencas) ? g.alturaParagrafo(x.diferencas as string, { tamanho: 7.8, largura: larguraTexto, entrelinha: 11 }) + 4 : 0;
    const alturaFonte = g.alturaParagrafo(linhaFonte, { tamanho: 7.4, largura: larguraTexto, entrelinha: 10.5 });
    const altura = Math.max(img ? 82 : 0, 16 + alturaTitulo + 13 + alturaFonte + (referencia ? 11 : 0) + alturaDif) + 18;

    g.garantir(altura);
    g.filete({ depois: 0 });
    const topo = g.y;
    g.escrever(letras.get(x.id) ?? "", MARGEM, topo - 28, { fonte: g.serif, tamanho: 17, cor: COR.dourado });
    if (img) g.imagemCobrindo(img, MARGEM + 30, topo - 78, 84, 63);

    g.y = topo - 14;
    g.paragrafo(x.identificacao, { fonte: g.sansNegrito, tamanho: 9.4, x: xTexto, largura: larguraTexto, entrelinha: 12.5, depois: 2 });
    if (linhaConfig) g.escrever(linhaConfig, xTexto, g.y - 9, { tamanho: 8, cor: COR.cinza });
    g.y -= 13;
    g.paragrafo(linhaFonte, { tamanho: 7.4, x: xTexto, largura: larguraTexto, cor: COR.cinza, entrelinha: 10.5, depois: 0 });
    if (referencia) {
      const cabe = g.quebrar(referencia, g.sans, 7, larguraTexto)[0] ?? "";
      g.escrever(cabe.length < limpar(referencia).length ? `${cabe.slice(0, -1)}…` : cabe, xTexto, g.y - 8, { tamanho: 7, cor: COR.vinho });
      g.y -= 11;
    }
    if (tem(x.diferencas)) {
      g.y -= 4;
      g.paragrafo(x.diferencas as string, { fonte: g.serifItalico, tamanho: 8.2, x: xTexto, largura: larguraTexto, cor: COR.tinta, entrelinha: 11, depois: 0 });
    }

    const xDireita = A4.largura - MARGEM;
    g.escrever(moedaTotal(x.preco, fin), xDireita, topo - 24, { fonte: g.sansNegrito, tamanho: 10.5, cor: COR.vinho, alinhar: "direita" });
    g.escrever(moedaM2(m2, fin), xDireita, topo - 37, { tamanho: 7.4, cor: COR.cinza, alinhar: "direita" });
    g.rotulo(x.tipo_preco === "transacao" ? "Transação confirmada" : "Preço de oferta", xDireita, topo - 51, {
      tamanho: 5.4,
      alinhar: "direita",
      cor: x.tipo_preco === "transacao" ? COR.vinho : COR.cinzaClaro,
    });
    g.y = topo - altura;
  }

  // =============== MEMÓRIA DOS AJUSTES ===============
  if (temAjustes) {
    secoes.push({
      rotulo: "Ajustes",
      resumo: "Diferenças tratadas, fatores aplicados e exclusões.",
      desenhar: async () => {
        abrir("Ajustes");
        g.abertura("Memória dos ajustes", "As diferenças\nexplicadas.", {
          introducao:
            "Cada fator foi lançado por uma pessoa, com justificativa. O percentual positivo valoriza a referência; o negativo a desvaloriza, aproximando-a do imóvel avaliando.",
        });
        const col = { ref: MARGEM, bruto: MARGEM + 34, fatores: MARGEM + 132, fator: MARGEM + 372, ajustado: A4.largura - MARGEM };
        g.rotulo("Ref.", col.ref, g.y - 6, { tamanho: 5.6, cor: COR.cinzaClaro });
        g.rotulo("R$/m² bruto", col.bruto, g.y - 6, { tamanho: 5.6, cor: COR.cinzaClaro });
        g.rotulo("Fatores aplicados", col.fatores, g.y - 6, { tamanho: 5.6, cor: COR.cinzaClaro });
        g.rotulo("Fator total", col.fator, g.y - 6, { tamanho: 5.6, cor: COR.cinzaClaro });
        g.rotulo("R$/m² ajustado", col.ajustado, g.y - 6, { tamanho: 5.6, cor: COR.cinzaClaro, alinhar: "direita" });
        g.y -= 14;
        g.filete({ cor: COR.vinho, espessura: 0.9, depois: 0 });

        for (const linha of calc.amostra) {
          const larguraJust = LARGURA_UTIL - 34;
          const just = linha.ajustes.map(
            (aj) =>
              `${aj.fator} (${percentual(aj.percentual)}): ${aj.justificativa || "sem justificativa"}${aj.origem ? ` Origem: ${aj.origem}.` : ""}${aj.autor_nome ? ` Lançado por ${aj.autor_nome}${aj.em ? ` em ${dataBR(aj.em)}` : ""}.` : ""}`
          );
          const alturaJust = just.reduce((s, t) => s + g.alturaParagrafo(t, { tamanho: 7.6, largura: larguraJust, entrelinha: 10.8 }) + 2, 0);
          const altura = 26 + alturaJust + (just.length ? 6 : 0);
          g.garantir(altura);
          const topo = g.y;
          g.escrever(letras.get(linha.id) ?? "", col.ref, topo - 17, { fonte: g.serif, tamanho: 12, cor: COR.dourado });
          g.escrever(moedaM2(linha.m2Bruto, fin), col.bruto, topo - 16, { tamanho: 8.6 });
          g.escrever(
            linha.ajustes.length ? linha.ajustes.map((aj) => `${aj.fator} ${percentual(aj.percentual)}`).join("  •  ").slice(0, 62) : "Sem ajuste",
            col.fatores,
            topo - 16,
            { tamanho: 8, cor: linha.ajustes.length ? COR.tinta : COR.cinzaClaro }
          );
          g.escrever(numero(linha.fator, 4), col.fator, topo - 16, { tamanho: 8.6 });
          g.escrever(moedaM2(linha.m2Ajustado, fin), col.ajustado, topo - 16, { fonte: g.sansNegrito, tamanho: 8.8, cor: COR.vinho, alinhar: "direita" });
          g.y = topo - 24;
          for (const t of just) g.paragrafo(t, { tamanho: 7.6, x: MARGEM + 34, largura: larguraJust, cor: COR.cinza, entrelinha: 10.8, depois: 2 });
          g.y = topo - altura;
          g.filete({ depois: 0 });
        }
        g.espaco(18);

        if (excluidos.length > 0) {
          g.subtitulo("Referências excluídas da amostra");
          for (const x of excluidos) {
            const texto = `${x.identificacao} — ${moedaTotal(x.preco, fin)}${x.area_m2 ? `, ${area(x.area_m2)}` : ""}. Motivo: ${x.motivo_exclusao ?? "não informado"}${x.duplicata ? " (duplicata)" : ""}.`;
            g.paragrafo(texto, { tamanho: 8.4, cor: COR.cinza, depois: 5 });
          }
        }
      },
    });
  }

  // =============== RESULTADOS ===============
  secoes.push({
    rotulo: "Resultados",
    resumo: "As medidas da amostra e a memória de cálculo.",
    desenhar: async () => {
      abrir("Resultados");
      g.abertura("Transparência do resultado", "O que sustenta\no preço?", {
        introducao: "Cada número abaixo vem da amostra identificada nas páginas anteriores e pode ser refeito a partir dela.",
      });
      if (!calc.ajustado) {
        g.destaque("Sem base numérica", "Não há comparáveis válidos nesta finalidade. Sem amostra, não há sustentação para conclusão numérica.");
        return;
      }
      const e = calc.ajustado;
      g.filete({ cor: COR.vinho, espessura: 1.1, depois: 0 });
      const destaqueNumero = (valor: string, legenda: string) => {
        g.garantir(46);
        const topo = g.y;
        g.escrever(valor, MARGEM, topo - 30, { fonte: g.serif, tamanho: 19, cor: COR.vinho });
        g.y = topo - 12;
        g.paragrafo(legenda, { tamanho: 8, cor: COR.cinza, x: MARGEM + 250, largura: LARGURA_UTIL - 250, depois: 0 });
        g.y = Math.min(g.y, topo - 44);
        g.filete({ depois: 0 });
      };
      g.y -= 2;
      destaqueNumero(
        String(e.n).padStart(2, "0"),
        `comparável(is) na amostra final, de ${calc.amostraInicial} levantado(s): ${calc.ofertas} oferta(s) e ${calc.transacoes} transação(ões) confirmada(s)`
      );
      destaqueNumero(moedaM2(e.mediana, fin), "mediana do preço por m² ajustado");
      destaqueNumero(`${moedaM2(e.minimo, fin).replace(/\/m².*/, "")} a ${moedaM2(e.maximo, fin)}`, "intervalo observado do preço por m² ajustado (menor e maior valor da amostra)");
      if (e.n >= 3) destaqueNumero(moedaM2(e.media, fin), "média do preço por m² ajustado");
      if (e.coeficienteVariacaoPct !== null && e.n >= 3) {
        destaqueNumero(`${numero(e.coeficienteVariacaoPct, 1)}%`, "dispersão da amostra (desvio padrão ÷ média). Medida descritiva: não é margem de erro nem intervalo de confiança");
      }
      g.espaco(20);

      // gráfico de barras: R$/m² ajustado de cada comparável
      const alturaGrafico = calc.amostra.length * 18 + 44;
      g.garantir(alturaGrafico + 30);
      g.subtitulo("Preço por m² ajustado de cada referência", { antes: 0 });
      const xBarra = MARGEM + 24;
      const larguraBarra = LARGURA_UTIL - 24 - 110;
      const escala = larguraBarra / (e.maximo * 1.04);
      const topoGrafico = g.y;
      calc.amostra.forEach((linha, i) => {
        const y = topoGrafico - 14 - i * 18;
        g.escrever(letras.get(linha.id) ?? "", MARGEM, y, { fonte: g.serif, tamanho: 10.5, cor: COR.dourado });
        g.pagina.drawRectangle({ x: xBarra, y: y - 1, width: larguraBarra, height: 9, color: COR.marfim });
        g.pagina.drawRectangle({ x: xBarra, y: y - 1, width: Math.max(2, linha.m2Ajustado * escala), height: 9, color: linha.tipoPreco === "transacao" ? COR.vinho : COR.vinhoClaro });
        g.escrever(moedaM2(linha.m2Ajustado, fin), A4.largura - MARGEM, y, { tamanho: 7.6, alinhar: "direita" });
      });
      const xMediana = xBarra + e.mediana * escala;
      const baseGrafico = topoGrafico - 14 - calc.amostra.length * 18 + 10;
      g.pagina.drawLine({ start: { x: xMediana, y: topoGrafico - 2 }, end: { x: xMediana, y: baseGrafico }, thickness: 0.9, color: COR.dourado, dashArray: [3, 2] });
      g.rotulo("Mediana", xMediana - 14, baseGrafico - 11, { tamanho: 5.4, cor: COR.cinza });
      g.y = baseGrafico - 22;
      g.paragrafo("Barras escuras: transações confirmadas. Barras claras: preços de oferta. Escala a partir de zero.", { tamanho: 7.2, cor: COR.cinzaClaro, depois: 14 });

      if (calc.areaImovelM2 && calc.valorCalculado !== null) {
        g.destaque(
          "Memória de cálculo",
          [
            `Valor calculado: ${moedaM2(e.mediana, fin)} × ${area(calc.areaImovelM2)} = ${moedaTotal(arredondarValor(e.mediana * calc.areaImovelM2, fin), fin)}.`,
            `Faixa calculada: de ${moedaM2(e.minimo, fin)} × ${area(calc.areaImovelM2)} = ${moedaTotal(calc.faixaCalculadaMin, fin)} a ${moedaM2(e.maximo, fin)} × ${area(calc.areaImovelM2)} = ${moedaTotal(calc.faixaCalculadaMax, fin)}.`,
            `Arredondamento: múltiplos de R$ ${numero(passoArredondamento(fin))}.`,
          ].join("\n")
        );
      }
    },
  });

  // =============== RECOMENDAÇÃO (página vinho) ===============
  secoes.push({
    rotulo: ptam ? "Valor" : "Recomendação",
    resumo: ptam ? "O valor resultante e a data de referência." : "A faixa indicativa e o valor sugerido.",
    desenhar: async () => {
      abrir(ptam ? "Valor" : "Recomendação", "vinho");
      g.abertura(ptam ? "Resultado da avaliação" : "A recomendação", "Um preço com\nargumentos.");
      g.espaco(10);
      g.rotulo(rotuloValor, MARGEM, g.y, { cor: COR.dourado });
      g.y -= 50;
      g.escrever(p.valor_sugerido ? moedaTotal(p.valor_sugerido, fin) : "A definir", MARGEM, g.y, { fonte: g.serif, tamanho: 44, cor: COR.branco });
      g.y -= 22;
      const m2Sugerido = precoPorM2(p.valor_sugerido, c.area_m2);
      g.rotulo(
        [m2Sugerido ? `${moedaM2(m2Sugerido, fin)}` : null, `data-base ${dataBR(c.data_base)}`].filter(tem).join("   •   "),
        MARGEM,
        g.y,
        { cor: COR.dourado, tamanho: 7 }
      );
      g.y -= 34;
      g.filete({ cor: COR.dourado, espessura: 0.7, depois: 24 });

      if (p.faixa_min !== null && p.faixa_max !== null) {
        g.rotulo(`Faixa indicativa de mercado${p.faixa_manual ? " (editada)" : ""}`, MARGEM, g.y, { cor: COR.dourado });
        g.y -= 28;
        g.escrever(moedaTotal(p.faixa_min, fin), MARGEM, g.y, { fonte: g.serif, tamanho: 15, cor: COR.branco });
        g.escrever(moedaTotal(p.faixa_max, fin), A4.largura - MARGEM, g.y, { fonte: g.serif, tamanho: 15, cor: COR.branco, alinhar: "direita" });
        g.y -= 18;
        g.pagina.drawRectangle({ x: MARGEM, y: g.y, width: LARGURA_UTIL, height: 5, color: COR.vinhoClaro });
        if (p.valor_sugerido) {
          const posicao = posicaoNaFaixa(p.valor_sugerido, p.faixa_min, p.faixa_max);
          const fracao =
            posicao === "abaixo" ? 0 : posicao === "acima" ? 1 : p.faixa_max > p.faixa_min ? (p.valor_sugerido - p.faixa_min) / (p.faixa_max - p.faixa_min) : 0.5;
          g.pagina.drawRectangle({ x: MARGEM, y: g.y, width: Math.max(4, LARGURA_UTIL * fracao), height: 5, color: COR.dourado });
          g.pagina.drawCircle({ x: MARGEM + LARGURA_UTIL * fracao, y: g.y + 2.5, size: 6, color: COR.branco, borderColor: COR.dourado, borderWidth: 1.5 });
          g.y -= 30;
          g.paragrafo(
            posicao === "dentro"
              ? "O valor indicado está dentro da faixa indicativa."
              : `O valor indicado está ${posicao === "acima" ? "acima" : "abaixo"} da faixa indicativa; a justificativa consta da fundamentação.`,
            { tamanho: 9.5, cor: COR.rosado, depois: 16 }
          );
        } else {
          g.y -= 30;
        }
      }

      const linhas: [string, string][] = [];
      if (p.valor_calculado !== null) linhas.push(["Valor calculado pela amostra", moedaTotal(p.valor_calculado, fin)]);
      if (p.margem_negociacao_pct) linhas.push(["Margem de negociação considerada", `${numero(p.margem_negociacao_pct, 1)}%`]);
      if (p.valor_proprietario) linhas.push(["Valor pretendido pelo proprietário (informado)", moedaTotal(p.valor_proprietario, fin)]);
      for (const [rot, valor] of linhas) {
        g.filete({ cor: COR.vinhoClaro, depois: 0 });
        g.escrever(rot, MARGEM, g.y - 16, { tamanho: 9, cor: COR.rosado });
        g.escrever(valor, A4.largura - MARGEM, g.y - 16, { fonte: g.sansNegrito, tamanho: 9.5, cor: COR.branco, alinhar: "direita" });
        g.y -= 26;
      }
      if (linhas.length) g.filete({ cor: COR.vinhoClaro, depois: 22 });
      if (p.valor_proprietario) {
        g.paragrafo("O valor pretendido pelo proprietário é uma informação recebida; não é resultado desta análise.", { tamanho: 8, cor: COR.rosado, depois: 12 });
      }

      g.y = Math.min(g.y, BASE + 60);
      g.escrever(
        calc.transacoes > 0 && calc.ofertas === 0 ? "Amostra formada por transações confirmadas." : "Oferta não é transação realizada.",
        MARGEM,
        BASE + 22,
        { fonte: g.serifItalico, tamanho: 11, cor: COR.dourado }
      );
    },
  });

  // =============== FUNDAMENTAÇÃO ===============
  if (temFundamentacao) {
    secoes.push({
      rotulo: "Fundamentação",
      resumo: "Por que este valor, com as justificativas registradas.",
      desenhar: async () => {
        abrir("Fundamentação");
        g.abertura("Como se chegou ao valor", "A leitura\ndos números.");
        if (tem(d.fundamentacao)) g.paragrafo(d.fundamentacao as string, { fonte: g.serif, tamanho: 11.5, entrelinha: 18, depois: 14 });
        if (tem(p.justificativa_valor) && p.valor_sugerido !== p.valor_calculado) {
          g.destaque(
            "Valor ajustado em relação ao calculado",
            `Calculado: ${moedaTotal(p.valor_calculado, fin)}. Indicado: ${moedaTotal(p.valor_sugerido, fin)}. Justificativa: ${p.justificativa_valor}`
          );
        }
        if (p.faixa_manual && tem(p.justificativa_faixa)) {
          g.destaque(
            "Faixa indicativa editada",
            `Faixa calculada pela amostra: ${moedaTotal(calc.faixaCalculadaMin, fin)} a ${moedaTotal(calc.faixaCalculadaMax, fin)}. Faixa adotada: ${moedaTotal(p.faixa_min, fin)} a ${moedaTotal(p.faixa_max, fin)}. Justificativa: ${p.justificativa_faixa}`
          );
        }
        if (tem(d.parecer_avaliadora)) {
          g.subtitulo(ptam ? "Análise da avaliadora" : "Análise da equipe");
          g.paragrafo(d.parecer_avaliadora as string);
        }
      },
    });
  }

  // =============== ESTRATÉGIA COMERCIAL ===============
  if (temEstrategia) {
    secoes.push({
      rotulo: "Estratégia",
      resumo: "Como apresentar, acompanhar e reavaliar.",
      desenhar: async () => {
        abrir("Estratégia");
        g.abertura("Da análise à ação", "Apresentar.\nAcompanhar.\nReavaliar.");
        const itens = [
          { titulo: "Posicionamento", texto: d.estrategia_posicionamento },
          { titulo: "Público provável (hipótese de trabalho)", texto: d.estrategia_publico },
          { titulo: "Preparação e fotografia", texto: d.estrategia_preparacao },
          { titulo: "Canais de divulgação", texto: d.estrategia_canais },
          { titulo: "Quando reavaliar o preço", texto: d.estrategia_reavaliacao },
        ].filter((i) => tem(i.texto)) as { titulo: string; texto: string }[];
        g.passos(itens);
        g.filete({ depois: 18 });
        g.destaque(null, "Esta estratégia não promete prazo de venda ou de locação. O preço é reavaliado a partir da procura, das visitas e das propostas recebidas.");
      },
    });
  }

  // =============== CONCLUSÃO E RESPONSÁVEL ===============
  secoes.push({
    rotulo: "Conclusão",
    resumo: "Resumo, limitações e responsável.",
    desenhar: async () => {
      abrir("Conclusão");
      g.abertura("Conclusão e responsabilidade", "O que este\ndocumento conclui.");
      if (tem(d.conclusao_texto)) g.paragrafo(d.conclusao_texto as string, { fonte: g.serif, tamanho: 11.5, entrelinha: 18, depois: 12 });
      g.fichas([
        [rotuloValor, p.valor_sugerido ? `${moedaTotal(p.valor_sugerido, fin)}${precoPorM2(p.valor_sugerido, c.area_m2) ? ` (${moedaM2(precoPorM2(p.valor_sugerido, c.area_m2), fin)})` : ""}` : null],
        ["Faixa indicativa de mercado", p.faixa_min !== null && p.faixa_max !== null ? `${moedaTotal(p.faixa_min, fin)} a ${moedaTotal(p.faixa_max, fin)}` : null],
        ["Data de referência", dataBR(c.data_base)],
        ["Amostra", `${calc.amostraFinal} comparável(is): ${calc.ofertas} oferta(s), ${calc.transacoes} transação(ões)`],
      ]);

      g.subtitulo("Limitações e ressalvas");
      const limitacoes = [
        `As estimativas baseiam-se nos dados disponíveis e consultados até a data-base de ${dataBR(c.data_base)} e estão sujeitas a revisão se o mercado ou as informações do imóvel mudarem.`,
        calc.ofertas > 0
          ? `Preços de oferta não comprovam valores de transações concluídas; qualquer conclusão sobre valor efetivamente negociado depende de dados confirmados de transações.${calc.transacoes > 0 ? ` A amostra inclui ${calc.transacoes} transação(ões) confirmada(s), identificada(s) entre os comparáveis.` : ""}`
          : null,
        vistoriaTexto,
        calc.amostraFinal < c.limiares.amostraMinima && tem(d.amostra_justificativa)
          ? `Amostra reduzida (${calc.amostraFinal} comparável(is)): ${d.amostra_justificativa}`
          : null,
        tem(d.lacunas) ? `Informações não obtidas: ${d.lacunas}` : null,
        ptam
          ? "Parecer estruturado com o conteúdo mínimo previsto no art. 5º da Resolução COFECI nº 1.066/2007. Não declara grau de fundamentação ou de precisão da ABNT NBR 14653."
          : "Este é um estudo comercial para orientar o preço de divulgação. Não é Parecer Técnico de Avaliação Mercadológica (PTAM) nem laudo de avaliação, e não declara conformidade com a ABNT NBR 14653.",
        tem(d.limitacoes_texto) ? (d.limitacoes_texto as string) : null,
      ].filter(Boolean) as string[];
      for (const texto of limitacoes) {
        g.garantir(18);
        g.pagina.drawRectangle({ x: MARGEM, y: g.y - 7, width: 5, height: 1.4, color: COR.dourado });
        g.paragrafo(texto, { tamanho: 8.6, cor: COR.cinza, x: MARGEM + 14, largura: LARGURA_UTIL - 14, depois: 5 });
      }
      g.espaco(10);
      await responsavel();
    },
  });

  async function responsavel() {
    const r = c.responsavel;
    const assinaComoResponsavel = ptam || o.aprovacao?.ehResponsavelTecnica === true;
    const alturaBloco = 190 + (ptam && tem(r.curriculo) ? g.alturaParagrafo(r.curriculo, { tamanho: 8.4, largura: LARGURA_UTIL * 0.55 }) : 0);
    g.garantir(alturaBloco);
    g.filete({ cor: COR.dourado, espessura: 0.9, depois: 16 });
    const topo = g.y;
    g.rotulo(assinaComoResponsavel ? "Avaliadora responsável" : "Aprovação", MARGEM, topo - 6);
    g.y = topo - 30;

    const xAss = MARGEM + LARGURA_UTIL * 0.6;
    const larguraAss = LARGURA_UTIL * 0.4;
    if (assinaComoResponsavel) {
      g.escrever(r.nome, MARGEM, g.y, { fonte: g.serif, tamanho: 15, cor: COR.tinta });
      g.y -= 15;
      g.escrever("Corretora de imóveis e avaliadora imobiliária", MARGEM, g.y, { tamanho: 8.6, cor: COR.cinza });
      g.y -= 15;
      g.rotulo([r.creci && `CRECI ${r.creci}`, r.cnai && `CNAI ${r.cnai}`].filter(Boolean).join("  /  "), MARGEM, g.y, { tamanho: 6.4 });
      g.y -= 16;
      if (ptam && tem(r.curriculo)) {
        g.paragrafo(r.curriculo, { tamanho: 8.4, cor: COR.cinza, largura: LARGURA_UTIL * 0.55, depois: 6 });
      }
    } else if (o.aprovacao) {
      g.escrever(o.aprovacao.nome, MARGEM, g.y, { fonte: g.serif, tamanho: 15, cor: COR.tinta });
      g.y -= 15;
      g.escrever([o.aprovacao.cargo, "Sacra Netimóveis"].filter(tem).join(" — "), MARGEM, g.y, { tamanho: 8.6, cor: COR.cinza });
      g.y -= 16;
    } else {
      g.escrever("Aguardando aprovação", MARGEM, g.y, { fonte: g.serif, tamanho: 15, cor: COR.cinzaClaro });
      g.y -= 16;
    }
    if (o.elaboradoPor) {
      g.escrever(`Elaboração: ${o.elaboradoPor}`, MARGEM, g.y, { tamanho: 8, cor: COR.cinza });
      g.y -= 12;
    }
    const contato = [r.telefone, r.email].filter(tem).join("  •  ");
    if (contato) {
      g.escrever(contato, MARGEM, g.y, { tamanho: 8, cor: COR.cinza });
      g.y -= 12;
    }

    // assinatura (à direita)
    const yLinha = topo - 78;
    const img = o.assinatura && !o.rascunho ? await carregarAssinatura() : null;
    if (img) g.imagemContida(img, xAss, yLinha + 3, larguraAss, 52, "centro");
    g.pagina.drawLine({ start: { x: xAss, y: yLinha }, end: { x: xAss + larguraAss, y: yLinha }, thickness: 0.6, color: COR.cinzaClaro });
    let notaAssinatura: string;
    if (o.rascunho || !o.aprovacao) {
      notaAssinatura = "Assinatura após aprovação e emissão.";
    } else if (img) {
      notaAssinatura = `Assinatura visual (imagem) aplicada pela própria avaliadora na emissão, após aprovação registrada no Vitral em ${dataHoraBR(o.aprovacao.em)}. Não é assinatura digital com certificado.`;
    } else {
      notaAssinatura = `Aprovado eletronicamente no Vitral por ${o.aprovacao.nome} em ${dataHoraBR(o.aprovacao.em)} (registro de usuário autenticado; sem assinatura digital com certificado).`;
    }
    const yAntes = g.y;
    g.y = yLinha - 6;
    g.paragrafo(notaAssinatura, { tamanho: 6.8, cor: COR.cinza, x: xAss, largura: larguraAss, entrelinha: 9.5, depois: 0 });
    g.y = Math.min(g.y, yAntes) - 10;

    if (ptam) {
      g.fichas(
        [
          ["Selo certificador", tem(d.selo_numero) ? `nº ${d.selo_numero}` : "Não aplicado neste documento."],
          ["Declaração de Avaliação Mercadológica (DAM)", tem(d.dam_numero) ? `nº ${d.dam_numero}` : null],
        ],
        { colunas: 2 }
      );
    }
  }

  async function carregarAssinatura() {
    o.imagens.__assinatura = o.assinatura as Imagem;
    return g.imagem("__assinatura");
  }

  // =============== FONTES E ANEXOS ===============
  const anexosImagem = c.arquivos.filter((a) => (a.tipo === "mapa" || a.tipo === "matricula") && a.mime_type.startsWith("image/"));
  const anexosOutros = c.arquivos.filter((a) => a.tipo !== "imovel" && a.tipo !== "vistoria" && !anexosImagem.includes(a));
  secoes.push({
    rotulo: "Fontes",
    resumo: "Origem de cada referência e anexos.",
    desenhar: async () => {
      abrir("Fontes");
      g.abertura("Rastreabilidade", "De onde vêm\nos dados.");
      g.subtitulo("Referências de mercado", { antes: 0 });
      if (incluidos.length === 0) g.paragrafo("Nenhuma referência registrada.", { cor: COR.cinza });
      for (const x of incluidos) {
        const texto = [
          x.identificacao,
          `${ROTULO_FONTE_TIPO[x.fonte_tipo]}${x.fonte_nome ? `: ${x.fonte_nome}` : ""}`,
          x.fonte_url ? x.fonte_url : x.referencia_interna ? `referência ${x.referencia_interna}` : null,
          `consulta em ${dataBR(x.data_coleta)}`,
          x.tipo_preco === "transacao" ? "transação confirmada" : "preço de oferta",
        ]
          .filter(Boolean)
          .join("  •  ");
        g.garantir(24);
        g.escrever(letras.get(x.id) ?? "", MARGEM, g.y - 10, { fonte: g.serif, tamanho: 11, cor: COR.dourado });
        g.paragrafo(texto, { tamanho: 8.2, cor: COR.cinza, x: MARGEM + 22, largura: LARGURA_UTIL - 22, entrelinha: 11.6, depois: 6 });
      }
      if (ptam) {
        g.subtitulo("Referência normativa");
        g.paragrafo("Resolução COFECI nº 1.066/2007 e Ato Normativo COFECI nº 001/2011 (conteúdo mínimo do Parecer Técnico de Avaliação Mercadológica).", { tamanho: 8.6, cor: COR.cinza });
      }
      if (anexosOutros.length > 0 || tem(d.anexos_observacoes)) {
        g.subtitulo("Anexos arquivados no Vitral");
        for (const a of anexosOutros) g.paragrafo(`${a.legenda?.trim() || a.nome_arquivo} (${a.tipo})`, { tamanho: 8.6, cor: COR.cinza, depois: 3 });
        if (tem(d.anexos_observacoes)) g.paragrafo(d.anexos_observacoes as string, { tamanho: 8.6, cor: COR.cinza });
      }
      for (const a of anexosImagem) {
        const img = await g.imagem(a.caminho_storage);
        if (!img) continue;
        abrir("Fontes");
        g.rotulo(a.tipo === "mapa" ? "Anexo — mapa de localização" : "Anexo — matrícula", MARGEM, g.y - 6);
        g.y -= 24;
        g.imagemContida(img, MARGEM, BASE + 10, LARGURA_UTIL, g.y - BASE - 10, "centro");
      }
    },
  });

  // ----- desenha tudo -----
  await capa();
  for (const s of secoes) await s.desenhar();

  const rodape = [
    "Sacra Netimóveis",
    ptam ? "PTAM" : "Estudo comercial de preço",
    ROTULO_FINALIDADE[fin],
    `data-base ${dataBR(c.data_base)}`,
    `${c.codigo}${o.versao ? ` v${o.versao}` : " prévia"}`,
  ].join("   •   ");
  g.finalizar(rodape, {
    marcaDagua: o.rascunho ? "RASCUNHO" : null,
    avisoRodape: o.demonstracao ? "Documento de teste — imóvel, pessoas, referências e valores fictícios" : null,
  });

  return g.doc.save();
}
