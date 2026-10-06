/**
 * PDF do Termo de Entrega de Chaves e Proporcionalidade, em papel
 * timbrado da Sacra. Função pura: recebe o retrato da versão (ou do
 * rascunho, na pré-visualização), o timbrado, as fontes e as assinaturas
 * e devolve os bytes. Nenhum valor é calculado aqui — tudo vem do retrato.
 */

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import { limpar, type FontesPdf, type Imagem } from "@/lib/avaliacao/pdf-base";
import { ROTULO_MARCO, ROTULO_PAGADOR, dataBR, dataPorExtenso, type EncargoCalculado, type EncargoEntrada } from "./calculo";
import { compradores, marcoEfetivo, textoServico, vendedores, type Assinatura, type ParteTermo, type RetratoTermo } from "./conteudo";
import { formatarCentavos, valorComExtenso } from "./extenso";

const A4 = { largura: 595.28, altura: 841.89 };
const MARGEM_X = 54;
const LARGURA = A4.largura - MARGEM_X * 2;

const COR = {
  tinta: rgb(0.11, 0.1, 0.09),
  cinza: rgb(0.37, 0.34, 0.31),
  claro: rgb(0.55, 0.52, 0.48),
  borda: rgb(0.62, 0.6, 0.57),
  faixa: rgb(0.86, 0.85, 0.83),
  rotulo: rgb(0.93, 0.92, 0.9),
  dourado: rgb(0.82, 0.55, 0.17),
  vinho: rgb(0.45, 0.08, 0.08),
};

export type OpcoesPdfTermo = {
  /** imagem A4 do papel timbrado; sem ela o PDF sai em fundo branco com o nome da empresa */
  timbrado: Imagem | null;
  fontes: FontesPdf | null;
  assinaturas: Assinatura[];
  /** "MINUTA" na pré-visualização, "CANCELADO" etc. */
  marcaDagua: string | null;
};

type Celula = { linhas: { texto: string; negrito?: boolean; cor?: RGB }[]; fundo?: RGB; alinhar?: "esquerda" | "centro" };

class Folha {
  doc!: PDFDocument;
  normal!: PDFFont;
  negrito!: PDFFont;
  pagina!: PDFPage;
  y = 0;
  private fundo: PDFImage | null = null;
  private incorporadas = false;

  constructor(
    private topo: number,
    private base: number
  ) {}

  async iniciar(o: OpcoesPdfTermo) {
    this.doc = await PDFDocument.create();
    if (o.fontes) {
      try {
        this.doc.registerFontkit(fontkit);
        this.normal = await this.doc.embedFont(o.fontes.sans, { subset: true });
        this.negrito = await this.doc.embedFont(o.fontes.sansNegrito, { subset: true });
        this.incorporadas = true;
      } catch (erro) {
        console.error("termo-entrega/pdf: falha ao incorporar fontes; usando as fontes padrão", erro);
        this.doc = await PDFDocument.create();
      }
    }
    if (!this.incorporadas) {
      this.normal = await this.doc.embedFont(StandardFonts.Helvetica);
      this.negrito = await this.doc.embedFont(StandardFonts.HelveticaBold);
    }
    if (o.timbrado) {
      try {
        this.fundo = o.timbrado.mime.includes("png") ? await this.doc.embedPng(o.timbrado.bytes) : await this.doc.embedJpg(o.timbrado.bytes);
      } catch {
        try {
          this.fundo = o.timbrado.mime.includes("png") ? await this.doc.embedJpg(o.timbrado.bytes) : await this.doc.embedPng(o.timbrado.bytes);
        } catch {
          this.fundo = null;
        }
      }
    }
    this.novaPagina();
  }

  /** As fontes padrão do PDF não escrevem todo caractere; as incorporadas sim. */
  t(texto: unknown): string {
    const s = String(texto ?? "").replace(/\r/g, "");
    return this.incorporadas ? s.replace(/\t/g, " ") : limpar(s);
  }

  novaPagina() {
    this.pagina = this.doc.addPage([A4.largura, A4.altura]);
    if (this.fundo) this.pagina.drawImage(this.fundo, { x: 0, y: 0, width: A4.largura, height: A4.altura });
    else {
      // sem timbrado: identificação mínima para o documento nunca sair "em branco"
      this.pagina.drawText("SACRA NETIMÓVEIS", { x: MARGEM_X, y: A4.altura - 70, size: 13, font: this.negrito, color: COR.dourado });
      this.pagina.drawRectangle({ x: 0, y: 0, width: A4.largura, height: 26, color: COR.dourado });
    }
    this.y = A4.altura - this.topo;
  }

