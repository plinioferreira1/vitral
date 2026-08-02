"use client";

import { useState } from "react";
import { brl } from "@/lib/proporcionalidade";
import { CampoMoeda } from "@/components/campo-moeda";

// ---------------------------------------------------------
// Tabelas de emolumentos fornecidas pela Sacra (faixa fixa,
// não é fórmula progressiva). Já incluem ISSQN.
// ---------------------------------------------------------

interface FaixaEmolumento {
  ate: number | null; // null = última faixa, sem limite superior
  valor: number;
}

const FAIXAS_ESCRITURA: FaixaEmolumento[] = [
  { ate: 9524.89, valor: 461.27 },
  { ate: 15272.67, valor: 701.11 },
  { ate: 28738.89, valor: 1439.13 },
  { ate: 57477.78, valor: 1937.29 },
  { ate: 85888.21, valor: 2029.55 },
  { ate: 200351.09, valor: 2121.8 },
  { ate: 343224.42, valor: 2306.3 },
  { ate: 858882.16, valor: 2490.81 },
  { ate: 1313777.69, valor: 2675.32 },
  { ate: 1806444.32, valor: 2859.81 },
  { ate: null, valor: 3044.32 },
];

const FAIXAS_REGISTRO: FaixaEmolumento[] = [
  { ate: 32844.44, valor: 701.11 },
  { ate: 82111.11, valor: 885.62 },
  { ate: 164222.21, valor: 1070.12 },
  { ate: 262755.54, valor: 1199.28 },
  { ate: 574777.74, valor: 1383.78 },
  { ate: 870377.72, valor: 1568.29 },
  { ate: 1149555.47, valor: 1752.8 },
  { ate: 1477999.89, valor: 1937.29 },
  { ate: 1970666.52, valor: 2121.8 },
  { ate: null, valor: 2306.3 },
];

function buscarFaixa(valor: number, faixas: FaixaEmolumento[]): number {
  for (const f of faixas) {
    if (f.ate === null || valor <= f.ate) return f.valor;
  }
  return faixas[faixas.length - 1].valor;
}

interface ResultadoCartorio {
  valor: number;
  valorFinanciado: number;
  itbi: number;
  escritura: number;
  registroCompraVendaCheio: number;
  registroCompraVenda: number;
  registroAlienacao: number;
  primeiroImovel: boolean;
  total: number;
}

