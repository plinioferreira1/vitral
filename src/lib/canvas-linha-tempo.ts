// Gera uma imagem (PNG) da linha do tempo de um processo, pra
// mandar pro cliente/corretor por WhatsApp ou e-mail.

export interface EtapaLinhaTempo {
  nome: string;
  status: "concluida" | "pendente" | "em_andamento" | "bloqueada";
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

export function gerarLinhaDoTempoPNG(opcoes: {
  titulo: string;
  subtitulo: string;
  etapas: EtapaLinhaTempo[];
  nomeArquivo: string;
}) {
  const larguraPorEtapa = 160;
  const margem = 40;
  const escala = 2;
  const largura = margem * 2 + opcoes.etapas.length * larguraPorEtapa;
  const altura = 300;

  const canvas = document.createElement("canvas");
  canvas.width = largura * escala;
  canvas.height = altura * escala;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(escala, escala);

  // fundo
  ctx.fillStyle = "#fafaf9";
  ctx.fillRect(0, 0, largura, altura);

  // cartão
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#e7e5e4";
  const raio = 20;
  ctx.beginPath();
  ctx.moveTo(margem / 2 + raio, margem / 2);
  ctx.arcTo(largura - margem / 2, margem / 2, largura - margem / 2, altura - margem / 2, raio);
  ctx.arcTo(largura - margem / 2, altura - margem / 2, margem / 2, altura - margem / 2, raio);
  ctx.arcTo(margem / 2, altura - margem / 2, margem / 2, margem / 2, raio);
  ctx.arcTo(margem / 2, margem / 2, largura - margem / 2, margem / 2, raio);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // título + subtítulo
  ctx.fillStyle = "#1c1917";
  ctx.font = "700 20px Arial, sans-serif";
  ctx.fillText(opcoes.titulo, margem, 55);
  ctx.fillStyle = "#78716c";
  ctx.font = "400 13px Arial, sans-serif";
  ctx.fillText(opcoes.subtitulo, margem, 76);

  const yLinha = 175;
  const raioCirculo = 15;

  // acha o índice da etapa "atual" (primeira não concluída)
  let indiceAtual = opcoes.etapas.findIndex((e) => e.status !== "concluida");
  if (indiceAtual === -1) indiceAtual = opcoes.etapas.length; // tudo concluído

  opcoes.etapas.forEach((etapa, i) => {
    const x = margem + larguraPorEtapa * i + larguraPorEtapa / 2;
    const concluida = etapa.status === "concluida";
    const atual = i === indiceAtual;

    // linha conectando ao próximo círculo
    if (i < opcoes.etapas.length - 1) {
      ctx.beginPath();
      ctx.moveTo(x + raioCirculo, yLinha);
      ctx.lineTo(x + larguraPorEtapa - raioCirculo, yLinha);
      ctx.strokeStyle = concluida ? "#731515" : "#e7e5e4";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // círculo
    ctx.beginPath();
    ctx.arc(x, yLinha, raioCirculo, 0, Math.PI * 2);
    if (concluida) {
      ctx.fillStyle = "#731515";
      ctx.fill();
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = atual ? 2.5 : 1.5;
      ctx.strokeStyle = atual ? "#B9822C" : "#d6d3d1";
      ctx.stroke();
    }

    // check dentro do círculo concluído
    if (concluida) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 5, yLinha);
      ctx.lineTo(x - 1.5, yLinha + 4);
      ctx.lineTo(x + 5.5, yLinha - 5);
      ctx.stroke();
    }

    // rótulo acima do círculo
    ctx.font = `${atual ? "700" : "500"} 12px Arial, sans-serif`;
    ctx.fillStyle = atual ? "#1c1917" : concluida ? "#44403c" : "#a8a29e";
    ctx.textAlign = "center";
    const linhasRotulo = medirLinhas(ctx, etapa.nome, larguraPorEtapa - 16);
    const yTextoBase = yLinha - raioCirculo - 12 - (linhasRotulo.length - 1) * 15;
    linhasRotulo.forEach((linha, li) => {
      ctx.fillText(linha, x, yTextoBase + li * 15);
    });
    ctx.textAlign = "left";
  });

  ctx.fillStyle = "#a8a29e";
  ctx.font = "400 11px Arial, sans-serif";
  ctx.fillText("Gerado pelo Vitral — Sacra Netimóveis.", margem, altura - 20);

  const url = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = url;
  link.download = `${opcoes.nomeArquivo}-${Date.now()}.png`;
  link.click();
}
