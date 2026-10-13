import type { ReactNode } from "react";
import { Download, Send } from "lucide-react";
import { MarcaVitral } from "../casca";
import { calcular } from "../calculo";
import { IMOVEL_AVALIADO, REFERENCIAS } from "../dados";
import { Botao, moeda, numero, useAviso } from "../ui";

const dataBr = (iso: string) => iso.split("-").reverse().join("/");

function Pagina({ n, children }: { n: number; children: ReactNode }) {
  return (
    <article className="folha relative mx-auto w-full max-w-[794px] bg-[#fffdf9] text-[#231f1e] shadow-[0_1px_0_#0000000f,0_8px_24px_-12px_#00000040] ring-1 ring-black/10 @3xl:min-h-[1123px]" aria-label={`Página ${n} de 4`}>
      <div className="flex items-center justify-between border-b border-[#231f1e] px-6 py-3 font-texto text-[11.5px] text-[#5b5350] @3xl:px-14">
        <span className="flex items-center gap-2 font-semibold text-[#231f1e]"><span className="inline-block size-3 bg-[#7b1e24]" aria-hidden />Sacra Netimóveis</span>
        <span>Estudo de mercado · {IMOVEL_AVALIADO.endereco}</span>
      </div>
      <div className="px-6 py-8 @3xl:px-14 @3xl:py-12">{children}</div>
      <div className="flex justify-between border-t border-[#d9d2c8] px-6 py-3 font-texto text-[11px] text-[#7a716c] @3xl:absolute @3xl:inset-x-0 @3xl:bottom-0 @3xl:px-14">
        <span>Válido por 90 dias a partir de 13/10/2026</span><span className="num">{n} / 4</span>
      </div>
    </article>
  );
}