  garantir(altura: number) {
    if (this.y - altura < this.base) this.novaPagina();
  }

  quebrar(texto: string, fonte: PDFFont, tamanho: number, larguraMax: number): string[] {
    const linhas: string[] = [];
    for (const paragrafo of this.t(texto).split("\n")) {
      if (paragrafo.trim() === "") {
        linhas.push("");
        continue;
      }
      let atual = "";
      for (let palavra of paragrafo.split(/\s+/).filter(Boolean)) {
        while (fonte.widthOfTextAtSize(palavra, tamanho) > larguraMax) {
          let corte = palavra.length - 1;
          while (corte > 1 && fonte.widthOfTextAtSize(palavra.slice(0, corte), tamanho) > larguraMax) corte--;
          if (atual) {
            linhas.push(atual);
            atual = "";
          }
          linhas.push(palavra.slice(0, corte));
          palavra = palavra.slice(corte);
        }
        const teste = atual ? `${atual} ${palavra}` : palavra;
        if (fonte.widthOfTextAtSize(teste, tamanho) > larguraMax && atual) {
          linhas.push(atual);
          atual = palavra;
        } else atual = teste;
      }
      if (atual) linhas.push(atual);
    }
    return linhas;
  }

  escrever(texto: string, x: number, y: number, o: { fonte?: PDFFont; tamanho?: number; cor?: RGB; alinhar?: "esquerda" | "centro" | "direita" } = {}) {
    const fonte = o.fonte ?? this.normal;
    const tamanho = o.tamanho ?? 9;
    const limpo = this.t(texto).replace(/\n/g, " ");
    const w = fonte.widthOfTextAtSize(limpo, tamanho);
    const px = o.alinhar === "centro" ? x - w / 2 : o.alinhar === "direita" ? x - w : x;
    this.pagina.drawText(limpo, { x: px, y, size: tamanho, font: fonte, color: o.cor ?? COR.tinta });
  }

  paragrafo(texto: string, o: { tamanho?: number; negrito?: boolean; cor?: RGB; depois?: number; x?: number; largura?: number } = {}) {
    const tamanho = o.tamanho ?? 9.5;
    const fonte = o.negrito ? this.negrito : this.normal;
    const entrelinha = tamanho * 1.45;
    const x = o.x ?? MARGEM_X;
    for (const linha of this.quebrar(texto, fonte, tamanho, o.largura ?? LARGURA)) {
      this.garantir(entrelinha);
      if (linha) this.pagina.drawText(linha, { x, y: this.y - tamanho, size: tamanho, font: fonte, color: o.cor ?? COR.tinta });
      this.y -= entrelinha;
    }
    this.y -= o.depois ?? 8;
  }

  /** Faixa cinza de título de bloco (como no modelo da Sacra). */
  faixa(titulo: string, reservar = 40) {
    this.garantir(18 + reservar);
    this.pagina.drawRectangle({ x: MARGEM_X, y: this.y - 18, width: LARGURA, height: 18, color: COR.faixa, borderColor: COR.borda, borderWidth: 0.6 });
    this.escrever(titulo, MARGEM_X + LARGURA / 2, this.y - 12.5, { fonte: this.negrito, tamanho: 8.5, alinhar: "centro" });
    this.y -= 18;
  }

