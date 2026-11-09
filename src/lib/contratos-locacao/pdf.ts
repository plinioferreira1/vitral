/**
 * PDF dos contratos de locação e de prestação de serviços, no papel timbrado
 * e no padrão visual das tabelas dos documentos da Sacra (mesmo motor do
 * Termo de Entrega). Função pura: recebe o documento montado em `montar.ts`.
 */

import type { PDFFont } from "pdf-lib";
import { A4, COR, Folha, LARGURA, MARGEM_X, rot, val, type OpcoesPdfTermo } from "@/lib/termo-entrega/pdf";
import type { Documento, Quadro } from "./montar";

export type OpcoesPdfContrato = Pick<OpcoesPdfTermo, "timbrado" | "fontes"> & { marcaDagua?: string | null };

/** Partes e termos que aparecem em negrito no corpo, como nas minutas. */
const DESTAQUES =
  /(PAR[AÁ]GRAFO (?:ÚNICO|PRIMEIRO|SEGUNDO|TERCEIRO|QUARTO|QUINTO|SEXTO|SÉTIMO|OITAVO|NONO|DÉCIMO):|SACRA SOLUÇÕES IMOBILIÁRIAS LTDA\.?|ADMINISTRADORA DO IMÓVEL|BRASILCAP CAPITALIZAÇÃO S\.A\.?|LOFT SOLUÇÕES FINANCEIRAS S[./]A\.?|LOCATÁRIO\(A\)|LOCADOR\(A\)|LOCATÁRIO|LOCADOR|FIADOR|CONTRATANTE|CONTRATADA|OUTORGANTE|OUTORGADA|INTERMEDIÁRIA)/;

type Palavra = { texto: string; negrito: boolean };

function palavras(f: Folha, texto: string): Palavra[][] {
  const res: Palavra[] = [];
  for (const parte of f.t(texto).split(new RegExp(DESTAQUES.source, "g"))) {
    if (!parte) continue;
    const negrito = new RegExp(`^${DESTAQUES.source}$`).test(parte);
    // pontuação colada a um termo em negrito continua junto da palavra
    const pedacos = parte.split(/(\s+)/);
    for (const p of pedacos) {
      if (!p) continue;
      if (/^\s+$/.test(p)) res.push({ texto: " ", negrito: false });
      else res.push({ texto: p, negrito });
    }
  }
  // junta sequências sem espaço entre si numa "palavra" visual
  const visuais: Palavra[][] = [];
  let atual: Palavra[] = [];
  for (const p of res) {
    if (p.texto === " ") {
      if (atual.length) visuais.push(atual);
      atual = [];
    } else atual.push(p);
  }
  if (atual.length) visuais.push(atual);
  return visuais;
}

/** Parágrafo justificado com termos em negrito. */
function paragrafoRico(f: Folha, texto: string, o: { tamanho?: number; recuo?: number; depois?: number; centro?: boolean } = {}) {
  const tamanho = o.tamanho ?? 9;
  const entrelinha = tamanho * 1.5;
  const x0 = MARGEM_X + (o.recuo ?? 0);
  const largura = LARGURA - (o.recuo ?? 0);
  const fonte = (n: boolean): PDFFont => (n ? f.negrito : f.normal);
  const grupos = palavras(f, texto);
  const larguraGrupo = (g: Palavra[]) => g.reduce((s, p) => s + fonte(p.negrito).widthOfTextAtSize(p.texto, tamanho), 0);
  const espaco = f.normal.widthOfTextAtSize(" ", tamanho);

  const linhas: Palavra[][][] = [];
  let linha: Palavra[][] = [];
  let ocupada = 0;
  for (const g of grupos) {
    const w = larguraGrupo(g);
    if (linha.length && ocupada + espaco + w > largura) {
      linhas.push(linha);
      linha = [];
      ocupada = 0;
    }
    ocupada += (linha.length ? espaco : 0) + w;
    linha.push(g);
  }
  if (linha.length) linhas.push(linha);

  linhas.forEach((l, i) => {
    f.garantir(entrelinha);
    const ultima = i === linhas.length - 1;
    const total = l.reduce((s, g) => s + larguraGrupo(g), 0);
    const folga = !ultima && !o.centro && l.length > 1 ? (largura - total) / (l.length - 1) : espaco;
    let x = o.centro ? MARGEM_X + (LARGURA - (total + espaco * (l.length - 1))) / 2 : x0;
    for (const g of l) {
      for (const p of g) {
        f.pagina.drawText(p.texto, { x, y: f.y - tamanho, size: tamanho, font: fonte(p.negrito), color: COR.tinta });
        x += fonte(p.negrito).widthOfTextAtSize(p.texto, tamanho);
      }
      x += folga;
    }
    f.y -= entrelinha;
  });
  f.y -= o.depois ?? 5;
}

