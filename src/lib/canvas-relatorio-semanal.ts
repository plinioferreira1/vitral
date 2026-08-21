// Gera o relatório semanal (atrasados + vencendo) em PNG.

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export interface ItemRelatorio {
  categoria: "Venda" | "Financiamento";
  imovel: string;
  cliente: string;
  etapaAtual: string;
  prazoTexto: string; // "atrasada há 5 dias" / "vence em 3 dias" / "vence hoje"
}

export interface DadosRelatorioSemanal {
  dataLabel: string;
  totalAtivosVenda: number;
  totalAtivosFinanciamento: number;
  atrasados: ItemRelatorio[];
  vencendo: ItemRelatorio[];
}

function medirLinhas(ctx: CanvasRenderingContext2D, texto: string, larguraMax: number): string[] {
  const palavras = texto.split(" ");
  const linhas: string[] = [];
  let linhaAtual = "";
  for (const palavra of palavras) {
    const teste = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;
    if (ctx.measureText(teste).width > larguraMax && linhaAtual) {
      linhas.push(linhaAtual);
      linhaAtual = palavra;
    } else {
      linhaAtual = teste;
    }
  }
  if (linhaAtual) linhas.push(linhaAtual);
  return linhas;
}

export async function gerarRelatorioSemanalPNG(dados: DadosRelatorioSemanal) {
  const largura = 700;
  const margem = 32;
  const xEsq = margem + 32;
  const xDir = largura - margem - 32;
  const escala = 2;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // pré-mede a altura de cada seção
  ctx.font = "400 13px Arial, sans-serif";
  const larguraTexto = xDir - xEsq - 20;

  function alturaLista(itens: ItemRelatorio[]): number {
    let altura = 0;
    itens.forEach((item) => {
      const linhas = medirLinhas(
        ctx!,
        `[${item.categoria}] ${item.imovel} — ${item.cliente} — ${item.etapaAtual}`,
        larguraTexto
      );
      altura += 20 * linhas.length + 22; // linhas + linha do prazo + espaço
    });
    return altura;
  }

  const topoConteudo = 240;
  const alturaAtrasados = dados.atrasados.length > 0 ? 34 + alturaLista(dados.atrasados) + 16 : 0;
  const alturaVencendo = dados.vencendo.length > 0 ? 34 + alturaLista(dados.vencendo) + 16 : 0;
  const alturaVazio = dados.atrasados.length === 0 && dados.vencendo.length === 0 ? 50 : 0;
  const alturaTotal = topoConteudo + alturaAtrasados + alturaVencendo + alturaVazio + 60;

  canvas.width = largura * escala;
  canvas.height = alturaTotal * escala;
  ctx.scale(escala, escala);

  // fundo
  ctx.fillStyle = "#fafaf9";
  ctx.fillRect(0, 0, largura, alturaTotal);

  // cartão
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#e7e5e4";
  const raio = 20;
  ctx.beginPath();
  ctx.moveTo(margem + raio, margem);
  ctx.arcTo(largura - margem, margem, largura - margem, alturaTotal - margem, raio);
  ctx.arcTo(largura - margem, alturaTotal - margem, margem, alturaTotal - margem, raio);
  ctx.arcTo(margem, alturaTotal - margem, margem, margem, raio);
  ctx.arcTo(margem, margem, largura - margem, margem, raio);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // logo
  try {
    const logo = await carregarImagem("/brand/sacra-logo-bordo.png");
    const logoAltura = 34;
    const logoLargura = (logo.width / logo.height) * logoAltura;
    ctx.drawImage(logo, xEsq, margem + 28, logoLargura, logoAltura);
  } catch {
    ctx.fillStyle = "#731515";
    ctx.font = "700 20px Arial, sans-serif";
    ctx.fillText("SACRA NETIMÓVEIS", xEsq, margem + 50);
  }

  // título
  ctx.fillStyle = "#1c1917";
  ctx.font = "700 21px Arial, sans-serif";
  ctx.fillText("Relatório Semanal — Vendas e Financiamentos", xEsq, margem + 104);
  ctx.fillStyle = "#78716c";
  ctx.font = "400 12px Arial, sans-serif";
  ctx.fillText(dados.dataLabel, xEsq, margem + 124);

  // separador
  ctx.beginPath();
  ctx.moveTo(xEsq, margem + 144);
  ctx.lineTo(xDir, margem + 144);
  ctx.strokeStyle = "#e7e5e4";
  ctx.stroke();

  // panorama
  ctx.fillStyle = "#44403c";
  ctx.font = "600 12px Arial, sans-serif";
  ctx.fillText("PANORAMA", xEsq, margem + 168);

  ctx.fillStyle = "#1c1917";
  ctx.font = "400 13px Arial, sans-serif";
  ctx.fillText(
    `${dados.totalAtivosVenda} ativos em Vendas · ${dados.totalAtivosFinanciamento} ativos em Financiamentos`,
    xEsq,
    margem + 188
  );
  ctx.fillText(
    `${dados.atrasados.length} atrasado${dados.atrasados.length !== 1 ? "s" : ""} · ${dados.vencendo.length} vencendo essa semana`,
    xEsq,
    margem + 206
  );

  let y = topoConteudo;

  function desenharLista(titulo: string, cor: string, itens: ItemRelatorio[]) {
    if (itens.length === 0) return;
    ctx!.fillStyle = cor;
    ctx!.font = "700 13px Arial, sans-serif";
    ctx!.fillText(titulo, xEsq, y);
    y += 22;

    itens.forEach((item) => {
      ctx!.fillStyle = "#1c1917";
      ctx!.font = "600 13px Arial, sans-serif";
      const linhas = medirLinhas(
        ctx!,
        `[${item.categoria}] ${item.imovel} — ${item.cliente} — ${item.etapaAtual}`,
        larguraTexto
      );
      linhas.forEach((linha, i) => {
        ctx!.fillText(linha, xEsq, y + i * 20);
      });
      y += 20 * linhas.length;

      ctx!.fillStyle = cor;
      ctx!.font = "400 12px Arial, sans-serif";
      ctx!.fillText(item.prazoTexto, xEsq, y);
      y += 22;
    });
    y += 8;
  }

  desenharLista("🔴 ATRASADOS", "#be123c", dados.atrasados);
  desenharLista("🟡 VENCENDO EM BREVE", "#b45309", dados.vencendo);

  if (dados.atrasados.length === 0 && dados.vencendo.length === 0) {
    ctx.fillStyle = "#16a34a";
    ctx.font = "600 13px Arial, sans-serif";
    ctx.fillText("Tudo em dia — nenhum atraso ou vencimento próximo. ✅", xEsq, y);
  }

  // rodapé
  ctx.fillStyle = "#a8a29e";
  ctx.font = "400 11px Arial, sans-serif";
  ctx.fillText("Gerado pelo Vitral — Sacra Netimóveis.", xEsq, alturaTotal - margem - 15);

  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-semanal-${Date.now()}.png`;
  link.click();
}
