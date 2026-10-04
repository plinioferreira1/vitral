/**
 * Ferramentas de diagramação do PDF da Avaliação (pdf-lib): páginas A4
 * com cabeçalho/rodapé, quebra de texto, imagens recortadas, rótulos em
 * caixa alta e marca d'água. O conteúdo de cada seção fica em pdf.ts.
 */

import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  StandardFonts,
  clip,
  degrees,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  setCharacterSpacing,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from "pdf-lib";

export const A4 = { largura: 595.28, altura: 841.89 };
export const MARGEM = 54;
export const LARGURA_UTIL = A4.largura - MARGEM * 2;
/** primeira linha de conteúdo abaixo do cabeçalho */
export const TOPO = 772;
/** limite inferior do conteúdo, acima do rodapé */
export const BASE = 74;

function hex(cor: string): RGB {
  const n = parseInt(cor.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Paleta oficial da Sacra Netimóveis + neutros de apoio. */
export const COR = {
  vinho: hex("#731515"),
  dourado: hex("#D28C2C"),
  preto: hex("#000000"),
  branco: hex("#FFFFFF"),
  // apoio
  marfim: hex("#F7F3EC"),
  tinta: hex("#1F1A17"),
  cinza: hex("#5F5750"),
  cinzaClaro: hex("#8C837A"),
  linha: hex("#DDD5C9"),
  vinhoClaro: hex("#9A5A55"),
  rosado: hex("#F1DADA"),
};

export type Imagem = { bytes: Uint8Array; mime: string };

/** Fontes incorporadas ao PDF (Liberation). Sem elas, usa as fontes padrão do leitor. */
export type FontesPdf = { serif: Uint8Array; serifItalico: Uint8Array; sans: Uint8Array; sansNegrito: Uint8Array };

const EXTRAS_CP1252 = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

/** Mantém só o que as fontes padrão do PDF (WinAnsi) conseguem escrever. */
export function limpar(texto: unknown): string {
  return String(texto ?? "")
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/→/g, "->")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/[✓✔]/g, "ok")
    .replace(/ /g, " ")
    .split("")
    .filter((ch) => ch === "\n" || (ch.charCodeAt(0) >= 32 && ch.charCodeAt(0) <= 255) || EXTRAS_CP1252.includes(ch))
    .join("");
}

export type MetaPagina = { fundo: "claro" | "vinho" | "capa"; secao: string; numeroSecao: string };

export class Diagramador {
  doc!: PDFDocument;
  serif!: PDFFont;
  serifItalico!: PDFFont;
  sans!: PDFFont;
  sansNegrito!: PDFFont;
  pagina!: PDFPage;
  y = TOPO;
  metas: MetaPagina[] = [];
  private cacheImagens = new Map<string, PDFImage | null>();
  private secaoAtual = "";
  private numeroSecaoAtual = "";
  private fundoAtual: MetaPagina["fundo"] = "claro";

  constructor(
    private cabecalhoEsquerda: string,
    private imagens: Record<string, Imagem>
  ) {}

  async iniciar(fontes?: FontesPdf | null) {
    this.doc = await PDFDocument.create();
    if (fontes) {
      try {
        this.doc.registerFontkit(fontkit);
        this.serif = await this.doc.embedFont(fontes.serif, { subset: true });
        this.serifItalico = await this.doc.embedFont(fontes.serifItalico, { subset: true });
        this.sans = await this.doc.embedFont(fontes.sans, { subset: true });
        this.sansNegrito = await this.doc.embedFont(fontes.sansNegrito, { subset: true });
        return;
      } catch (erro) {
        console.error("avaliacao/pdf: falha ao incorporar fontes; usando as fontes padrão", erro);
        this.doc = await PDFDocument.create();
      }
    }
    this.serif = await this.doc.embedFont(StandardFonts.TimesRoman);
    this.serifItalico = await this.doc.embedFont(StandardFonts.TimesRomanItalic);
    this.sans = await this.doc.embedFont(StandardFonts.Helvetica);
    this.sansNegrito = await this.doc.embedFont(StandardFonts.HelveticaBold);
  }

  get corTexto() {
    return this.fundoAtual === "vinho" ? COR.branco : COR.tinta;
  }
  get corSuave() {
    return this.fundoAtual === "vinho" ? COR.rosado : COR.cinza;
  }
  get corTitulo() {
    return this.fundoAtual === "vinho" ? COR.branco : COR.vinho;
  }

