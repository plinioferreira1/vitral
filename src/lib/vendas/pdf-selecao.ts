/**
 * PDF "Imóveis selecionados para você", no papel timbrado da Sacra.
 * Função pura: recebe perfil e anúncios já conferidos e devolve os bytes.
 */

import fontkit from "@pdf-lib/fontkit";
import { PDFArray, PDFDocument, PDFName, PDFString, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import { limpar, type FontesPdf, type Imagem } from "@/lib/avaliacao/pdf-base";
import { portalDoLink, type Anuncio, type Perfil } from "./selecao-imoveis";

const A4 = { largura: 595.28, altura: 841.89 };
const MX = 54;
const LARGURA = A4.largura - MX * 2;
const TOPO = 122;
const BASE = 104;

const COR = {
  tinta: rgb(0.11, 0.1, 0.09),
  cinza: rgb(0.37, 0.34, 0.31),
  linha: rgb(0.86, 0.78, 0.78),
  faixa: rgb(0.95, 0.94, 0.92),
  vinho: rgb(0.45, 0.08, 0.08),
};

const moeda = (reais: number) => reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: reais % 1 ? 2 : 0 });

export type IdentificacaoSelecao = { corretor: string; geradoEm: string };

class Folha {
  doc!: PDFDocument;
  normal!: PDFFont;
  negrito!: PDFFont;
  pagina!: PDFPage;
  y = 0;
  private fundo: PDFImage | null = null;
  private incorporadas = false;

  async iniciar(timbrado: Imagem | null, fontes: FontesPdf | null) {
    this.doc = await PDFDocument.create();
    if (fontes) {
      try {
        this.doc.registerFontkit(fontkit);
        this.normal = await this.doc.embedFont(fontes.sans, { subset: true });
        this.negrito = await this.doc.embedFont(fontes.sansNegrito, { subset: true });
        this.incorporadas = true;
      } catch (erro) {
        console.error("pdf-selecao: falha ao incorporar fontes; usando as padrão", erro);
        this.doc = await PDFDocument.create();
      }
    }
    if (!this.incorporadas) {
      this.normal = await this.doc.embedFont(StandardFonts.Helvetica);
      this.negrito = await this.doc.embedFont(StandardFonts.HelveticaBold);
    }
    if (timbrado) {
      try {
        this.fundo = timbrado.mime.includes("png") ? await this.doc.embedPng(timbrado.bytes) : await this.doc.embedJpg(timbrado.bytes);
      } catch (erro) {
        console.error("pdf-selecao: timbrado inválido; seguindo sem ele", erro);
      }
    }
    this.novaPagina();
  }

  t(texto: unknown): string {
    const s = String(texto ?? "").replace(/\r/g, "");
    return this.incorporadas ? s.replace(/\t/g, " ") : limpar(s);
  }

  novaPagina() {
    this.pagina = this.doc.addPage([A4.largura, A4.altura]);
    if (this.fundo) this.pagina.drawImage(this.fundo, { x: 0, y: 0, width: A4.largura, height: A4.altura });
    else {
      this.pagina.drawText("SACRA NETIMÓVEIS", { x: MX, y: A4.altura - 70, size: 13, font: this.negrito, color: COR.vinho });
      this.pagina.drawRectangle({ x: 0, y: 0, width: A4.largura, height: 26, color: COR.vinho });
    }
    this.y = A4.altura - TOPO;
  }

  garantir(altura: number) {
    if (this.y - altura < BASE) this.novaPagina();
  }

  quebrar(texto: string, fonte: PDFFont, tamanho: number, largura: number): string[] {
    const linhas: string[] = [];
    for (const paragrafo of this.t(texto).split("\n")) {
      let atual = "";
      for (const palavra of paragrafo.split(/[ \t]+/).filter(Boolean)) {
        const teste = atual ? `${atual} ${palavra}` : palavra;
        if (fonte.widthOfTextAtSize(teste, tamanho) > largura && atual) {
          linhas.push(atual);
          atual = palavra;
        } else atual = teste;
      }
      linhas.push(atual);
    }
    return linhas;
  }

  paragrafo(texto: string, o: { tamanho?: number; fonte?: PDFFont; cor?: RGB; x?: number; largura?: number; entre?: number } = {}) {
    const { tamanho = 9.5, fonte = this.normal, cor = COR.tinta, x = MX, largura = LARGURA, entre = 4 } = o;
    for (const linha of this.quebrar(texto, fonte, tamanho, largura)) {
      this.garantir(tamanho + entre);
      this.y -= tamanho;
      this.pagina.drawText(linha, { x, y: this.y, size: tamanho, font: fonte, color: cor });
      this.y -= entre;
    }
  }

