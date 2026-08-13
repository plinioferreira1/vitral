// Gera a memória de cálculo da avaliação de imóvel em PNG.

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function brl(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface ComparavelMemoria {
  endereco: string;
  area: number;
  fonte: string;
  valorPesquisado: number;
  fatorCalibragem: number;
  valorM2: number;
}

export interface DadosMemoriaAvaliacao {
  areaImovel: number;
  comparaveis: ComparavelMemoria[];
  mediaM2: number;
  valorSugerido: number;
}

export async function gerarMemoriaAvaliacaoPNG(dados: DadosMemoriaAvaliacao) {
  const largura = 700;
  const margem = 32;
  const xEsq = margem + 32;
  const xDir = largura - margem - 32;
  const escala = 2;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const alturaLinha = 20;
  const alturaPorComparavel = 60;
  const topoComparaveis = 220;
  const alturaComparaveis = dados.comparaveis.length * alturaPorComparavel;
  const gapAteResultado = 40;
  const alturaBoxResultado = 90;
  const espacoAposRodape = 40;

  const yResultado = topoComparaveis + alturaComparaveis + gapAteResultado;
  const alturaTotal = yResultado + alturaBoxResultado + espacoAposRodape + margem;

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
    const logoAltura = 36;
    const logoLargura = (logo.width / logo.height) * logoAltura;
    ctx.drawImage(logo, xEsq, margem + 30, logoLargura, logoAltura);
  } catch {
    ctx.fillStyle = "#731515";
    ctx.font = "700 20px Arial, sans-serif";
    ctx.fillText("SACRA NETIMÓVEIS", xEsq, margem + 54);
  }

  // título
  ctx.fillStyle = "#1c1917";
  ctx.font = "700 22px Arial, sans-serif";
  ctx.fillText("Memória de Cálculo — Avaliação de Imóvel", xEsq, margem + 110);
  ctx.fillStyle = "#78716c";
  ctx.font = "400 12px Arial, sans-serif";
  ctx.fillText(`Área do imóvel avaliando: ${dados.areaImovel} m²`, xEsq, margem + 130);

  // separador
  ctx.beginPath();
  ctx.moveTo(xEsq, margem + 150);
  ctx.lineTo(xDir, margem + 150);
  ctx.strokeStyle = "#e7e5e4";
  ctx.stroke();

  ctx.fillStyle = "#44403c";
  ctx.font = "600 12px Arial, sans-serif";
  ctx.fillText("COMPARÁVEIS UTILIZADOS", xEsq, margem + 178);

  // comparáveis
  let y = topoComparaveis;
  dados.comparaveis.forEach((c, i) => {
    ctx.fillStyle = "#1c1917";
    ctx.font = "600 13px Arial, sans-serif";
    ctx.fillText(`${i + 1}. ${c.endereco}`, xEsq, y);

    ctx.fillStyle = "#78716c";
    ctx.font = "400 12px Arial, sans-serif";
    ctx.fillText(`${c.fonte} · ${c.area} m² · ${brl(c.valorPesquisado)}`, xEsq, y + alturaLinha);

    if (c.fatorCalibragem > 0) {
      ctx.fillText(`Calibragem: +${brl(c.fatorCalibragem)}`, xEsq, y + alturaLinha * 2);
    }

    ctx.fillStyle = "#1c1917";
    ctx.font = "600 12px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${brl(c.valorM2)}/m²`, xDir, y);
    ctx.textAlign = "left";

    y += alturaPorComparavel;
  });

  // resultado em destaque
  ctx.fillStyle = "#fdf4e7";
  ctx.beginPath();
  const raioResultado = 14;
  ctx.moveTo(xEsq + raioResultado, yResultado);
  ctx.arcTo(xDir, yResultado, xDir, yResultado + alturaBoxResultado, raioResultado);
  ctx.arcTo(xDir, yResultado + alturaBoxResultado, xEsq, yResultado + alturaBoxResultado, raioResultado);
  ctx.arcTo(xEsq, yResultado + alturaBoxResultado, xEsq, yResultado, raioResultado);
  ctx.arcTo(xEsq, yResultado, xDir, yResultado, raioResultado);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#92400e";
  ctx.font = "600 12px Arial, sans-serif";
  ctx.fillText("VALOR DE ANÚNCIO SUGERIDO", xEsq + 20, yResultado + 26);
  ctx.fillStyle = "#731515";
  ctx.font = "700 28px Arial, sans-serif";
  ctx.fillText(brl(dados.valorSugerido), xEsq + 20, yResultado + 55);
  ctx.fillStyle = "#a16207";
  ctx.font = "400 11px Arial, sans-serif";
  ctx.fillText(
    `Média de mercado: ${brl(dados.mediaM2)}/m² × ${dados.areaImovel} m²`,
    xEsq + 20,
    yResultado + 74
  );

  // rodapé
  ctx.fillStyle = "#a8a29e";
  ctx.font = "400 11px Arial, sans-serif";
  ctx.fillText("Gerado pelo Vitral — Sacra Netimóveis.", xEsq, alturaTotal - margem - 20);

  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  link.download = `avaliacao-imovel-${Date.now()}.png`;
  link.click();
}