  /** Linha de tabela com células de larguras livres; a altura acompanha a célula mais alta. */
  linha(celulas: Celula[], larguras: number[], o: { tamanho?: number; minimo?: number; padding?: number; aoQuebrar?: () => void } = {}): void {
    const tamanho = o.tamanho ?? 8.2;
    const pad = o.padding ?? 5;
    const entrelinha = tamanho * 1.38;
    const preparadas = celulas.map((c, i) => {
      const linhas: { texto: string; negrito?: boolean; cor?: RGB }[] = [];
      for (const l of c.linhas) {
        const fonte = l.negrito ? this.negrito : this.normal;
        for (const parte of this.quebrar(l.texto, fonte, tamanho, larguras[i] - pad * 2)) linhas.push({ texto: parte, negrito: l.negrito, cor: l.cor });
      }
      return linhas;
    });
    const altura = Math.max(o.minimo ?? 0, Math.max(...preparadas.map((l) => l.length)) * entrelinha + pad * 2);
    if (this.y - altura < this.base) {
      this.novaPagina();
      // tabela que continua na página seguinte repete o cabeçalho
      o.aoQuebrar?.();
    }
    let x = MARGEM_X;
    preparadas.forEach((linhas, i) => {
      const c = celulas[i];
      this.pagina.drawRectangle({ x, y: this.y - altura, width: larguras[i], height: altura, color: c.fundo, borderColor: COR.borda, borderWidth: 0.6 });
      // centraliza o bloco de texto na vertical
      let ty = this.y - (altura - linhas.length * entrelinha) / 2 - tamanho;
      for (const l of linhas) {
        if (l.texto) {
          const fonte = l.negrito ? this.negrito : this.normal;
          const w = fonte.widthOfTextAtSize(l.texto, tamanho);
          const tx = c.alinhar === "centro" ? x + (larguras[i] - w) / 2 : x + pad;
          this.pagina.drawText(l.texto, { x: tx, y: ty, size: tamanho, font: fonte, color: l.cor ?? COR.tinta });
        }
        ty -= entrelinha;
      }
      x += larguras[i];
    });
    this.y -= altura;
  }
}

const rot = (texto: string): Celula => ({ linhas: [{ texto, negrito: true }], fundo: COR.rotulo });
const val = (texto: string, negrito = false): Celula => ({ linhas: [{ texto: texto || "—", negrito }] });

function blocoPartes(f: Folha, titulo: string, partes: ParteTermo[]) {
  f.faixa(titulo);
  const L = [70, LARGURA - 70];
  const L4 = [70, (LARGURA - 140) / 2, 70, (LARGURA - 140) / 2];
  for (const p of partes) {
    f.linha([rot("Nome"), val(p.nome.toUpperCase(), true)], L);
    const digitos = p.cpfCnpj.replace(/\D/g, "");
    const rotuloDoc = digitos.length > 11 ? "CNPJ:" : "CPF:";
    if (p.rg) f.linha([rot(rotuloDoc), val(p.cpfCnpj), rot("RG:"), val(p.rg)], L4);
    else f.linha([rot(rotuloDoc), val(p.cpfCnpj)], L);
    if (p.email) f.linha([rot("E-mail:"), val(p.email)], L);
  }
  f.y -= 12;
}

function periodoTexto(p: { inicio: string; fim: string } | null, dias: number | null): string {
  if (!p || !dias) return "";
  return `Dia ${dataBR(p.inicio)} até ${dataBR(p.fim)} – ${dias} dia${dias === 1 ? "" : "s"}`;
}

function linhaEncargo(e: EncargoEntrada, c: EncargoCalculado, plural: { v: boolean; c: boolean }): Celula[] {
  const info: Celula["linhas"] = [{ texto: `Valor total: ${formatarCentavos(e.valorTotalCentavos)}` }];
  if (e.periodoInicio && e.periodoFim) info.push({ texto: `Período: ${dataBR(e.periodoInicio)} a ${dataBR(e.periodoFim)}${c.diasTotal ? ` (${c.diasTotal} dias)` : ""}` });
  if (e.vencimento) info.push({ texto: `Vencimento: ${dataBR(e.vencimento)}` });
  info.push({ texto: `Pago por: ${e.pagoPor === "vendedor" ? (plural.v ? "vendedores" : "vendedor") : e.pagoPor === "comprador" ? (plural.c ? "compradores" : "comprador") : ROTULO_PAGADOR[e.pagoPor].toLowerCase()}` });
  if (e.observacao) info.push({ texto: e.observacao, cor: COR.cinza });

  const parte = (centavos: number, periodo: { inicio: string; fim: string } | null, dias: number | null): Celula => {
    if (centavos <= 0) return { linhas: [{ texto: "—" }], alinhar: "centro" };
    const linhas: Celula["linhas"] = [];
    const p = periodoTexto(periodo, dias);
    if (p) linhas.push({ texto: `${p}:` });
    linhas.push({ texto: formatarCentavos(centavos), negrito: true });
    return { linhas };
  };

  let ressarcimento: Celula;
  if (c.ressarcimentoDe) {
    const quem =
      c.ressarcimentoDe === "comprador"
        ? `${plural.c ? "Compradores ressarcem" : "Comprador ressarce"} ${plural.v ? "os vendedores" : "o vendedor"}:`
        : `${plural.v ? "Vendedores ressarcem" : "Vendedor ressarce"} ${plural.c ? "os compradores" : "o comprador"}:`;
    ressarcimento = { linhas: [{ texto: quem }, { texto: valorComExtenso(c.ressarcimentoCentavos), negrito: true }] };
  } else if (c.emAbertoVendedorCentavos + c.emAbertoCompradorCentavos > 0) {
    ressarcimento = { linhas: [{ texto: "Sem ressarcimento entre as partes: cada uma quita a sua parte.", cor: COR.cinza }] };
  } else {
    ressarcimento = { linhas: [{ texto: "Sem ressarcimento.", cor: COR.cinza }] };
  }

  const titulo: Celula["linhas"] = [{ texto: e.descricao.toUpperCase(), negrito: true }];
  if (e.competencia) titulo.push({ texto: `Ref. ${e.competencia}` });
  return [{ linhas: titulo, fundo: COR.rotulo }, { linhas: info }, parte(c.parteVendedorCentavos, c.periodoVendedor, c.diasVendedor), parte(c.parteCompradorCentavos, c.periodoComprador, c.diasComprador), ressarcimento];
}

