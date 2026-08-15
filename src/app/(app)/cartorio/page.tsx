"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { brl } from "@/lib/proporcionalidade";
import { CampoMoeda } from "@/components/campo-moeda";
import { registrarSimulacaoCustas } from "./actions";
import { FAIXAS_ESCRITURA, FAIXAS_REGISTRO, buscarFaixa } from "@/lib/emolumentos-cartorio";

interface ResultadoCartorio {
  valor: number;
  valorFinanciado: number;
  itbi: number;
  escritura: number;
  escrituraCompraVenda: number;
  escrituraAlienacao: number;
  instrumentoParticular: boolean;
  registroCompraVendaCheio: number;
  registroCompraVenda: number;
  registroAlienacaoCheio: number;
  registroAlienacao: number;
  primeiroImovel: boolean;
  minhaCasaMinhaVida: boolean;
  total: number;
}

function computarResultado(params: {
  valor: number;
  temFinanciamento: boolean;
  valorFinanciado: number;
  tipoImovel: "usado" | "novo";
  primeiroImovel: boolean;
  minhaCasaMinhaVida: boolean;
  instrumentoParticular: boolean;
}): { resultado: ResultadoCartorio | null; erro: string | null } {
  const {
    valor,
    temFinanciamento,
    valorFinanciado,
    tipoImovel,
    primeiroImovel,
    minhaCasaMinhaVida,
    instrumentoParticular,
  } = params;

  if (!valor || valor <= 0) {
    return { resultado: null, erro: "Informe o valor do imóvel/venda antes de calcular." };
  }

  if (temFinanciamento) {
    if (!valorFinanciado || valorFinanciado <= 0) {
      return {
        resultado: null,
        erro: 'Informe o valor financiado, ou desmarque "Tem financiamento".',
      };
    }
    if (valorFinanciado > valor) {
      return {
        resultado: null,
        erro: "O valor financiado não pode ser maior que o valor do imóvel.",
      };
    }
  }

  const aliquotaItbi = tipoImovel === "novo" ? 0.01 : 0.02;
  const itbi = valor * aliquotaItbi;
  // Quando o financiamento é feito por instrumento particular com força
  // de escritura pública, o próprio contrato do banco substitui a
  // escritura — não se paga escritura à parte nesse caso (nem a da
  // compra e venda, nem a da alienação fiduciária).
  // Escritura da compra e venda incide sobre o valor total do imóvel.
  const escrituraCompraVenda = buscarFaixa(valor, FAIXAS_ESCRITURA);
  // Quando tem financiamento, a escritura da alienação fiduciária
  // (garantia do banco) também precisa ser lavrada, incidindo só
  // sobre o valor financiado — mesma lógica já aplicada no registro.
  const escrituraAlienacao = temFinanciamento ? buscarFaixa(valorFinanciado, FAIXAS_ESCRITURA) : 0;
  const escritura =
    temFinanciamento && instrumentoParticular ? 0 : escrituraCompraVenda + escrituraAlienacao;
  // Registro da compra e venda incide sobre o valor total do imóvel.
  // Primeiro imóvel dá direito a 50% de desconto nesse registro.
  const registroCompraVendaCheio = buscarFaixa(valor, FAIXAS_REGISTRO);
  const registroCompraVenda = primeiroImovel ? registroCompraVendaCheio / 2 : registroCompraVendaCheio;
  // Quando tem financiamento, o registro da alienação fiduciária
  // (garantia do banco) é um registro à parte, incidindo só sobre
  // o valor financiado — não sobre o valor total do imóvel. O
  // Minha Casa Minha Vida dá 50% de desconto só nesse registro
  // (desconto diferente do de primeiro imóvel, que é só na compra
  // e venda).
  const registroAlienacaoCheio = temFinanciamento ? buscarFaixa(valorFinanciado, FAIXAS_REGISTRO) : 0;
  const registroAlienacao =
    temFinanciamento && minhaCasaMinhaVida ? registroAlienacaoCheio / 2 : registroAlienacaoCheio;

  return {
    resultado: {
      valor,
      valorFinanciado,
      itbi,
      escritura,
      escrituraCompraVenda,
      escrituraAlienacao,
      instrumentoParticular: temFinanciamento && instrumentoParticular,
      registroCompraVendaCheio,
      registroCompraVenda,
      registroAlienacaoCheio,
      registroAlienacao,
      primeiroImovel,
      minhaCasaMinhaVida: temFinanciamento && minhaCasaMinhaVida,
      total: itbi + escritura + registroCompraVenda + registroAlienacao,
    },
    erro: null,
  };
}