  // ---------- páginas ----------

  novaPagina(secao: string, numeroSecao: string, fundo: MetaPagina["fundo"] = "claro") {
    this.pagina = this.doc.addPage([A4.largura, A4.altura]);
    this.secaoAtual = secao;
    this.numeroSecaoAtual = numeroSecao;
    this.fundoAtual = fundo;
    this.metas.push({ fundo, secao, numeroSecao });
    this.y = TOPO;
    if (fundo === "vinho") {
      this.pagina.drawRectangle({ x: 0, y: 0, width: A4.largura, height: A4.altura, color: COR.vinho });
    }
    if (fundo !== "capa") this.cabecalho();
  }

  private cabecalho() {
    const cor = this.fundoAtual === "vinho" ? COR.branco : COR.vinho;
    this.rotulo(this.cabecalhoEsquerda, MARGEM, 800, { tamanho: 6.2, cor });
    const direita = `${this.numeroSecaoAtual}  /  ${this.secaoAtual.toUpperCase()}`;
    this.rotulo(direita, A4.largura - MARGEM, 800, { tamanho: 6.2, cor, alinhar: "direita" });
  }

  /** Garante espaço; se não couber, continua em nova página da mesma seção. */
  garantir(altura: number) {
    if (this.y - altura < BASE) {
      this.novaPagina(this.secaoAtual, this.numeroSecaoAtual, this.fundoAtual === "capa" ? "claro" : this.fundoAtual);
      this.rotulo("CONTINUAÇÃO", MARGEM, this.y, { tamanho: 6.2, cor: this.fundoAtual === "vinho" ? COR.dourado : COR.cinzaClaro });
      this.y -= 22;
    }
  }

  espaco(altura: number) {
    this.y -= altura;
  }

  // ---------- texto ----------

  largura(texto: string, fonte: PDFFont, tamanho: number, espacamento = 0) {
    const limpo = limpar(texto);
    return fonte.widthOfTextAtSize(limpo, tamanho) + espacamento * limpo.length;
  }

  /** Texto simples numa posição (sem quebra). */
  escrever(
    texto: string,
    x: number,
    y: number,
    o: { fonte?: PDFFont; tamanho?: number; cor?: RGB; alinhar?: "esquerda" | "direita" | "centro"; opacidade?: number } = {}
  ) {
    const fonte = o.fonte ?? this.sans;
    const tamanho = o.tamanho ?? 9;
    const limpo = limpar(texto).replace(/\n/g, " ");
    const w = fonte.widthOfTextAtSize(limpo, tamanho);
    const px = o.alinhar === "direita" ? x - w : o.alinhar === "centro" ? x - w / 2 : x;
    this.pagina.drawText(limpo, { x: px, y, size: tamanho, font: fonte, color: o.cor ?? this.corTexto, opacity: o.opacidade });
    return w;
  }

  /** Rótulo em caixa alta, negrito e letras espaçadas. */
  rotulo(
    texto: string,
    x: number,
    y: number,
    o: { tamanho?: number; cor?: RGB; alinhar?: "esquerda" | "direita"; espacamento?: number; fonte?: PDFFont } = {}
  ) {
    const fonte = o.fonte ?? this.sansNegrito;
    const tamanho = o.tamanho ?? 6.5;
    const esp = o.espacamento ?? 0.6;
    const limpo = limpar(texto).toUpperCase().replace(/\n/g, " ");
    const w = fonte.widthOfTextAtSize(limpo, tamanho) + esp * limpo.length;
    const px = o.alinhar === "direita" ? x - w : x;
    this.pagina.pushOperators(setCharacterSpacing(esp));
    this.pagina.drawText(limpo, { x: px, y, size: tamanho, font: fonte, color: o.cor ?? COR.vinho });
    this.pagina.pushOperators(setCharacterSpacing(0));
    return w;
  }