async function blocoAssinaturas(f: Folha, r: RetratoTermo, assinaturas: Assinatura[]) {
  const doc = r.documento;
  const partes = [...vendedores(doc), ...compradores(doc)];
  const porParte = new Map<string, Assinatura>();
  const usadas = new Set<number>();
  for (const p of partes) {
    const i = assinaturas.findIndex((a, idx) => !usadas.has(idx) && a.papel === p.papel && a.nomeEsperado === p.nome);
    if (i >= 0) {
      usadas.add(i);
      porParte.set(p.id, assinaturas[i]);
    }
  }
  // três signatários cabem lado a lado; nos demais casos, dois por linha
  const colunas = partes.length === 3 ? 3 : 2;
  const vao = colunas === 3 ? 14 : 30;
  const larguraColuna = (LARGURA - vao * (colunas - 1)) / colunas;
  const assinado = assinaturas.some((s) => s.imagem);
  const alturaBloco = assinado ? 112 : 70;
  const recuo = assinado ? 58 : 26;
  // mantém a data e todas as assinaturas juntas quando cabem numa página
  const linhasDeAssinatura = Math.ceil(partes.length / colunas);
  f.garantir(Math.min(linhasDeAssinatura * alturaBloco, 520));
  for (let i = 0; i < partes.length; i += colunas) {
    f.garantir(alturaBloco);
    const topo = f.y;
    const linha = partes.slice(i, i + colunas);
    for (let c = 0; c < linha.length; c++) {
      const p = linha[c];
      const x = MARGEM_X + c * (larguraColuna + vao);
      const centro = x + larguraColuna / 2;
      const a = porParte.get(p.id);
      const yLinha = topo - recuo;
      if (a?.imagem) {
        try {
          const base64 = a.imagem.split(",")[1] ?? a.imagem;
          const img = await f.doc.embedPng(Uint8Array.from(Buffer.from(base64, "base64")));
          const escala = Math.min((larguraColuna - 20) / img.width, 50 / img.height);
          f.pagina.drawImage(img, { x: centro - (img.width * escala) / 2, y: yLinha + 2, width: img.width * escala, height: img.height * escala });
        } catch {
          // imagem ilegível: a identificação em texto abaixo continua valendo
        }
      }
      f.pagina.drawLine({ start: { x: x + 6, y: yLinha }, end: { x: x + larguraColuna - 6, y: yLinha }, thickness: 0.7, color: COR.cinza });
      const nome = f.quebrar((a?.nomeDigitado || p.nome).toUpperCase(), f.negrito, 8, larguraColuna - 10).slice(0, 2);
      let ty = yLinha - 11;
      for (const l of nome) {
        f.escrever(l, centro, ty, { fonte: f.negrito, tamanho: 8, alinhar: "centro" });
        ty -= 10;
      }
      f.escrever(`${p.papel === "vendedor" ? "VENDEDOR(A)" : "COMPRADOR(A)"}${p.cpfCnpj ? ` · ${p.cpfCnpj}` : ""}`, centro, ty, { tamanho: 7.2, cor: COR.cinza, alinhar: "centro" });
      if (a?.assinadoEm) {
        const quando = new Date(a.assinadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
        f.escrever(`Assinado eletronicamente em ${quando}`, centro, ty - 9.5, { tamanho: 6.2, cor: COR.claro, alinhar: "centro" });
        if (a.ip) f.escrever(`IP ${a.ip}`, centro, ty - 17, { tamanho: 6.2, cor: COR.claro, alinhar: "centro" });
      }
    }
    f.y = topo - alturaBloco;
  }
}

export async function gerarPdfTermo(r: RetratoTermo, o: OpcoesPdfTermo): Promise<Uint8Array> {
  const doc = r.documento;
  const f = new Folha(r.modelo.margemSuperior || 122, r.modelo.margemInferior || 104);
  await f.iniciar(o);
  const nV = vendedores(doc).length;
  const nC = compradores(doc).length;

  // ---------------- página 1: partes, imóvel e data ----------------
  f.escrever("TERMO DE ENTREGA DE CHAVES E PROPORCIONALIDADE", A4.largura / 2, f.y - 12, { fonte: f.negrito, tamanho: 12, alinhar: "centro" });
  f.y -= 34;

  blocoPartes(f, nV > 1 ? "VENDEDORES" : "VENDEDOR", vendedores(doc));
  blocoPartes(f, nC > 1 ? "COMPRADORES" : "COMPRADOR", compradores(doc));

  f.faixa("IMÓVEL OBJETO DO CONTRATO");
  const L = [80, LARGURA - 80];
  const L4 = [80, (LARGURA - 190) / 2, 110, (LARGURA - 190) / 2];
  f.linha([rot("Endereço:"), val(doc.imovel.endereco.toUpperCase())], L);
  if (doc.imovel.areaPrivativa || doc.imovel.inscricaoIptu) f.linha([rot("Área privativa:"), val(doc.imovel.areaPrivativa), rot("Inscrição de IPTU:"), val(doc.imovel.inscricaoIptu)], L4);
  if (doc.imovel.matricula || doc.imovel.cartorio) f.linha([rot("Matrícula:"), val([doc.imovel.matricula, doc.imovel.cartorio].filter(Boolean).join(" – "))], L);
  if (doc.imovel.outros) f.linha([rot("Outros dados:"), val(doc.imovel.outros)], L);
  f.y -= 12;

  f.faixa("DATA DE ENTREGA DAS CHAVES");
  f.linha([{ linhas: [{ texto: `${dataBR(doc.dataEntrega) || "—"}${doc.horaEntrega ? ` às ${doc.horaEntrega}` : ""}`, negrito: true }], alinhar: "centro" }], [LARGURA], { tamanho: 10, minimo: 24 });
  if (doc.marco !== "entrega") {
    f.linha([{ linhas: [{ texto: `Marco da proporcionalidade: ${ROTULO_MARCO[doc.marco].toLowerCase()} – ${dataBR(marcoEfetivo(doc)) || "—"}` }], alinhar: "centro" }], [LARGURA]);
  }

  // ---------------- página 2 em diante: proporcionalidade ----------------
  f.novaPagina();
  f.faixa("PROPORCIONALIDADE", 80);
  const colunas = [86, 118, 88, 88, LARGURA - 380];
  const cabecalho = () =>
    f.linha(
      ["Encargo", "Informações", `Responsabilidade ${nV > 1 ? "dos vendedores" : "do vendedor"}`, `Responsabilidade ${nC > 1 ? "dos compradores" : "do comprador"}`, "Valor de ressarcimento"].map((t) => ({
        linhas: [{ texto: t, negrito: true }],
        fundo: COR.rotulo,
        alinhar: "centro" as const,
      })),
      colunas,
      { tamanho: 7.6 }
    );
  cabecalho();
  if (doc.encargos.length === 0) f.linha([{ linhas: [{ texto: "Nenhum encargo a ratear entre as partes.", cor: COR.cinza }], alinhar: "centro" }], [LARGURA]);
  for (const e of doc.encargos) {
    const c = r.calculos[e.id];
    if (!c || !c.valido) continue;
    f.linha(linhaEncargo(e, c, { v: nV > 1, c: nC > 1 }), colunas, { tamanho: 7.6, aoQuebrar: cabecalho });
  }

  // resumo total
  const a = r.acerto;
  f.garantir(74);
  f.linha(
    [
      rot("RESUMO TOTAL:"),
      {
        linhas: [
          { texto: `${nC > 1 ? "Compradores devem" : "Comprador deve"} ${nV > 1 ? "aos vendedores" : "ao vendedor"}: ${formatarCentavos(a.compradorDeveCentavos)}` },
          { texto: `${nV > 1 ? "Vendedores devem" : "Vendedor deve"} ${nC > 1 ? "aos compradores" : "ao comprador"}: ${formatarCentavos(a.vendedorDeveCentavos)}` },
          { texto: "" },
          { texto: r.textos.resumo, negrito: true },
        ],
      },
    ],
    [colunas[0], LARGURA - colunas[0]],
    { tamanho: 8.4 }
  );
  if (r.textos.ressarcimento) f.linha([{ linhas: [{ texto: r.textos.ressarcimento }], fundo: COR.rotulo }], [LARGURA], { tamanho: 8.2, padding: 7 });
  f.y -= 12;

  // demais encargos
  f.faixa("DEMAIS ENCARGOS", 60);
  const LD = [90, LARGURA - 90];
  f.linha([rot("ENERGIA:"), val(textoServico(doc.demais.energia))], LD);
  f.linha([rot("ÁGUA:"), val(textoServico(doc.demais.agua))], LD);
  f.linha([rot("GÁS:"), val(textoServico(doc.demais.gas))], LD);
  f.y -= 12;

  // cláusula e textos complementares
  f.paragrafo(r.textos.clausula, { tamanho: 9.2, depois: 8 });
  if (doc.clausula.textoComplementar) f.paragrafo(doc.clausula.textoComplementar, { tamanho: 9.2, depois: 8 });
  if (doc.clausula.observacoes) f.paragrafo(`Observações: ${doc.clausula.observacoes}`, { tamanho: 9.2, depois: 8 });
  if (o.assinaturas.some((s) => s.assinadoEm)) {
    f.paragrafo(
      "Documento assinado eletronicamente pelas partes por meio de assinatura eletrônica simples (nome declarado, assinatura manuscrita digitalizada, data, hora e endereço IP registrados no ato), com validade nos termos do art. 10, §2º, da MP 2.200-2/2001.",
      { tamanho: 7.6, cor: COR.cinza, depois: 8 }
    );
  }

  {
    const n = nV + nC;
    const porLinha = n === 3 ? 3 : 2;
    const altura = Math.ceil(n / porLinha) * (o.assinaturas.some((x) => x.imagem) ? 112 : 70) + 40;
    f.garantir(Math.min(altura, 560));
  }
  f.paragrafo(`${doc.local}, ${dataPorExtenso(doc.dataDocumento ?? doc.dataEntrega) || "____ de ____________ de ______"}.`, { tamanho: 9.5, negrito: true, depois: 18 });
  await blocoAssinaturas(f, r, o.assinaturas);

  // ---------------- acabamento: identificação e marca d'água ----------------
  const paginas = f.doc.getPages();
  paginas.forEach((pagina, i) => {
    const texto = f.t(`${r.codigo} · versão ${r.versao} · página ${i + 1} de ${paginas.length}`);
    const w = f.normal.widthOfTextAtSize(texto, 6);
    pagina.drawText(texto, { x: A4.largura - MARGEM_X - w, y: (r.modelo.margemInferior || 104) - 16, size: 6, font: f.normal, color: COR.claro });
    if (o.marcaDagua) {
      const marca = f.t(o.marcaDagua);
      const tamanho = 86;
      const wm = f.negrito.widthOfTextAtSize(marca, tamanho);
      const ang = (52 * Math.PI) / 180;
      pagina.drawText(marca, {
        x: A4.largura / 2 - (wm / 2) * Math.cos(ang) + tamanho * 0.35 * Math.sin(ang),
        y: A4.altura / 2 - (wm / 2) * Math.sin(ang) - tamanho * 0.35 * Math.cos(ang),
        size: tamanho,
        font: f.negrito,
        color: COR.vinho,
        opacity: 0.08,
        rotate: degrees(52),
      });
    }
  });
  f.doc.setTitle(`Termo de Entrega de Chaves ${r.codigo}`);
  f.doc.setAuthor("Sacra Netimóveis");
  return f.doc.save();
}
