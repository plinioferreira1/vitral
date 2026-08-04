// Gera um certificado em PNG pra um documento assinado digitalmente:
// cabeçalho com logo, texto legal completo (com quebra de linha
// automática), e a(s) assinatura(s) com nome/data/IP — pronto pra
// baixar e subir num CRM ou mandar pro cliente.

export interface AssinaturaCertificado {
  titulo: string; // ex: "Proprietário 1" ou "Cliente"
  nome: string;
  documento?: string; // CPF/RG, se houver
  assinaturaImagem: string; // data URL PNG
  assinadoEm: string; // ISO
  ip?: string | null;
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function medirLinhas(
  ctx: CanvasRenderingContext2D,
  texto: string,
  larguraMax: number
): string[] {
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

export async function gerarCertificadoPNG(opcoes: {
  titulo: string;
  subtitulo?: string;
  paragrafos: string[];
  assinaturas: AssinaturaCertificado[];
  nomeArquivo: string;
}) {
  const largura = 1000;
  const margem = 40;
  const xEsq = margem + 40;
  const xDir = largura - margem - 40;
  const larguraTexto = xDir - xEsq;
  const escala = 2;

  const canvas = document.createElement("canvas");
  canvas.width = largura * escala;
  canvas.height = 100;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(escala, escala);

  // mede o texto todo antes de saber a altura final do card
  ctx.font = "400 13px Arial, sans-serif";
  const paragrafosComQuebra = opcoes.paragrafos.map((p) => medirLinhas(ctx, p, larguraTexto));
  const alturaParagrafos = paragrafosComQuebra.reduce((soma, linhas) => soma + linhas.length * 18 + 10, 0);

  const alturaPorAssinatura = 90;
  const alturaAssinaturas = opcoes.assinaturas.length * alturaPorAssinatura;

  const topoTexto = opcoes.subtitulo ? 195 : 165;
  const alturaTotal = topoTexto + alturaParagrafos + 30 + alturaAssinaturas + 60;

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

  // logo (se falhar, cai no texto)
  try {
    const logo = await carregarImagem("/brand/sacra-logo-bordo.png");
    const logoAltura = 40;
    const logoLargura = (logo.width / logo.height) * logoAltura;
    ctx.drawImage(logo, xEsq, margem + 36, logoLargura, logoAltura);
  } catch {
    ctx.fillStyle = "#731515";
    ctx.font = "700 22px Arial, sans-serif";
    ctx.fillText("SACRA NETIMÓVEIS", xEsq, margem + 62);
  }

  // título
  ctx.fillStyle = "#1c1917";
  ctx.font = "700 24px Arial, sans-serif";
  ctx.fillText(opcoes.titulo, xEsq, margem + 128);

  if (opcoes.subtitulo) {
    ctx.fillStyle = "#78716c";
    ctx.font = "400 14px Arial, sans-serif";
    ctx.fillText(opcoes.subtitulo, xEsq, margem + 152);
  }

  // parágrafos
  let y = topoTexto;
  ctx.fillStyle = "#1c1917";
  ctx.font = "400 13px Arial, sans-serif";
  paragrafosComQuebra.forEach((linhas) => {
    linhas.forEach((linha, i) => {
      ctx.fillText(linha, xEsq, y + i * 18);
    });
    y += linhas.length * 18 + 10;
  });

  // linha separadora antes das assinaturas
  y += 10;
  ctx.beginPath();
  ctx.moveTo(xEsq, y);
  ctx.lineTo(xDir, y);
  ctx.strokeStyle = "#e7e5e4";
  ctx.stroke();
  y += 30;

  for (const assinatura of opcoes.assinaturas) {
    ctx.fillStyle = "#78716c";
    ctx.font = "600 12px Arial, sans-serif";
    ctx.fillText(assinatura.titulo.toUpperCase(), xEsq, y);

    ctx.fillStyle = "#1c1917";
    ctx.font = "400 13px Arial, sans-serif";
    const dataFormatada = new Date(assinatura.assinadoEm).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
    const linhaInfo = `${assinatura.nome}${assinatura.documento ? " · " + assinatura.documento : ""} · assinado em ${dataFormatada}${assinatura.ip ? " · IP " + assinatura.ip : ""}`;
    ctx.fillText(linhaInfo, xEsq, y + 18);

    try {
      const img = await carregarImagem(assinatura.assinaturaImagem);
      const alturaImg = 50;
      const larguraImg = (img.width / img.height) * alturaImg;
      ctx.drawImage(img, xEsq, y + 26, Math.min(larguraImg, 260), alturaImg);
    } catch {
      // sem assinatura desenhada — segue sem a imagem
    }

    y += alturaPorAssinatura;
  }

  // rodapé
  ctx.fillStyle = "#a8a29e";
  ctx.font = "400 11px Arial, sans-serif";
  ctx.fillText(
    "Documento gerado eletronicamente pelo Vitral — Sacra Netimóveis.",
    xEsq,
    alturaTotal - margem - 15
  );

  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  link.download = `${opcoes.nomeArquivo}-${Date.now()}.png`;
  link.click();
}