  quebrar(texto: string, fonte: PDFFont, tamanho: number, larguraMax: number): string[] {
    const linhas: string[] = [];
    for (const paragrafo of limpar(texto).split("\n")) {
      if (paragrafo.trim() === "") {
        linhas.push("");
        continue;
      }
      let atual = "";
      for (let palavra of paragrafo.split(/\s+/).filter(Boolean)) {
        // palavra maior que a linha (link, por exemplo): corta por caracteres
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
        } else {
          atual = teste;
        }
      }
      if (atual) linhas.push(atual);
    }
    return linhas;
  }

  /** Altura que um parágrafo ocuparia. */
  alturaParagrafo(texto: string, o: { fonte?: PDFFont; tamanho?: number; largura?: number; entrelinha?: number } = {}) {
    const tamanho = o.tamanho ?? 9.5;
    const entrelinha = o.entrelinha ?? tamanho * 1.55;
    return this.quebrar(texto, o.fonte ?? this.sans, tamanho, o.largura ?? LARGURA_UTIL).length * entrelinha;
  }

  /** Parágrafo com quebra de linha e de página, a partir do cursor. */
  paragrafo(
    texto: string,
    o: { fonte?: PDFFont; tamanho?: number; cor?: RGB; x?: number; largura?: number; entrelinha?: number; depois?: number } = {}
  ) {
    const fonte = o.fonte ?? this.sans;
    const tamanho = o.tamanho ?? 9.5;
    const entrelinha = o.entrelinha ?? tamanho * 1.55;
    const x = o.x ?? MARGEM;
    const linhas = this.quebrar(texto, fonte, tamanho, o.largura ?? LARGURA_UTIL - (x - MARGEM));
    for (const linha of linhas) {
      this.garantir(entrelinha);
      if (linha) {
        this.pagina.drawText(linha, { x, y: this.y - tamanho, size: tamanho, font: fonte, color: o.cor ?? this.corTexto });
      }
      this.y -= entrelinha;
    }
    this.y -= o.depois ?? 8;
  }

  /** Abertura de seção: sobretítulo, filete dourado e título em serifa. */
  abertura(sobretitulo: string, titulo: string, o: { tamanho?: number; introducao?: string } = {}) {
    this.rotulo(sobretitulo, MARGEM, this.y - 6, { cor: this.fundoAtual === "vinho" ? COR.dourado : COR.vinho });
    this.y -= 34;
    const tamanho = o.tamanho ?? 27;
    for (const linha of limpar(titulo).split("\n")) {
      this.pagina.drawText(linha, { x: MARGEM, y: this.y - tamanho, size: tamanho, font: this.serif, color: this.corTitulo });
      this.y -= tamanho * 1.18;
    }
    this.y -= 16;
    this.pagina.drawRectangle({ x: MARGEM, y: this.y, width: 46, height: 1.6, color: COR.dourado });
    this.y -= 22;
    if (o.introducao) this.paragrafo(o.introducao, { tamanho: 10, cor: this.corSuave, largura: LARGURA_UTIL - 60, depois: 14 });
  }

  /** Subtítulo de bloco dentro da seção. */
  subtitulo(texto: string, o: { antes?: number; reservar?: number } = {}) {
    this.y -= o.antes ?? 8;
    this.garantir(o.reservar ?? 40);
    this.rotulo(texto, MARGEM, this.y - 6, { cor: this.fundoAtual === "vinho" ? COR.dourado : COR.vinho });
    this.y -= 18;
  }

  filete(o: { cor?: RGB; espessura?: number; x?: number; largura?: number; depois?: number } = {}) {
    const x = o.x ?? MARGEM;
    this.pagina.drawLine({
      start: { x, y: this.y },
      end: { x: x + (o.largura ?? LARGURA_UTIL), y: this.y },
      thickness: o.espessura ?? 0.6,
      color: o.cor ?? (this.fundoAtual === "vinho" ? COR.vinhoClaro : COR.linha),
    });
    this.y -= o.depois ?? 0;
  }

  /** Caixa de destaque (fundo marfim, barra dourada à esquerda). */
  destaque(titulo: string | null, texto: string) {
    const tamanho = 8.6;
    const largura = LARGURA_UTIL - 32;
    const alturaTexto = this.alturaParagrafo(texto, { tamanho, largura });
    const altura = alturaTexto + (titulo ? 18 : 0) + 24;
    this.garantir(altura + 8);
    const topo = this.y;
    this.pagina.drawRectangle({ x: MARGEM, y: topo - altura, width: LARGURA_UTIL, height: altura, color: COR.marfim });
    this.pagina.drawRectangle({ x: MARGEM, y: topo - altura, width: 3, height: altura, color: COR.dourado });
    this.y = topo - 13;
    if (titulo) {
      this.rotulo(titulo, MARGEM + 18, this.y - 6, { cor: COR.vinho });
      this.y -= 18;
    }
    const corAntes = this.fundoAtual;
    this.fundoAtual = "claro";
    this.paragrafo(texto, { tamanho, x: MARGEM + 18, largura, cor: COR.cinza, depois: 0 });
    this.fundoAtual = corAntes;
    this.y = topo - altura - 14;
  }

  /** Lista "rótulo: valor" em duas colunas; só entra o que tem valor. */
  fichas(itens: [string, string | null | undefined][], o: { colunas?: 1 | 2 } = {}) {
    const validos = itens.filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "") as [string, string][];
    if (validos.length === 0) return;
    const colunas = o.colunas ?? 2;
    const larguraColuna = (LARGURA_UTIL - (colunas - 1) * 24) / colunas;
    for (let i = 0; i < validos.length; i += colunas) {
      const linha = validos.slice(i, i + colunas);
      const alturas = linha.map(([, v]) => this.alturaParagrafo(v, { tamanho: 9.5, largura: larguraColuna }));
      const altura = Math.max(...alturas) + 22;
      this.garantir(altura);
      const topo = this.y;
      linha.forEach(([rot, valor], c) => {
        const x = MARGEM + c * (larguraColuna + 24);
        this.rotulo(rot, x, topo - 8, { tamanho: 5.8, cor: COR.cinzaClaro });
        this.y = topo - 13;
        this.paragrafo(valor, { tamanho: 9.5, x, largura: larguraColuna, depois: 0 });
      });
      this.y = topo - altura;
      this.pagina.drawLine({
        start: { x: MARGEM, y: this.y + 4 },
        end: { x: MARGEM + LARGURA_UTIL, y: this.y + 4 },
        thickness: 0.5,
        color: COR.linha,
      });
    }
    this.y -= 8;
  }

  /** Lista numerada (01, 02…) com título e texto, como no modelo editorial. */
  passos(itens: { titulo: string; texto: string }[], o: { inicio?: number } = {}) {
    itens.forEach((item, i) => {
      const larguraTexto = LARGURA_UTIL - 64;
      const altura = this.alturaParagrafo(item.texto, { tamanho: 8.6, largura: larguraTexto }) + 29;
      this.garantir(altura);
      this.filete({ depois: 0 });
      const topo = this.y;
      this.escrever(String((o.inicio ?? 1) + i).padStart(2, "0"), MARGEM, topo - 22, {
        fonte: this.serif,
        tamanho: 15,
        cor: COR.dourado,
      });
      this.escrever(item.titulo, MARGEM + 64, topo - 17, { fonte: this.sansNegrito, tamanho: 9.2, cor: this.corTitulo });
      this.y = topo - 24;
      this.paragrafo(item.texto, { tamanho: 8.6, x: MARGEM + 64, largura: larguraTexto, cor: this.corSuave, depois: 0 });
      this.y = topo - altura;
    });
  }

  /** Índice compacto em duas colunas (número, título e resumo curto). */
  indice(itens: { titulo: string; texto: string }[]) {
    const larguraColuna = (LARGURA_UTIL - 24) / 2;
    const alturaLinha = 34;
    const linhas = Math.ceil(itens.length / 2);
    this.garantir(linhas * alturaLinha + 6);
    const topo = this.y;
    itens.forEach((item, i) => {
      const coluna = i < linhas ? 0 : 1;
      const linha = coluna === 0 ? i : i - linhas;
      const x = MARGEM + coluna * (larguraColuna + 24);
      const y = topo - linha * alturaLinha;
      this.pagina.drawLine({ start: { x, y }, end: { x: x + larguraColuna, y }, thickness: 0.5, color: COR.linha });
      this.escrever(String(i + 1).padStart(2, "0"), x, y - 21, { fonte: this.serif, tamanho: 13, cor: COR.dourado });
      this.escrever(item.titulo, x + 34, y - 15, { fonte: this.sansNegrito, tamanho: 8.6, cor: this.corTitulo });
      const resumo = this.quebrar(item.texto, this.sans, 7.2, larguraColuna - 34)[0] ?? "";
      this.escrever(resumo, x + 34, y - 26, { tamanho: 7.2, cor: this.corSuave });
    });
    this.y = topo - linhas * alturaLinha - 8;
  }

  // ---------- imagens ----------

  async imagem(chave: string | null | undefined): Promise<PDFImage | null> {
    if (!chave) return null;
    if (this.cacheImagens.has(chave)) return this.cacheImagens.get(chave) ?? null;
    const dado = this.imagens[chave];
    let img: PDFImage | null = null;
    if (dado) {
      try {
        img = dado.mime.includes("png") ? await this.doc.embedPng(dado.bytes) : await this.doc.embedJpg(dado.bytes);
      } catch {
        try {
          img = dado.mime.includes("png") ? await this.doc.embedJpg(dado.bytes) : await this.doc.embedPng(dado.bytes);
        } catch {
          img = null;
        }
      }
    }
    this.cacheImagens.set(chave, img);
    return img;
  }

  /** Desenha a imagem preenchendo a área (recorta o excesso, sem deformar). */
  imagemCobrindo(img: PDFImage, x: number, y: number, largura: number, altura: number) {
    const escala = Math.max(largura / img.width, altura / img.height);
    const w = img.width * escala;
    const h = img.height * escala;
    this.pagina.pushOperators(pushGraphicsState(), rectangle(x, y, largura, altura), clip(), endPath());
    this.pagina.drawImage(img, { x: x - (w - largura) / 2, y: y - (h - altura) / 2, width: w, height: h });
    this.pagina.pushOperators(popGraphicsState());
  }

  /** Desenha a imagem inteira dentro da área (sem cortar). */
  imagemContida(img: PDFImage, x: number, y: number, largura: number, altura: number, alinhar: "esquerda" | "direita" | "centro" = "centro") {
    const escala = Math.min(largura / img.width, altura / img.height);
    const w = img.width * escala;
    const h = img.height * escala;
    const px = alinhar === "esquerda" ? x : alinhar === "direita" ? x + largura - w : x + (largura - w) / 2;
    this.pagina.drawImage(img, { x: px, y: y + (altura - h) / 2, width: w, height: h });
    return { largura: w, altura: h };
  }

  // ---------- acabamento ----------

  /** Rodapés (com o total de páginas) e marca d'água. */
  finalizar(rodape: string, o: { marcaDagua?: string | null; avisoRodape?: string | null }) {
    const paginas = this.doc.getPages();
    paginas.forEach((pagina, i) => {
      const meta = this.metas[i];
      this.pagina = pagina;
      this.fundoAtual = meta.fundo;
      if (meta.fundo !== "capa") {
        const cor = meta.fundo === "vinho" ? COR.branco : COR.vinho;
        pagina.drawLine({
          start: { x: MARGEM, y: 52 },
          end: { x: A4.largura - MARGEM, y: 52 },
          thickness: 0.6,
          color: meta.fundo === "vinho" ? COR.vinhoClaro : COR.linha,
        });
        this.rotulo(rodape, MARGEM, 38, { tamanho: 5.6, cor });
        this.rotulo(`${String(i + 1).padStart(2, "0")} / ${String(paginas.length).padStart(2, "0")}`, A4.largura - MARGEM, 38, {
          tamanho: 5.6,
          cor,
          alinhar: "direita",
        });
        if (o.avisoRodape) {
          this.rotulo(o.avisoRodape, MARGEM, 27, { tamanho: 5.4, cor: meta.fundo === "vinho" ? COR.dourado : COR.cinzaClaro });
        }
      }
      if (o.marcaDagua) {
        const texto = limpar(o.marcaDagua);
        const tamanho = 92;
        const w = this.sansNegrito.widthOfTextAtSize(texto, tamanho);
        const ang = (52 * Math.PI) / 180;
        pagina.drawText(texto, {
          x: A4.largura / 2 - (w / 2) * Math.cos(ang) + (tamanho * 0.35) * Math.sin(ang),
          y: A4.altura / 2 - (w / 2) * Math.sin(ang) - (tamanho * 0.35) * Math.cos(ang),
          size: tamanho,
          font: this.sansNegrito,
          color: meta.fundo === "claro" ? COR.vinho : COR.branco,
          opacity: meta.fundo === "claro" ? 0.07 : 0.1,
          rotate: degrees(52),
        });
      }
    });
  }
}
