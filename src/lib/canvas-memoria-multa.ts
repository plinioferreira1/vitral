// Gera a memória de cálculo completa da multa rescisória em PNG,
// pronta pra mandar pro cliente/corretor.

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export interface DadosMemoriaMulta {
  aluguel: number;
  meses: number;
  inicio: string; // dd/mm/aaaa
  fim: string;
  rescisao: string;
  multaTotal: number;
  mesesTotais: number;
  mesesRestantes: number;
  multaProporcional: number;
}

function brl(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function gerarMemoriaMultaPNG(dados: DadosMemoriaMulta) {
  const largura = 640;
  const margem = 32;
  const xEsq = margem + 32;
  const xDir = largura - margem - 32;
  const escala = 2;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const linhas: { label: string; valor: string; destaque?: boolean }[] = [
    { label: "Valor do aluguel", valor: brl(dados.aluguel) },
    { label: "Multa contratual (cheia)", valor: `${dados.meses} mês(es) de aluguel = ${brl(dados.multaTotal)}` },
    { label: "Início do contrato", valor: dados.inicio },
    { label: "Término do contrato", valor: dados.fim },
    { label: "Data da rescisão", valor: dados.rescisao },
    { label: "Meses totais do contrato", valor: `${dados.mesesTotais.toFixed(1)} meses` },
    { label: "Meses restantes na rescisão", valor: `${dados.mesesRestantes.toFixed(1)} meses` },
  ];

  const alturaLinha = 34;
  const topoLinhas = 210;
  const gapAntesFormula = 4;
  const gapFormulaAteBox = 30;
  const alturaBoxResultado = 78;
  const gapBoxAteRodape = 45;
  const espacoAposRodape = 28; // até a borda inferior do cartão

  const yFimLinhas = topoLinhas + linhas.length * alturaLinha;
  const yBox = yFimLinhas + gapAntesFormula + gapFormulaAteBox;
  const yRodape = yBox + alturaBoxResultado + gapBoxAteRodape;
  const alturaTotal = yRodape + espacoAposRodape + margem;

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
  ctx.fillText("Memória de Cálculo — Multa Rescisória", xEsq, margem + 110);
  ctx.fillStyle = "#78716c";
  ctx.font = "400 12px Arial, sans-serif";
  ctx.fillText("Art. 4º da Lei do Inquilinato (Lei 8.245/91)", xEsq, margem + 130);

  // separador
  ctx.beginPath();
  ctx.moveTo(xEsq, margem + 150);
  ctx.lineTo(xDir, margem + 150);
  ctx.strokeStyle = "#e7e5e4";
  ctx.stroke();

  // linhas de dados
  let y = topoLinhas;
  linhas.forEach((linha) => {
    ctx.fillStyle = "#78716c";
    ctx.font = "400 13px Arial, sans-serif";
    ctx.fillText(linha.label, xEsq, y);

    ctx.fillStyle = "#1c1917";
    ctx.font = "600 13px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(linha.valor, xDir, y);
    ctx.textAlign = "left";

    y += alturaLinha;
  });

  // fórmula
  y += gapAntesFormula;
  ctx.fillStyle = "#a8a29e";
  ctx.font = "italic 11px Arial, sans-serif";
  ctx.fillText("multa proporcional = multa cheia × (meses restantes ÷ meses totais)", xEsq, y);

  // resultado em destaque
  ctx.fillStyle = "#fdf4e7";
  ctx.beginPath();
  const raioResultado = 14;
  ctx.moveTo(xEsq + raioResultado, yBox);
  ctx.arcTo(xDir, yBox, xDir, yBox + alturaBoxResultado, raioResultado);
  ctx.arcTo(xDir, yBox + alturaBoxResultado, xEsq, yBox + alturaBoxResultado, raioResultado);
  ctx.arcTo(xEsq, yBox + alturaBoxResultado, xEsq, yBox, raioResultado);
  ctx.arcTo(xEsq, yBox, xDir, yBox, raioResultado);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#92400e";
  ctx.font = "600 12px Arial, sans-serif";
  ctx.fillText("MULTA PROPORCIONAL", xEsq + 20, yBox + 24);
  ctx.fillStyle = "#731515";
  ctx.font = "700 30px Arial, sans-serif";
  ctx.fillText(brl(dados.multaProporcional), xEsq + 20, yBox + 58);

  // rodapé
  ctx.fillStyle = "#78716c";
  ctx.font = "400 11px Arial, sans-serif";
  ctx.fillText("Cálculo gerado eletronicamente pelo Vitral — Sacra Netimóveis.", xEsq, yRodape);

  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  link.download = `memoria-multa-rescisoria-${Date.now()}.png`;
  link.click();
}
