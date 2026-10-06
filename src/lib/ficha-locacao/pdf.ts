import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { ACEITE, DECLARACAO, ROTULO_TIPO, secoesVisiveis, valorExibido, type DadosFicha, type TipoLocatario } from "./campos";

/** A fonte padrão do PDF só desenha o alfabeto latino; o resto (emoji etc.) é retirado. */
const FORA_DA_FONTE = /[^\s\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026]/g;

export type EntradaPdfFicha = {
  proponente: string | null;
  imovel: string | null;
  tipo: TipoLocatario;
  dados: DadosFicha;
  /** só para fiador e corresponsável: a proposta a que a ficha está ligada */
  titular: { nome: string; garantia: string } | null;
  documentos: { nome_arquivo: string; tipo: string }[];
  /** imagem PNG em data URL */
  assinatura: string | null;
  concluidoEm: string;
  ip: string | null;
};

/** PDF da ficha concluída: dados informados, documentos, declaração e assinatura. */
export async function gerarPdfFicha(entrada: EntradaPdfFicha): Promise<Uint8Array> {
  const documentos = entrada.documentos;
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 48, usable = W - M * 2;
  let page: PDFPage = pdf.addPage([W, H]), y = H - M;
  const borda = rgb(0.88, 0.86, 0.83), vinho = rgb(0.45, 0.08, 0.08), dourado = rgb(0.72, 0.49, 0.16), texto = rgb(0.12, 0.11, 0.1), cinza = rgb(0.43, 0.4, 0.38);
  function nova(altura = 30) { if (y - altura < M) { page = pdf.addPage([W, H]); y = H - M; } }
  function linhas(valor: string, font: PDFFont, size: number, largura = usable) { const palavras = valor.replace(FORA_DA_FONTE, "").replace(/\s+/g, " ").trim().split(" "); const out: string[] = []; let atual = ""; for (const p of palavras) { const teste = atual ? `${atual} ${p}` : p; if (font.widthOfTextAtSize(teste, size) > largura && atual) { out.push(atual); atual = p; } else atual = teste; } if (atual) out.push(atual); return out; }
  function textoPdf(valor: string, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; gap?: number; largura?: number } = {}) { const size = opts.size ?? 9.5, font = opts.font ?? regular; const ls = linhas(valor, font, size, opts.largura); for (const l of ls) { nova(size + 5); page.drawText(l, { x: M, y, size, font, color: opts.color ?? texto }); y -= size + 4; } y -= opts.gap ?? 3; }
  function titulo(valor: string) { const ls = linhas(valor.toUpperCase(), bold, 9); nova(70 + ls.length * 12); y -= 6; for (const l of ls) { page.drawText(l, { x: M, y, size: 9, font: bold, color: vinho }); y -= 12; } page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.7, color: borda }); y -= 14; }
  function campo(label: string, valor: unknown) { if (valor === "" || valor === null || valor === undefined || valor === false) return; nova(34); page.drawText(label, { x: M, y, size: 7.5, font: bold, color: cinza }); y -= 11; textoPdf(typeof valor === "boolean" ? "Sim" : String(valor), { size: 9.5, gap: 7 }); }

  /** Campos em duas colunas; os marcados como largos ocupam a linha inteira. */
  function grade(itens: { rotulo: string; valor: string; larga: boolean }[]) {
    const col = (usable - 20) / 2;
    const filas: (typeof itens)[] = [];
    for (const item of itens) { const ultima = filas.at(-1); if (!item.larga && ultima && ultima.length === 1 && !ultima[0].larga) ultima.push(item); else filas.push([item]); }
    for (const fila of filas) {
      const blocos = fila.map((item) => linhas(item.valor, regular, 9.5, item.larga ? usable : col));
      const altura = 11 + Math.max(...blocos.map((b) => b.length)) * 13.5 + 7;
      nova(altura);
      fila.forEach((item, i) => {
        const x = M + i * (col + 20);
        page.drawText(item.rotulo, { x, y, size: 7.5, font: bold, color: cinza });
        blocos[i].forEach((l, n) => page.drawText(l, { x, y: y - 11 - n * 13.5, size: 9.5, font: regular, color: texto }));
      });
      y -= altura;
    }
  }

  page.drawRectangle({ x: 0, y: H - 9, width: W, height: 9, color: vinho });
  page.drawText("SACRA", { x: M, y, size: 21, font: bold, color: vinho });
  page.drawText("NETIMÓVEIS", { x: M, y: y - 13, size: 7.5, font: bold, color: dourado });
  page.drawText("FICHA CADASTRAL DE LOCAÇÃO", { x: W - M - 205, y: y - 2, size: 11, font: bold, color: vinho });
  y -= 48;
  const tipo = entrada.tipo;
  const dados = entrada.dados;
  campo("Proponente", entrada.proponente); campo("Tipo de locatário", ROTULO_TIPO[tipo]); campo("Imóvel", entrada.imovel);
  if (entrada.titular) { campo("Titular da locação", entrada.titular.nome); campo("Garantia da proposta", entrada.titular.garantia); }
  for (const s of secoesVisiveis(dados, tipo)) {
    const preenchidos = s.campos.filter((c) => valorExibido(c, dados) !== "");
    if (preenchidos.length === 0) continue;
    titulo(s.titulo);
    grade(preenchidos.map((c) => ({ rotulo: c.rotulo, valor: valorExibido(c, dados), larga: !!c.larga })));
  }
  titulo("Documentos apresentados"); if (!documentos.length) textoPdf("Nenhum documento anexado.", { color: cinza }); else for (const d of documentos) textoPdf(`• ${d.nome_arquivo} — ${d.tipo}`, { size: 8.5 });
  for (const bloco of DECLARACAO) {
    titulo(bloco.titulo);
    for (const p of bloco.paragrafos) textoPdf(p.destaque ? `${p.destaque} ${p.texto}` : p.texto, { size: 8.5, gap: 5 });
  }
  nova(150); y -= 4;
  textoPdf(ACEITE, { size: 9, font: bold, gap: 14 });
  if (entrada.assinatura) { try { nova(125); const bytes = Uint8Array.from(Buffer.from(String(entrada.assinatura).split(",")[1] ?? "", "base64")); const img = await pdf.embedPng(bytes); const w = 180, h = Math.min(90, img.height / img.width * w); page.drawImage(img, { x: M, y: y - h, width: w, height: h }); y -= h + 4; } catch {} }
  nova(45); page.drawLine({ start: { x: M, y }, end: { x: M + 230, y }, thickness: 0.7, color: cinza }); y -= 14; textoPdf(String(dados.nome_completo ?? entrada.proponente ?? "Proponente"), { font: bold, size: 9, gap: 1 });
  textoPdf(`Assinado eletronicamente em ${new Date(entrada.concluidoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}${entrada.ip ? ` · IP ${entrada.ip}` : ""}`, { size: 7.5, color: cinza });
  return pdf.save();
}