export function TelaRelatorio() {
  const avisar = useAviso();
  const res = calcular(REFERENCIAS, IMOVEL_AVALIADO);
  const i = IMOVEL_AVALIADO;
  const preco = res.referencia ?? 0;
  const v = res.usadas.map((l) => l.m2Ajustado);
  const min = Math.min(...v) * 0.95, max = Math.max(...v) * 1.05;
  const pos = (x: number) => ((x - min) / (max - min)) * 100;

  return (
    <div className="flex h-full min-h-0 flex-col bg-cal">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-chumbo bg-vidro px-3 py-2 @3xl:px-5">
        <MarcaVitral tamanho={22} />
        <p className="min-w-0 flex-1 truncate text-sm font-medium">Estudo de mercado · versão 1</p>
        <Botao tamanho="p" icone={Send} onClick={() => avisar({ tipo: "info", texto: "Envio ao cliente desativado no laboratório." })}>Enviar</Botao>
        <Botao tamanho="p" variante="principal" icone={Download} onClick={() => avisar({ tipo: "ok", texto: "PDF gerado a partir da versão 1 (simulação)." })}>PDF</Botao>
      </div>
      <div className="rolagem min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-4 @3xl:space-y-8 @3xl:px-6 @3xl:py-8">
        {/* 1 — resposta primeiro */}
        <Pagina n={1}>
          <p className="font-texto text-[13px] text-[#5b5350]">Preparado para {i.cliente} · 13 de outubro de 2026</p>
          <h1 className="mt-3 text-[30px] font-semibold leading-[1.1] @3xl:text-[44px]">Quanto vale o apartamento da {i.endereco.replace("apartamento", "apto")}</h1>
          <p className="mt-2 text-[17px] text-[#5b5350]">{i.bairro}, Brasília · {numero(i.area, 2)} m² · {i.quartos} quartos · {i.vagas} vaga</p>
          <div className="mt-8 border-y-2 border-[#231f1e] py-6 @3xl:mt-12 @3xl:py-8">
            <p className="font-texto text-[14px] font-medium text-[#5b5350]">Preço recomendado para anunciar</p>
            <p className="num mt-1 text-[44px] font-semibold leading-none tracking-tight @3xl:text-[64px]">{moeda(preco)}</p>
            <p className="mt-3 font-texto text-[15px] text-[#3d3735]">Negociações entre <strong className="num">{moeda(res.faixa![0])}</strong> e <strong className="num">{moeda(res.faixa![1])}</strong> estão dentro do que o mercado pratica hoje.</p>
          </div>
          <div className="mt-8 grid gap-6 text-[17px] leading-[1.65] @3xl:mt-10 @3xl:grid-cols-2 @3xl:gap-10">
            <p>Comparamos o seu apartamento com {res.n} imóveis parecidos na mesma região, anunciados ou vendidos nos últimos meses. Ajustamos cada um pelas diferenças de conservação, vagas e posição.</p>
            <p>O preço recomendado fica no meio do que encontramos. Anunciar muito acima costuma alongar o tempo de venda; muito abaixo, deixa dinheiro na mesa.</p>
          </div>
        </Pagina>

        {/* 2 — referências */}
        <Pagina n={2}>
          <h2 className="text-[26px] font-semibold leading-tight @3xl:text-[32px]">Os imóveis que usamos para comparar</h2>
          <p className="mt-2 text-[17px] leading-[1.6] text-[#3d3735]">Preços de anúncio foram reduzidos em 10%, porque é comum o negócio fechar abaixo do valor pedido.</p>
          <ol className="mt-6 divide-y divide-[#d9d2c8] border-y border-[#231f1e] font-texto">
            {res.usadas.map((l, k) => (
              <li key={l.id} className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 py-3 @3xl:grid-cols-[28px_minmax(0,1fr)_110px_120px] @3xl:items-baseline">
                <span className="num text-[13px] text-[#7a716c]">{k + 1}</span>
                <div className="min-w-0"><p className="text-[15px] font-medium">{l.endereco}</p><p className="num text-[13px] text-[#5b5350]">{numero(l.area, 0)} m² · {l.tipoPreco === "anuncio" ? "anúncio" : "vendido"} em {dataBr(l.data).slice(0, 5)}{l.observacao ? ` · ${l.observacao.toLowerCase()}` : ""}</p></div>
                <p className="num col-start-2 mt-1 text-[14px] @3xl:col-start-auto @3xl:mt-0 @3xl:text-right">{moeda(l.preco)}</p>
                <p className="num col-start-2 text-[14px] font-semibold @3xl:col-start-auto @3xl:text-right">{moeda(l.m2Ajustado)}/m²</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 font-texto text-[13px] text-[#5b5350]">Endereços sem número de unidade completo para preservar os proprietários. Links e fontes ficam guardados no estudo interno.</p>
        </Pagina>

        {/* 3 — como chegamos */}
        <Pagina n={3}>
          <h2 className="text-[26px] font-semibold leading-tight @3xl:text-[32px]">Como chegamos ao preço</h2>
          <div className="mt-6 font-texto">
            <p className="text-[13px] font-medium text-[#5b5350]">Preço por m² de cada referência, já ajustado</p>
            <div className="relative mt-8 h-16 border-b border-[#231f1e]">
              {res.usadas.map((l, k) => (
                <span key={l.id} className="absolute bottom-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${pos(l.m2Ajustado)}%` }}>
                  <span className="num mb-1 text-[11px] text-[#5b5350]">{k + 1}</span>
                  <span className="size-3 rounded-full bg-[#231f1e]" />
                </span>
              ))}
              <span className="absolute -top-6 bottom-0 w-0.5 bg-[#7b1e24]" style={{ left: `${pos(res.mediana!)}%` }} />
              <span className="num absolute -top-7 translate-x-2 whitespace-nowrap text-[12px] font-semibold text-[#7b1e24]" style={{ left: `${Math.min(pos(res.mediana!), 70)}%` }}>meio: {moeda(res.mediana!)}/m²</span>
            </div>
            <div className="num mt-1 flex justify-between text-[11.5px] text-[#7a716c]"><span>{moeda(min)}</span><span>{moeda(max)}</span></div>
          </div>
          <ol className="mt-10 space-y-5 text-[17px] leading-[1.6]">
            <li><strong>1. Preço por m².</strong> Dividimos o preço de cada imóvel pela área.</li>
            <li><strong>2. Ajustes.</strong> Se a referência é melhor que o seu imóvel, o valor desce; se é pior, sobe. Anúncios descem 10%.</li>
            <li><strong>3. Meio da amostra.</strong> Usamos a mediana, que não se deixa puxar por um imóvel fora da curva: <span className="num">{moeda(res.mediana!)}</span>/m².</li>
            <li><strong>4. Seu imóvel.</strong> <span className="num">{moeda(res.mediana!)} × {numero(i.area, 2)} m² ≈ {moeda(preco)}</span>, arredondado para o milhar.</li>
          </ol>
        </Pagina>

        {/* 4 — condições */}
        <Pagina n={4}>
          <h2 className="text-[26px] font-semibold leading-tight @3xl:text-[32px]">O que este estudo é, e o que não é</h2>
          <div className="mt-6 space-y-4 text-[17px] leading-[1.65]">
            <p>É uma opinião de mercado preparada pela Sacra para orientar a venda, com base em imóveis comparáveis disponíveis em outubro de 2026.</p>
            <p><strong>Não é laudo de avaliação nem PTAM.</strong> Para financiamento, partilha, garantia ou ação judicial, é preciso um laudo técnico com responsabilidade profissional registrada.</p>
            <p>Os valores podem mudar com o mercado. Recomendamos revisar o estudo se o imóvel não for vendido em 90 dias.</p>
          </div>
          <div className="mt-12 grid gap-8 font-texto @3xl:mt-16 @3xl:grid-cols-2">
            <div className="border-t border-[#231f1e] pt-3"><p className="text-[15px] font-semibold">Helena Duarte Vasconcelos</p><p className="text-[13px] text-[#5b5350]">Responsável pelo estudo · CRECI-DF 00.000 (fictício)</p></div>
            <div className="border-t border-[#231f1e] pt-3"><p className="text-[15px] font-semibold">Sacra Netimóveis</p><p className="text-[13px] text-[#5b5350]">Brasília · DF · dados de contato fictícios no laboratório</p></div>
          </div>
        </Pagina>
      </div>
    </div>
  );
}
