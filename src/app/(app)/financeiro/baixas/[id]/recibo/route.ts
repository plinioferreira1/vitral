import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";

function brl(v: number): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataLonga(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function wrapText(texto: string, font: PDFFont, size: number, maxWidth: number) {
  const palavras = texto.split(/\s+/);
  const linhas: string[] = [];
  let linha = "";

  for (const palavra of palavras) {
    const tentativa = linha ? `${linha} ${palavra}` : palavra;
    if (font.widthOfTextAtSize(tentativa, size) <= maxWidth) {
      linha = tentativa;
    } else {
      if (linha) linhas.push(linha);
      linha = palavra;
    }
  }
  if (linha) linhas.push(linha);
  return linhas;
}

type BaixaRecibo = {
  id: string;
  valor: number;
  data: string;
  recibo_emitido_para: string | null;
  recibo_documento: string | null;
  financeiro_lancamentos: {
    descricao: string;
    tipo: string;
    financeiro_pessoas: { nome: string; cpf_cnpj: string | null } | null;
  } | null;
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("financeiro_baixas")
    .select(
      "id, valor, data, recibo_emitido_para, recibo_documento, financeiro_lancamentos ( descricao, tipo, financeiro_pessoas ( nome, cpf_cnpj ) )"
    )
    .eq("id", id)
    .single();

  if (!data) return new Response("Recibo não encontrado.", { status: 404 });
  const baixa = data as unknown as BaixaRecibo;
  const lancamento = baixa.financeiro_lancamentos;
  if (!lancamento) return new Response("Lançamento não encontrado.", { status: 404 });

  const favorecido = baixa.recibo_emitido_para || lancamento.financeiro_pessoas?.nome || "Favorecido";
  const documento = baixa.recibo_documento || lancamento.financeiro_pessoas?.cpf_cnpj || "";

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = page.getWidth();
  const margin = 54;
  const brand = rgb(0.45, 0.08, 0.08);
  const ink = rgb(0.12, 0.1, 0.09);
  const muted = rgb(0.42, 0.39, 0.36);

  page.drawLine({ start: { x: margin, y: 782 }, end: { x: width - margin, y: 782 }, thickness: 1.4, color: ink });
  // Logo da Sacra (arquivo em /public/brand). Se não carregar, cai no nome escrito.
  const logoLargura = 160;
  let textoX = 150;
  try {
    const resposta = await fetch(new URL("/brand/sacra-logo-bordo.png", request.url));
    if (!resposta.ok) throw new Error("logo indisponível");
    const logo = await pdf.embedPng(await resposta.arrayBuffer());
    const logoAltura = (logo.height / logo.width) * logoLargura;
    page.drawImage(logo, { x: margin, y: 716 - logoAltura / 2, width: logoLargura, height: logoAltura });
    textoX = margin + logoLargura + 24;
  } catch {
    page.drawText("SACRA", { x: margin, y: 718, size: 20, font: bold, color: brand });
    page.drawText("netimóveis", { x: margin, y: 700, size: 10, font: bold, color: rgb(0.85, 0.42, 0.13) });
  }

  const dadosEmpresa = [
    "SACRA SOLUÇÕES IMOBILIÁRIAS LTDA",
    "CNPJ/CPF: 30.577.408/0001-91   IE: 0786108400176",
    "EPTG CHÁCARA 68 LOJA, 01, Brasília - DF",
    "CEP: 72005-350",
  ];
  dadosEmpresa.forEach((linha, index) => {
    page.drawText(linha, { x: textoX, y: 738 - index * 16, size: 10, font, color: muted });
  });
  page.drawLine({ start: { x: margin, y: 650 }, end: { x: width - margin, y: 650 }, thickness: 1.4, color: ink });

  page.drawText("Recibo", { x: margin, y: 592, size: 28, font: bold, color: ink });
  const valor = brl(baixa.valor);
  page.drawText(valor, {
    x: width - margin - bold.widthOfTextAtSize(valor, 26),
    y: 592,
    size: 26,
    font,
    color: muted,
  });
  page.drawLine({
    start: { x: margin, y: 562 },
    end: { x: width - margin, y: 562 },
    thickness: 1,
    color: muted,
    dashArray: [5, 5],
  });

  const texto = `Recebi de SACRA SOLUÇÕES IMOBILIÁRIAS LTDA a importância de ${valor} referente ao pagamento de ${lancamento.descricao}.`;
  let y = 505;
  wrapText(texto, font, 13, width - margin * 2).forEach((linha) => {
    page.drawText(linha, { x: margin + 8, y, size: 13, font, color: ink });
    y -= 18;
  });

  y -= 18;
  const confirmacao =
    "Para confirmar a veracidade deste documento e da quantia paga, assino neste documento firmando o presente recibo nesta data.";
  wrapText(confirmacao, font, 13, width - margin * 2).forEach((linha) => {
    page.drawText(linha, { x: margin + 8, y, size: 13, font, color: ink });
    y -= 18;
  });

  const localData = `Brasília (DF), ${dataLonga(baixa.data)}`;
  page.drawText(localData, {
    x: width / 2 - font.widthOfTextAtSize(localData, 12) / 2,
    y: 330,
    size: 12,
    font,
    color: ink,
  });

  page.drawLine({ start: { x: 130, y: 250 }, end: { x: width - 130, y: 250 }, thickness: 1, color: ink });
  page.drawText(favorecido.toUpperCase(), {
    x: width / 2 - font.widthOfTextAtSize(favorecido.toUpperCase(), 12) / 2,
    y: 226,
    size: 12,
    font,
    color: ink,
  });
  if (documento) {
    const docTexto = `CNPJ/CPF: ${documento}`;
    page.drawText(docTexto, {
      x: width / 2 - font.widthOfTextAtSize(docTexto, 12) / 2,
      y: 198,
      size: 12,
      font,
      color: ink,
    });
  }

  const pdfBytes = await pdf.save();
  return new Response(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${id}.pdf"`,
    },
  });
}