  /** Texto clicável (link) numa linha. */
  link(rotulo: string, url: string, x: number, tamanho = 8.5) {
    const txt = this.t(rotulo);
    const w = this.normal.widthOfTextAtSize(txt, tamanho);
    this.pagina.drawText(txt, { x, y: this.y, size: tamanho, font: this.normal, color: COR.vinho });
    this.pagina.drawLine({ start: { x, y: this.y - 1.5 }, end: { x: x + w, y: this.y - 1.5 }, thickness: 0.4, color: COR.vinho });
    const anotacao = this.doc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x, this.y - 3, x + w, this.y + tamanho],
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
    });
    const ref = this.doc.context.register(anotacao);
    const existentes = this.pagina.node.lookup(PDFName.of("Annots"));
    if (existentes instanceof PDFArray) existentes.push(ref);
    else this.pagina.node.set(PDFName.of("Annots"), this.doc.context.obj([ref]));
  }

  titulo(s: string) {
    this.garantir(34);
    this.y -= 18;
    this.pagina.drawText(this.t(s), { x: MX, y: this.y, size: 9, font: this.negrito, color: COR.vinho });
    this.y -= 6;
    this.pagina.drawLine({ start: { x: MX, y: this.y }, end: { x: MX + LARGURA, y: this.y }, thickness: 0.6, color: COR.vinho });
    this.y -= 4;
  }
}

function caracteristicas(a: Anuncio): string {
  return [
    a.area ? `${a.area.toLocaleString("pt-BR")} m²` : "",
    a.quartos ? `${a.quartos} ${a.quartos === 1 ? "quarto" : "quartos"}` : "",
    a.vagas ? `${a.vagas} ${a.vagas === 1 ? "vaga" : "vagas"}` : "",
    a.condominio ? `condomínio ${moeda(a.condominio)}` : "",
  ].filter(Boolean).join(" · ");
}

function resumoPerfil(p: Perfil): string {
  return [
    p.tipo,
    p.finalidade === "aluguel" ? "para alugar" : "para comprar",
    p.regiao && `em ${p.regiao}`,
    p.quartos ? `${p.quartos}+ quartos` : "",
    p.vagas ? `${p.vagas}+ ${p.vagas === 1 ? "vaga" : "vagas"}` : "",
    p.areaMin ? `a partir de ${p.areaMin} m²` : "",
    p.precoMax ? `até ${moeda(p.precoMax)}` : "",
    p.financiamento && p.finalidade === "venda" ? "com financiamento" : "",
  ].filter(Boolean).join(", ");
}

export async function gerarPdfSelecao(
  perfil: Perfil,
  anuncios: Anuncio[],
  mensagem: string,
  id: IdentificacaoSelecao,
  o: { timbrado: Imagem | null; fontes: FontesPdf | null },
): Promise<Uint8Array> {
  const f = new Folha();
  await f.iniciar(o.timbrado, o.fontes);

  f.y -= 16;
  f.pagina.drawText(f.t("Imóveis selecionados para você"), { x: MX, y: f.y, size: 17, font: f.negrito, color: COR.tinta });
  f.y -= 10;
  f.paragrafo(`${perfil.cliente} · ${resumoPerfil(perfil)}`, { tamanho: 10, cor: COR.cinza });
  if (mensagem) {
    f.y -= 4;
    f.paragrafo(mensagem, { tamanho: 9.5 });
  }

  anuncios.forEach((a, i) => {
    const portal = portalDoLink(a.link)?.nome ?? "Anúncio";
    f.garantir(78);
    f.titulo(`${String(i + 1).padStart(2, "0")}  ${a.titulo || a.endereco || "Imóvel"}`);
    if (a.endereco && a.titulo) f.paragrafo(a.endereco, { tamanho: 9, cor: COR.cinza });
    const linha = [a.preco ? moeda(a.preco) : "", caracteristicas(a)].filter(Boolean).join("   ·   ");
    if (linha) f.paragrafo(linha, { tamanho: 10.5, fonte: f.negrito });
    if (a.observacao) f.paragrafo(a.observacao, { tamanho: 9 });
    f.garantir(16);
    f.y -= 11;
    f.link(`Ver anúncio no ${portal}`, a.link, MX);
    f.y -= 4;
  });

  f.garantir(48);
  f.y -= 16;
  f.paragrafo(
    "Valores e disponibilidade conforme os anúncios na data desta seleção e sujeitos a alteração pelos anunciantes. Confirme com seu corretor antes da visita.",
    { tamanho: 8, cor: COR.cinza },
  );
  f.paragrafo(`Selecionado por ${id.corretor || "Sacra Netimóveis"} em ${id.geradoEm}.`, { tamanho: 8, cor: COR.cinza });

  return f.doc.save();
}