export default function CartorioPage() {
  const searchParams = useSearchParams();
  const valorInicialParam = Number(searchParams.get("valor")) || undefined;
  const [valor, setValor] = useState(valorInicialParam ?? 0);
  const [temFinanciamento, setTemFinanciamento] = useState(false);
  const [instrumentoParticular, setInstrumentoParticular] = useState(false);
  const [valorFinanciado, setValorFinanciado] = useState(0);
  const [tipoImovel, setTipoImovel] = useState<"usado" | "novo">("usado");
  const [primeiroImovel, setPrimeiroImovel] = useState(false);
  const [minhaCasaMinhaVida, setMinhaCasaMinhaVida] = useState(false);
  // Atalho vindo do Início (corretor): ?valor=300000 já chega calculado.
  const [resultado, setResultado] = useState<ResultadoCartorio | null>(() =>
    valorInicialParam
      ? computarResultado({
          valor: valorInicialParam,
          temFinanciamento: false,
          valorFinanciado: 0,
          tipoImovel: "usado",
          primeiroImovel: false,
          minhaCasaMinhaVida: false,
          instrumentoParticular: false,
        }).resultado
      : null
  );
  const [erro, setErro] = useState<string | null>(null);
  const [gerandoImagem, setGerandoImagem] = useState(false);

  const calcular = () => {
    const { resultado: novoResultado, erro: novoErro } = computarResultado({
      valor,
      temFinanciamento,
      valorFinanciado,
      tipoImovel,
      primeiroImovel,
      minhaCasaMinhaVida,
      instrumentoParticular,
    });
    setErro(novoErro);
    setResultado(novoResultado);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Simulação de Custas
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
              <CampoMoeda
                onValorChange={setValor}
                defaultValue={valorInicialParam}
                placeholder="420.000,00"
              />
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
              onChange={(e) => {
                setTemFinanciamento(e.target.checked);
                if (!e.target.checked) setInstrumentoParticular(false);
              }}
              className="accent-brand"
            />
            Parte do valor é financiada (gera registro de alienação fiduciária à parte)
          </label>

          {temFinanciamento && (
            <label className="mt-2 ml-6 flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={instrumentoParticular}
                onChange={(e) => setInstrumentoParticular(e.target.checked)}
                className="accent-brand"
              />
              Financiamento por instrumento particular com força de escritura (não paga
              escritura)
            </label>
          )}

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
            <label className="mt-2 flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={minhaCasaMinhaVida}
                onChange={(e) => setMinhaCasaMinhaVida(e.target.checked)}
                className="accent-brand"
              />
              Financiamento pelo Minha Casa Minha Vida (desconto de 50% no registro da alienação)
            </label>
          )}

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
                  ITBI ({tipoImovel === "novo" ? "1%" : "2%"} do valor da compra e venda)
                  <span className="block text-xs text-ink-muted">
                    Pode ser parcelado em até 10x no boleto, se solicitado no GDF
                  </span>
                </span>
                <span className="font-mono text-ink">{brl(resultado.itbi)}</span>
              </li>
              <li className="flex items-center justify-between py-2">
                <span className="text-ink">
                  Escritura da Compra e Venda
                  <span className="block text-xs text-ink-muted">
                    Caso seja Instrumento Particular com Força de Escritura, o cliente não tem
                    esse custo
                  </span>
                </span>
                <span className="font-mono text-ink">{brl(resultado.escrituraCompraVenda)}</span>
              </li>
              {resultado.escrituraAlienacao > 0 && !resultado.instrumentoParticular && (
                <li className="flex items-center justify-between py-2">
                  <span className="text-ink">
                    Escritura da Alienação Fiduciária
                    <span className="block text-xs text-ink-muted">
                      Aplicado sobre o montante financiado, junto com a escritura da compra e
                      venda
                    </span>
                  </span>
                  <span className="font-mono text-ink">{brl(resultado.escrituraAlienacao)}</span>
                </li>
              )}
              <li className="flex items-center justify-between py-2">
                <span className="text-ink">
                  Registro da Compra e Venda
                  <span className="block text-xs text-ink-muted">
                    Aplicado sobre o valor da compra e venda (caso seja o primeiro imóvel, tem
                    50% de desconto)
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
                    Registro da Alienação Fiduciária
                    <span className="block text-xs text-ink-muted">
                      Aplicado sobre o montante alienado (pode chegar até 80% do valor da compra
                      e venda){resultado.minhaCasaMinhaVida && " — 50% de desconto (Minha Casa Minha Vida)"}
                    </span>
                  </span>
                  <span className="text-right font-mono text-ink">
                    {resultado.minhaCasaMinhaVida && (
                      <span className="mr-1.5 text-xs text-ink-muted line-through">
                        {brl(resultado.registroAlienacaoCheio)}
                      </span>
                    )}
                    {brl(resultado.registroAlienacao)}
                  </span>
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
          * Caso haja algum registro/averbação acessório (pacto antenupcial, cédula de crédito
          imobiliário, cancelamento de alienação fiduciária, usufruto, etc), o valor pode sofrer
          alterações.
        </p>

        <p className="text-xs text-ink-muted">
          Valores de escritura e registro baseados na tabela divulgada pelo ANOREG-DF, já com
          impostos inclusos.{" "}
          <strong className="font-medium text-ink-muted">
            Os valores são estimados, e podem sofrer alterações sem aviso prévio.
          </strong>
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

