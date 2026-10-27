/**
 * PDF da memória de cálculo de multa e juros por atraso (Locação), no
 * papel timbrado da Sacra, para envio à seguradora do seguro fiança.
 * Função pura: recebe a memória já calculada (atraso.ts) e devolve os bytes.
 */

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import { limpar, type FontesPdf, type Imagem } from "@/lib/avaliacao/pdf-base";
import { explicacaoItem, formatarPct, type MemoriaAtraso } from "./atraso";

const A4 = { largura: 595.28, altura: 841.89 };
const MX = 54;
const LARGURA = A4.largura - MX * 2;
const TOPO = 122;
const BASE = 104;

const COR = {
  tinta: rgb(0.11, 0.1, 0.09),
  cinza: rgb(0.37, 0.34, 0.31),
  claro: rgb(0.55, 0.52, 0.48),
  linha: rgb(0.82, 0.8, 0.77),
  faixa: rgb(0.95, 0.94, 0.92),
  vinho: rgb(0.45, 0.08, 0.08),
};

export type IdentificacaoAtraso = {
  contrato: string;
  locatario: string;
  locador: string;
  imovel: string;
  seguradora: string;
  observacoes: string;
  elaboradoPor: string;
  geradoEm: string;
};

const moeda = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const mesBR = (aaaaMm: string) => `${aaaaMm.slice(5, 7)}/${aaaaMm.slice(0, 4)}`;

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
        console.error("pdf-atraso: falha ao incorporar fontes; usando as padrão", erro);
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
        console.error("pdf-atraso: timbrado inválido; seguindo sem ele", erro);
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
      for (const palavra of paragrafo.split(/\s+/).filter(Boolean)) {
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

  paragrafo(texto: string, { tamanho = 9.5, fonte = this.normal, cor = COR.tinta, x = MX, largura = LARGURA, entre = 4 }: { tamanho?: number; fonte?: PDFFont; cor?: RGB; x?: number; largura?: number; entre?: number } = {}) {
    for (const linha of this.quebrar(texto, fonte, tamanho, largura)) {
      this.garantir(tamanho + entre);
      this.y -= tamanho;
      this.pagina.drawText(linha, { x, y: this.y, size: tamanho, font: fonte, color: cor });
      this.y -= entre;
    }
  }

  texto(s: string, x: number, y: number, o: { tamanho?: number; fonte?: PDFFont; cor?: RGB; alinhar?: "esq" | "dir"; largura?: number } = {}) {
    const tamanho = o.tamanho ?? 8.5;
    const fonte = o.fonte ?? this.normal;
    let txt = this.t(s);
    if (o.largura) while (txt.length > 1 && fonte.widthOfTextAtSize(txt, tamanho) > o.largura) txt = `${txt.slice(0, -2)}…`;
    const w = fonte.widthOfTextAtSize(txt, tamanho);
    this.pagina.drawText(txt, { x: o.alinhar === "dir" ? x - w : x, y, size: tamanho, font: fonte, color: o.cor ?? COR.tinta });
  }

  titulo(s: string) {
    this.garantir(34);
    this.y -= 18;
    this.texto(s.toUpperCase(), MX, this.y, { tamanho: 9, fonte: this.negrito, cor: COR.vinho });
    this.y -= 6;
    this.pagina.drawLine({ start: { x: MX, y: this.y }, end: { x: MX + LARGURA, y: this.y }, thickness: 0.6, color: COR.linha });
    this.y -= 4;
  }

  dado(rotulo: string, valor: string) {
    const linhas = this.quebrar(valor || "—", this.normal, 9.5, LARGURA - 120);
    this.garantir(14 * linhas.length);
    this.y -= 12;
    this.texto(rotulo, MX, this.y, { tamanho: 8.5, cor: COR.cinza });
    linhas.forEach((l, i) => this.texto(l, MX + 120, this.y - i * 12, { tamanho: 9.5 }));
    this.y -= (linhas.length - 1) * 12 + 2;
  }
}

/** Colunas da tabela: [rótulo, largura, alinhamento]. Somam a largura útil. */
const COLUNAS: [string, number, "esq" | "dir"][] = [
  ["Débito", 118, "esq"], ["Vencimento", 52, "esq"], ["Dias", 26, "dir"], ["Valor original", 58, "dir"],
  ["Correção", 50, "dir"], ["Multa", 56, "dir"], ["Juros", 54, "dir"], ["Total", 73, "dir"],
];