function quadro(f: Folha, q: Quadro) {
  f.faixa(q.titulo, 60);
  const L2 = [118, LARGURA - 118];
  const meio = (LARGURA - 118 - 80) / 2;
  const L4 = [118, meio, 80, meio];
  for (const l of q.linhas) {
    const destaque = l[0] === "Nome:";
    if (l.length === 2) f.linha([rot(l[0]), val(l[1], destaque)], L2);
    else f.linha([rot(l[0]), val(l[1]), rot(l[2]), val(l[3])], L4);
  }
  f.y -= 12;
}

function assinaturas(f: Folha, lista: { nome: string; papel: string }[]) {
  const coluna = (LARGURA - 40) / 2;
  for (let i = 0; i < lista.length; i += 2) {
    f.garantir(78);
    f.y -= 42;
    lista.slice(i, i + 2).forEach((a, k) => {
      const x = MARGEM_X + k * (coluna + 40);
      f.pagina.drawLine({ start: { x, y: f.y }, end: { x: x + coluna, y: f.y }, thickness: 0.6, color: COR.tinta });
      const nome = f.quebrar(a.nome, f.negrito, 8.5, coluna);
      let y = f.y - 11;
      for (const n of nome) {
        f.escrever(n, x + coluna / 2, y, { fonte: f.negrito, tamanho: 8.5, alinhar: "centro" });
        y -= 11;
      }
      f.escrever(a.papel, x + coluna / 2, y, { tamanho: 8.5, cor: COR.cinza, alinhar: "centro" });
    });
    f.y -= 36;
  }
}

function marca(f: Folha, texto: string | null | undefined) {
  if (!texto) return;
  for (const p of f.doc.getPages())
    p.drawText(texto, { x: 120, y: 300, size: 90, font: f.negrito, color: COR.separador, opacity: 0.35, rotate: { type: "degrees", angle: 35 } as never });
}

export async function gerarPdfContrato(doc: Documento, o: OpcoesPdfContrato): Promise<Uint8Array> {
  const f = new Folha(122, 104);
  await f.iniciar({ timbrado: o.timbrado, fontes: o.fontes, assinaturas: [], marcaDagua: null });

  for (const t of f.quebrar(doc.titulo, f.negrito, 12, LARGURA - 40)) {
    f.escrever(t, A4.largura / 2, f.y - 12, { fonte: f.negrito, tamanho: 12, alinhar: "centro" });
    f.y -= 16;
  }
  f.y -= 16;

  for (const q of doc.quadros) quadro(f, q);
  for (const p of doc.preambulo) paragrafoRico(f, p, { depois: 7 });
  f.y -= 6;

  for (const c of doc.clausulas) {
    f.faixa(c.titulo, 40);
    f.y -= 6;
    for (const p of c.paragrafos) paragrafoRico(f, p, { recuo: /^[a-e]\)/.test(p) ? 14 : 0 });
    f.y -= 6;
  }

  paragrafoRico(f, doc.fecho, { depois: 10 });
  f.garantir(30);
  paragrafoRico(f, doc.localData, { depois: 6 });
  assinaturas(f, doc.assinaturas);

  if (doc.anexo) {
    f.novaPagina();
    f.escrever(doc.anexo.titulo, A4.largura / 2, f.y - 12, { fonte: f.negrito, tamanho: 11.5, alinhar: "centro" });
    f.y -= 34;
    for (const s of doc.anexo.secoes) {
      if (s.titulo) {
        f.faixa(s.titulo, 40);
        f.y -= 6;
      }
      for (const p of s.paragrafos) paragrafoRico(f, p);
      f.y -= 6;
    }
    paragrafoRico(f, doc.anexo.localData, { depois: 6 });
    assinaturas(f, doc.anexo.assinaturas);
  }

  marca(f, o.marcaDagua);
  return f.doc.save();
}