export default function CartorioPage() {
  const [valor, setValor] = useState(0);
  const [temFinanciamento, setTemFinanciamento] = useState(false);
  const [valorFinanciado, setValorFinanciado] = useState(0);
  const [tipoImovel, setTipoImovel] = useState<"usado" | "novo">("usado");
  const [primeiroImovel, setPrimeiroImovel] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCartorio | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [gerandoImagem, setGerandoImagem] = useState(false);

  const calcular = () => {
    setErro(null);
    if (!valor || valor <= 0) {
      setErro("Informe o valor do imóvel/venda antes de calcular.");
      setResultado(null);
      return;
    }

    if (temFinanciamento) {
      if (!valorFinanciado || valorFinanciado <= 0) {
        setErro('Informe o valor financiado, ou desmarque "Tem financiamento".');
        setResultado(null);
        return;
      }
      if (valorFinanciado > valor) {
        setErro("O valor financiado não pode ser maior que o valor do imóvel.");
        setResultado(null);
        return;
      }
    }

    const aliquotaItbi = tipoImovel === "novo" ? 0.01 : 0.02;
    const itbi = valor * aliquotaItbi;
    const escritura = buscarFaixa(valor, FAIXAS_ESCRITURA);
    // Registro da compra e venda incide sobre o valor total do imóvel.
    // Primeiro imóvel dá direito a 50% de desconto nesse registro.
    const registroCompraVendaCheio = buscarFaixa(valor, FAIXAS_REGISTRO);
    const registroCompraVenda = primeiroImovel ? registroCompraVendaCheio / 2 : registroCompraVendaCheio;
    // Quando tem financiamento, o registro da alienação fiduciária
    // (garantia do banco) é um registro à parte, incidindo só sobre
    // o valor financiado — não sobre o valor total do imóvel.
    const registroAlienacao = temFinanciamento ? buscarFaixa(valorFinanciado, FAIXAS_REGISTRO) : 0;

    setResultado({
      valor,
      valorFinanciado,
      itbi,
      escritura,
      registroCompraVendaCheio,
      registroCompraVenda,
      registroAlienacao,
      primeiroImovel,
      total: itbi + escritura + registroCompraVenda + registroAlienacao,
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Simulação de custos
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Estimativa de ITBI, escritura e registro pra passar pro cliente.
        </p>
      </div>

      <div className="space-y-5">
        <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Valor do imóvel / da venda (R$)
              </label>
              <CampoMoeda onValorChange={setValor} placeholder="420.000,00" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Tipo de imóvel</label>
              <select
                value={tipoImovel}
                onChange={(e) => setTipoImovel(e.target.value as "usado" | "novo")}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="usado">Usado (ITBI 2%)</option>
                <option value="novo">Novo (ITBI 1%)</option>
              </select>
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={temFinanciamento}
              onChange={(e) => setTemFinanciamento(e.target.checked)}
              className="accent-brand"
            />
            Parte do valor é financiada (gera registro de alienação fiduciária à parte)
          </label>

          <label className="mt-2 flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={primeiroImovel}
              onChange={(e) => setPrimeiroImovel(e.target.checked)}
              className="accent-brand"
            />
            É o primeiro imóvel do cliente (desconto de 50% no registro da compra e venda)
          </label>

          {temFinanciamento && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Valor financiado (R$)
              </label>
              <CampoMoeda
                onValorChange={setValorFinanciado}
                placeholder="250.000,00"
                className="w-full max-w-xs rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
              <p className="mt-1 text-xs text-ink-muted">
                O restante (valor do imóvel − valor financiado) é considerado recursos próprios.
              </p>
            </div>
          )}
        </div>

        {erro && (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {erro}
          </p>
        )}

        <button
          type="button"
          onClick={calcular}
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Calcular
        </button>

        {resultado && (
          <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-ink">Resultado</p>
            <ul className="divide-y divide-border text-sm">
              <li className="flex items-center justify-between py-2">
                <span className="text-ink">
                  ITBI ({tipoImovel === "novo" ? "1%" : "2%"} sobre {brl(resultado.valor)})
                  <span className="block text-xs text-ink-muted">
                    pode ser parcelado em até 10x no boleto, solicitando no GDF
                  </span>
                </span>
                <span className="font-mono text-ink">{brl(resultado.itbi)}</span>
              </li>
              <li className="flex items-center justify-between py-2">
                <span className="text-ink">Escritura (emolumentos + ISSQN)</span>
                <span className="font-mono text-ink">{brl(resultado.escritura)}</span>
              </li>
              <li className="flex items-center justify-between py-2">
                <span className="text-ink">
                  Registro da compra e venda
                  <span className="block text-xs text-ink-muted">
                    sobre o valor total, {brl(resultado.valor)}
                    {resultado.primeiroImovel && " · desconto de 50% (1º imóvel)"}
                  </span>
                </span>
                <span className="text-right font-mono text-ink">
                  {resultado.primeiroImovel && (
                    <span className="mr-1.5 text-xs text-ink-muted line-through">
                      {brl(resultado.registroCompraVendaCheio)}
                    </span>
                  )}
                  {brl(resultado.registroCompraVenda)}
                </span>
              </li>
              {resultado.registroAlienacao > 0 && (
                <li className="flex items-center justify-between py-2">
                  <span className="text-ink">
                    Registro do financiamento (alienação)
                    <span className="block text-xs text-ink-muted">
                      sobre o valor financiado, {brl(resultado.valorFinanciado)}
                    </span>
                  </span>
                  <span className="font-mono text-ink">{brl(resultado.registroAlienacao)}</span>
                </li>
              )}
            </ul>
            <div className="mt-3 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">Total estimado</span>
                <span className="font-mono text-base font-semibold text-brand">
                  {brl(resultado.total)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => baixarImagemResultado(resultado, tipoImovel, setGerandoImagem)}
              disabled={gerandoImagem}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-brand-soft disabled:opacity-60"
            >
              {gerandoImagem ? "Gerando imagem..." : "Baixar imagem para enviar ao cliente"}
            </button>
          </div>
        )}

        <p className="text-xs text-ink-muted">
          Valores de escritura e registro baseados na tabela de emolumentos do cartório (faixa
          fixa por valor, já com ISSQN incluso). ITBI calculado sobre o valor da venda. Quando há
          financiamento, o registro da alienação fiduciária é calculado à parte, só sobre o valor
          financiado.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// Geração da imagem de resultado (canvas), pro corretor
// baixar e enviar pro cliente pelo WhatsApp.
// ---------------------------------------------------------

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function caminhoArredondado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function quebrarTexto(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  larguraMax: number,
  alturaLinha: number
): number {
  const palavras = texto.split(" ");
  let linha = "";
  let yAtual = y;
  for (const palavra of palavras) {
    const teste = linha ? `${linha} ${palavra}` : palavra;
    if (ctx.measureText(teste).width > larguraMax && linha) {
      ctx.fillText(linha, x, yAtual);
      linha = palavra;
      yAtual += alturaLinha;
    } else {
      linha = teste;
    }
  }
  if (linha) ctx.fillText(linha, x, yAtual);
  return yAtual + alturaLinha;
}

async function baixarImagemResultado(
  r: ResultadoCartorio,
  tipoImovel: "usado" | "novo",
  setGerando: (v: boolean) => void
) {
  setGerando(true);
  try {
    interface LinhaResultado {
      label: string;
      sublabel?: string;
      valor: string;
      valorRiscado?: string;
    }

    const linhas: LinhaResultado[] = [
      {
        label: `ITBI (${tipoImovel === "novo" ? "1%" : "2%"} sobre ${brl(r.valor)})`,
        sublabel: "pode ser parcelado em até 10x no boleto, solicitando no GDF",
        valor: brl(r.itbi),
      },
      { label: "Escritura (emolumentos + ISSQN)", valor: brl(r.escritura) },
      {
        label: "Registro da compra e venda",
        sublabel: r.primeiroImovel
          ? `sobre ${brl(r.valor)} · desconto de 50% (1º imóvel)`
          : `sobre ${brl(r.valor)}`,
        valor: brl(r.registroCompraVenda),
        valorRiscado: r.primeiroImovel ? brl(r.registroCompraVendaCheio) : undefined,
      },
    ];
    if (r.registroAlienacao > 0) {
      linhas.push({
        label: "Registro do financiamento (alienação)",
        sublabel: `sobre ${brl(r.valorFinanciado)}`,
        valor: brl(r.registroAlienacao),
      });
    }

    const largura = 1000;
    const margem = 40;
    const alturaLinha = 78;
    const topoTabela = 250;
    const alturaRodape = 90;
    const alturaTotalConteudo = topoTabela + linhas.length * alturaLinha + 80 + alturaRodape;

    const escala = 2;
    const canvas = document.createElement("canvas");
    canvas.width = largura * escala;
    canvas.height = alturaTotalConteudo * escala;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(escala, escala);

    // fundo da página
    ctx.fillStyle = "#fafaf9";
    ctx.fillRect(0, 0, largura, alturaTotalConteudo);

    // cartão central
    ctx.fillStyle = "#ffffff";
    caminhoArredondado(ctx, margem, margem, largura - margem * 2, alturaTotalConteudo - margem * 2, 20);
    ctx.fill();
    ctx.strokeStyle = "#e7e5e4";
    ctx.lineWidth = 1;
    ctx.stroke();

    const xEsq = margem + 40;
    const xDir = largura - margem - 40;

    // logo (se falhar ao carregar, cai no texto)
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
    ctx.font = "600 28px Arial, sans-serif";
    ctx.fillText("Simulação de custos de cartório", xEsq, margem + 130);

    ctx.fillStyle = "#78716c";
    ctx.font = "400 15px Arial, sans-serif";
    ctx.fillText(`Imóvel avaliado em ${brl(r.valor)}`, xEsq, margem + 158);

    // linhas do resultado
    let y = topoTabela;
    linhas.forEach((linha, i) => {
      if (i > 0) {
        ctx.beginPath();
        ctx.moveTo(xEsq, y);
        ctx.lineTo(xDir, y);
        ctx.strokeStyle = "#e7e5e4";
        ctx.stroke();
      }

      ctx.fillStyle = "#1c1917";
      ctx.font = "500 18px Arial, sans-serif";
      ctx.fillText(linha.label, xEsq, y + 30);

      if (linha.sublabel) {
        ctx.fillStyle = "#78716c";
        ctx.font = "400 13px Arial, sans-serif";
        ctx.fillText(linha.sublabel, xEsq, y + 50);
      }

      ctx.textAlign = "right";
      if (linha.valorRiscado) {
        ctx.fillStyle = "#a8a29e";
        ctx.font = "400 14px Arial, sans-serif";
        const larguraRiscado = ctx.measureText(linha.valorRiscado).width;
        ctx.fillText(linha.valorRiscado, xDir, y + 24);
        ctx.beginPath();
        ctx.moveTo(xDir - larguraRiscado, y + 19);
        ctx.lineTo(xDir, y + 19);
        ctx.strokeStyle = "#a8a29e";
        ctx.stroke();

        ctx.fillStyle = "#1c1917";
        ctx.font = "600 19px Arial, sans-serif";
        ctx.fillText(linha.valor, xDir, y + 48);
      } else {
        ctx.fillStyle = "#1c1917";
        ctx.font = "600 19px Arial, sans-serif";
        ctx.fillText(linha.valor, xDir, y + 32);
      }
      ctx.textAlign = "left";

      y += alturaLinha;
    });

    // total
    y += 8;
    ctx.beginPath();
    ctx.moveTo(xEsq, y);
    ctx.lineTo(xDir, y);
    ctx.strokeStyle = "#1c1917";
    ctx.stroke();
    y += 38;
    ctx.fillStyle = "#1c1917";
    ctx.font = "700 21px Arial, sans-serif";
    ctx.fillText("Total estimado", xEsq, y);
    ctx.fillStyle = "#731515";
    ctx.textAlign = "right";
    ctx.font = "700 25px Arial, sans-serif";
    ctx.fillText(brl(r.total), xDir, y);
    ctx.textAlign = "left";

    // rodapé
    y += 34;
    ctx.fillStyle = "#78716c";
    ctx.font = "400 12px Arial, sans-serif";
    quebrarTexto(
      ctx,
      "Valores de escritura e registro baseados na tabela de emolumentos do cartório (já com ISSQN incluso). Estimativa sujeita a confirmação no cartório no momento da lavratura/registro.",
      xEsq,
      y,
      xDir - xEsq,
      17
    );

    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `simulacao-custos-cartorio-${Date.now()}.png`;
    link.click();
  } finally {
    setGerando(false);
  }
}