export async function gerarPdfMemoriaAtraso(m: MemoriaAtraso, id: IdentificacaoAtraso, o: { timbrado: Imagem | null; fontes: FontesPdf | null }): Promise<Uint8Array> {
  const f = new Folha();
  await f.iniciar(o.timbrado, o.fontes);
  const e = m.entrada;

  f.texto("Memória de cálculo", MX, f.y - 16, { tamanho: 17, fonte: f.negrito });
  f.y -= 32;
  f.paragrafo(`Débitos de locação em atraso, atualizados até ${dataBR(e.dataCalculo)}`, { tamanho: 10.5, cor: COR.cinza });

  f.titulo("Identificação");
  f.dado("Contrato", id.contrato);
  f.dado("Locatário", id.locatario);
  f.dado("Locador", id.locador);
  f.dado("Imóvel", id.imovel);
  if (id.seguradora) f.dado("Seguro fiança", id.seguradora);

  f.titulo("Critérios do cálculo");
  f.dado("Data do cálculo", dataBR(e.dataCalculo));
  f.dado("Multa moratória", `${formatarPct(e.multaPct)} sobre o valor do débito${e.indice ? " corrigido" : ""}`);
  f.dado("Juros de mora", `${formatarPct(e.jurosMensalPct)} ao mês, simples, proporcionais aos dias de atraso (ao mês ÷ 30 por dia)`);
  f.dado("Correção monetária", e.indice ? `${e.indice}, pelo percentual acumulado informado para cada débito, do vencimento até a data do cálculo` : "Não aplicada");

  // tabela
  f.titulo("Demonstrativo");
  const desenharCabecalho = () => {
    f.garantir(22);
    f.pagina.drawRectangle({ x: MX, y: f.y - 16, width: LARGURA, height: 16, color: COR.faixa });
    let x = MX;
    for (const [rotulo, w, al] of COLUNAS) {
      f.texto(rotulo, al === "dir" ? x + w - 4 : x + 4, f.y - 11, { tamanho: 7.5, fonte: f.negrito, cor: COR.cinza, alinhar: al });
      x += w;
    }
    f.y -= 16;
  };
  desenharCabecalho();
  const linhaTabela = (valores: string[], negrito = false, faixa = false) => {
    if (f.y - 16 < BASE) { f.novaPagina(); desenharCabecalho(); }
    if (faixa) f.pagina.drawRectangle({ x: MX, y: f.y - 16, width: LARGURA, height: 16, color: COR.faixa });
    let x = MX;
    COLUNAS.forEach(([, w, al], i) => {
      f.texto(valores[i], al === "dir" ? x + w - 4 : x + 4, f.y - 11, { tamanho: 8, fonte: negrito ? f.negrito : f.normal, alinhar: al, largura: w - 8 });
      x += w;
    });
    f.y -= 16;
    f.pagina.drawLine({ start: { x: MX, y: f.y }, end: { x: MX + LARGURA, y: f.y }, thickness: 0.4, color: COR.linha });
  };
  for (const it of m.itens) {
    linhaTabela([
      it.competencia ? `${it.descricao} (${mesBR(it.competencia)})` : it.descricao,
      dataBR(it.vencimento), String(it.dias), moeda(it.valorCentavos),
      e.indice ? moeda(it.correcaoCentavos) : "—", moeda(it.multaCentavos), moeda(it.jurosCentavos), moeda(it.totalCentavos),
    ]);
  }
  const t = m.totais;
  linhaTabela(["Total", "", "", moeda(t.original), e.indice ? moeda(t.correcao) : "—", moeda(t.multa), moeda(t.juros), moeda(t.total)], true, true);

  f.garantir(40);
  f.y -= 18;
  f.texto("Total devido na data do cálculo", MX, f.y, { tamanho: 10.5, fonte: f.negrito });
  f.texto(moeda(t.total), MX + LARGURA, f.y, { tamanho: 13, fonte: f.negrito, cor: COR.vinho, alinhar: "dir" });
  f.y -= 6;
  const aVencer = m.itens.filter((i) => !i.vencido).reduce((s, i) => s + i.totalCentavos, 0);
  if (aVencer) f.paragrafo(`Inclui ${moeda(aVencer)} ainda não vencido na data do cálculo, sem multa e sem juros.`, { tamanho: 8.5, cor: COR.cinza });

  // detalhamento linha a linha
  f.titulo("Detalhamento");
  m.itens.forEach((it, i) => {
    f.garantir(60);
    f.y -= 4;
    f.paragrafo(`${i + 1}. ${it.descricao}${it.competencia ? ` (${mesBR(it.competencia)})` : ""} · vencimento ${dataBR(it.vencimento)} · ${it.dias} dia${it.dias === 1 ? "" : "s"} de atraso · valor original ${moeda(it.valorCentavos)}`, { tamanho: 9, fonte: f.negrito });
    for (const linha of explicacaoItem(it, e, moeda)) f.paragrafo(linha, { tamanho: 8.5, cor: COR.cinza, x: MX + 12, largura: LARGURA - 12, entre: 3 });
    f.paragrafo(`Total: ${moeda(it.totalCentavos)}`, { tamanho: 8.5, x: MX + 12, largura: LARGURA - 12 });
  });

  if (id.observacoes.trim()) {
    f.titulo("Observações");
    f.paragrafo(id.observacoes, { tamanho: 9 });
  }

  f.garantir(40);
  f.y -= 16;
  f.paragrafo(`Elaborado por ${id.elaboradoPor || "Sacra Netimóveis"} em ${id.geradoEm}. Valores calculados pelo Vitral com os critérios acima; os percentuais de multa, juros e correção seguem o contrato de locação.`, { tamanho: 7.5, cor: COR.claro });

  // numeração das páginas
  const paginas = f.doc.getPages();
  paginas.forEach((p, i) => {
    const s = f.t(`Página ${i + 1} de ${paginas.length}`);
    p.drawText(s, { x: MX + LARGURA - f.normal.widthOfTextAtSize(s, 7.5), y: BASE - 12, size: 7.5, font: f.normal, color: COR.claro });
  });
  return f.doc.save();
}