function medirLinhasTexto(ctx: CanvasRenderingContext2D, texto: string, larguraMax: number): string[] {
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

async function baixarImagemResultado(
  r: ResultadoCartorio,
  tipoImovel: "usado" | "novo",
  setGerando: (v: boolean) => void
) {
  setGerando(true);
  try {
    // Registra no histórico (fire-and-forget — não deve travar o download
    // se, por algum motivo, o registro falhar).
    registrarSimulacaoCustas({
      valor: r.valor,
      tipoImovel,
      valorFinanciado: r.valorFinanciado || null,
      primeiroImovel: r.primeiroImovel,
      instrumentoParticular: r.instrumentoParticular,
      total: r.total,
    }).catch(() => {});

    interface LinhaResultado {
      label: string;
      sublabel?: string;
      valor: string;
      valorRiscado?: string;
    }

    const linhas: LinhaResultado[] = [
      {
        label: `ITBI (${tipoImovel === "novo" ? "1%" : "2%"} do valor da compra e venda)`,
        sublabel: "Pode ser parcelado em até 10x no boleto, se solicitado no GDF",
        valor: brl(r.itbi),
      },
      {
        label: "Escritura da Compra e Venda",
        sublabel:
          "Caso seja Instrumento Particular com Força de Escritura, o cliente não tem esse custo",
        valor: brl(r.escrituraCompraVenda),
      },
      {
        label: "Registro da Compra e Venda",
        sublabel:
          "Aplicado sobre o valor da compra e venda (caso seja o primeiro imóvel, tem 50% de desconto)",
        valor: brl(r.registroCompraVenda),
        valorRiscado: r.primeiroImovel ? brl(r.registroCompraVendaCheio) : undefined,
      },
    ];
    if (r.escrituraAlienacao > 0 && !r.instrumentoParticular) {
      linhas.push({
        label: "Escritura da Alienação Fiduciária",
        sublabel: "Aplicado sobre o montante financiado, junto com a escritura da compra e venda",
        valor: brl(r.escrituraAlienacao),
      });
    }
    if (r.registroAlienacao > 0) {
      linhas.push({
        label: "Registro da Alienação Fiduciária",
        sublabel:
          "Aplicado sobre o montante alienado (pode chegar até 80% do valor da compra e venda)" +
          (r.minhaCasaMinhaVida ? " — 50% de desconto (Minha Casa Minha Vida)" : ""),
        valor: brl(r.registroAlienacao),
        valorRiscado: r.minhaCasaMinhaVida ? brl(r.registroAlienacaoCheio) : undefined,
      });
    }

    const largura = 1000;
    const margem = 40;
    const topoTabela = 250;

    const escala = 2;
    const canvas = document.createElement("canvas");
    canvas.width = largura * escala;
    canvas.height = 100; // provisório, recalculado abaixo depois de medir os textos
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(escala, escala);

    const xEsq = margem + 40;
    const xDir = largura - margem - 40;
    const larguraTexto = xDir - xEsq;

    // Mede antes de desenhar, pra descobrir quantas linhas cada
    // sublabel/rodapé vai ocupar e calcular a altura real do card.
    ctx.font = "400 13px Arial, sans-serif";
    const linhasComQuebra = linhas.map((linha) => ({
      ...linha,
      sublabelLinhas: linha.sublabel ? medirLinhasTexto(ctx, linha.sublabel, larguraTexto - 140) : [],
    }));
    const alturaPorLinha = linhasComQuebra.map((l) => 34 + Math.max(l.sublabelLinhas.length, 1) * 16 + 14);

    const textoRodape1 =
      "* Caso haja algum registro/averbação acessório (pacto antenupcial, cédula de crédito imobiliário, cancelamento de alienação fiduciária, usufruto, etc), o valor pode sofrer alterações.";
    const textoRodape2 =
      "Valores de escritura e registro baseados na tabela divulgada pelo ANOREG-DF, já com impostos inclusos. Os valores são estimados, e podem sofrer alterações sem aviso prévio.";
    ctx.font = "400 12px Arial, sans-serif";
    const rodape1Linhas = medirLinhasTexto(ctx, textoRodape1, larguraTexto);
    const rodape2Linhas = medirLinhasTexto(ctx, textoRodape2, larguraTexto);
    const alturaRodape = (rodape1Linhas.length + rodape2Linhas.length) * 17 + 20;

    const alturaTotalConteudo =
      topoTabela + alturaPorLinha.reduce((a, b) => a + b, 0) + 80 + alturaRodape;

    canvas.width = largura * escala;
    canvas.height = alturaTotalConteudo * escala;
    ctx.scale(escala, escala); // o resize acima limpa o canvas e o scale anterior (aplicado de novo)

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
    ctx.font = "700 26px Arial, sans-serif";
    ctx.fillText("SIMULAÇÃO DE CUSTAS — COMPRA E VENDA", xEsq, margem + 130);

    ctx.fillStyle = "#78716c";
    ctx.font = "400 15px Arial, sans-serif";
    ctx.fillText(`Valor de compra e venda: ${brl(r.valor)}`, xEsq, margem + 158);

    // linhas do resultado
    let y = topoTabela;
    linhasComQuebra.forEach((linha, i) => {
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

      ctx.fillStyle = "#78716c";
      ctx.font = "400 13px Arial, sans-serif";
      linha.sublabelLinhas.forEach((linhaTexto, j) => {
        ctx.fillText(linhaTexto, xEsq, y + 50 + j * 16);
      });

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

      y += alturaPorLinha[i];
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
    rodape1Linhas.forEach((linhaTexto, i) => ctx.fillText(linhaTexto, xEsq, y + i * 17));
    y += rodape1Linhas.length * 17 + 12;
    rodape2Linhas.forEach((linhaTexto, i) => ctx.fillText(linhaTexto, xEsq, y + i * 17));

    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `simulacao-custas-cartorio-${Date.now()}.png`;
    link.click();
  } finally {
    setGerando(false);
  }
}
