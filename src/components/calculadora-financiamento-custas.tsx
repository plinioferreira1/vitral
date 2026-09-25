"use client";

import { useState } from "react";
import { brl } from "@/lib/proporcionalidade";
import { CampoMoeda } from "@/components/campo-moeda";
import { BotaoCopiarLink } from "@/components/botao-copiar-link";
import { FAIXAS_ESCRITURA, FAIXAS_REGISTRO, buscarFaixa } from "@/lib/emolumentos-cartorio";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { Calculator, FileText, PieChart, Info } from "lucide-react";

const CORES_LINHA = ["bg-rose-500", "bg-blue-500", "bg-amber-500", "bg-emerald-500", "bg-violet-500"];

function pct(parte: number, total: number): string {
  if (total <= 0) return "0,0%";
  return `${((parte / total) * 100).toFixed(1).replace(".", ",")}%`;
}

export function CalculadoraFinanciamento() {
  const [valor, setValor] = useState(0);
  const [valorFinanciado, setValorFinanciado] = useState(0);
  const [tipoImovel, setTipoImovel] = useState<"usado" | "novo">("usado");
  const [primeiroImovel, setPrimeiroImovel] = useState(false);
  const [minhaCasaMinhaVida, setMinhaCasaMinhaVida] = useState(false);
  const [taxaBancaria, setTaxaBancaria] = useState(0);
  const [parcelasItbi, setParcelasItbi] = useState("10");
  const [valorInstrumentoParticular, setValorInstrumentoParticular] = useState(2500);
  const [formato, setFormato] = useState<"instrumento" | "escritura">("instrumento");

  const numParcelasItbi = Math.max(1, Math.round(Number(parcelasItbi) || 10));

  let resultado: {
    itbi: number;
    registroCompraVendaCheio: number;
    registroCompraVenda: number;
    registroAlienacaoCheio: number;
    registroAlienacao: number;
    taxaBancaria: number;
    instrumentoParticular: number;
    escritura: number;
    custoTotal: number;
    percentualDoImovel: string;
  } | null = null;

  if (valor > 0 && valorFinanciado > 0) {
    const aliquotaItbi = tipoImovel === "novo" ? 0.01 : 0.02;
    const itbi = valor * aliquotaItbi;

    // Desconto de 50% no registro da compra e venda: só quando é o
    // primeiro imóvel do cliente.
    const registroCompraVendaCheio = buscarFaixa(valor, FAIXAS_REGISTRO);
    const registroCompraVenda = primeiroImovel ? registroCompraVendaCheio / 2 : registroCompraVendaCheio;

    // Desconto de 50% no registro da alienação fiduciária: só no
    // financiamento pelo Minha Casa Minha Vida.
    const registroAlienacaoCheio = buscarFaixa(valorFinanciado, FAIXAS_REGISTRO);
    const registroAlienacao = minhaCasaMinhaVida ? registroAlienacaoCheio / 2 : registroAlienacaoCheio;

    // Escritura de cartório (só entra no cálculo quando o formato
    // escolhido é "Escritura Pública" — no instrumento particular
    // ela não existe, entra o valor do despachante no lugar dela).
    const escritura = buscarFaixa(valor, FAIXAS_ESCRITURA) + buscarFaixa(valorFinanciado, FAIXAS_ESCRITURA);

    const custoDocumento = formato === "instrumento" ? valorInstrumentoParticular : escritura;
    const custoTotal = itbi + registroCompraVenda + registroAlienacao + taxaBancaria + custoDocumento;

    resultado = {
      itbi,
      registroCompraVendaCheio,
      registroCompraVenda,
      registroAlienacaoCheio,
      registroAlienacao,
      taxaBancaria,
      instrumentoParticular: valorInstrumentoParticular,
      escritura,
      custoTotal,
      percentualDoImovel: valor > 0 ? pct(custoTotal, valor) : "0,0%",
    };
  }

  const textoWhatsapp = resultado
    ? [
        `💸 *Custas estimadas de financiamento* — ${brl(valor)}`,
        formato === "instrumento"
          ? `Instrumento particular (despachante), no lugar da escritura de cartório.`
          : `Escritura Pública de Cartório.`,
        "",
        `▫️ ITBI (${tipoImovel === "novo" ? "1%" : "2%"}): ${brl(resultado.itbi)}`,
        `▫️ Registro de compra e venda: ${brl(resultado.registroCompraVenda)}`,
        `▫️ Registro de alienação fiduciária: ${brl(resultado.registroAlienacao)}`,
        `▫️ Taxa bancária: ${brl(resultado.taxaBancaria)}`,
        formato === "instrumento"
          ? `▫️ Instrumento particular (despachante): ${brl(resultado.instrumentoParticular)}`
          : `▫️ Escritura: ${brl(resultado.escritura)}`,
        "",
        `*Total estimado: ${brl(resultado.custoTotal)}* (${resultado.percentualDoImovel} do valor do imóvel)`,
        "",
        `O ITBI pode ser parcelado em até ${numParcelasItbi}x.`,
        "_Valores aproximados, sujeitos a alteração sem aviso prévio._",
      ].join("\n")
    : "";

  return (
    <div className="max-w-6xl space-y-6">
      <CabecalhoSecao
        icon={Calculator}
        titulo="Custas de Financiamento"
        descricao="Estimativa completa de custas pra passar pro cliente logo no início do processo — já com a opção de instrumento particular, que costuma pesar na decisão dele."
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex-1 space-y-4 rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Dados do imóvel e financiamento
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Valor do imóvel</label>
              <CampoMoeda onValorChange={setValor} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Valor financiado</label>
              <CampoMoeda onValorChange={setValorFinanciado} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Tipo do imóvel</label>
              <select
                value={tipoImovel}
                onChange={(e) => setTipoImovel(e.target.value as "usado" | "novo")}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              >
                <option value="usado">Usado (ITBI 2%)</option>
                <option value="novo">Novo (ITBI 1%)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-ink-muted">
                Taxa bancária
              </label>
              <CampoMoeda onValorChange={setTaxaBancaria} />
              <p className="mt-1 text-[11px] text-ink-muted">
                Inclui vistoria, tarifas bancárias, relacionamento e análise jurídica. Valor
                aproximado, pode variar.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={primeiroImovel}
              onChange={(e) => setPrimeiroImovel(e.target.checked)}
              className="accent-brand"
            />
            É o primeiro imóvel do cliente (desconto de 50% no registro da compra e venda)
          </label>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={minhaCasaMinhaVida}
              onChange={(e) => setMinhaCasaMinhaVida(e.target.checked)}
              className="accent-brand"
            />
            Financiamento pelo Minha Casa Minha Vida (desconto de 50% no registro da alienação)
          </label>

          <p className="border-t border-border pt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Instrumento particular e ITBI
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Parcelas do ITBI (padrão: 10)
              </label>
              <input
                value={parcelasItbi}
                onChange={(e) => setParcelasItbi(e.target.value)}
                inputMode="numeric"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Valor do instrumento particular (despachante)
              </label>
              <CampoMoeda defaultValue={2500} onValorChange={setValorInstrumentoParticular} />
            </div>
          </div>

          <p className="rounded-lg bg-background p-3 text-xs text-ink-muted">
            Os valores são estimativas e podem variar conforme o cartório, o município e a
            instituição financeira. Consulte os valores oficiais antes de apresentar ao cliente.
          </p>
        </div>

        <div className="w-full shrink-0 space-y-4 lg:w-[26rem]">
          <div className="flex gap-1 rounded-lg bg-background p-1 text-sm">
            <button
              type="button"
              onClick={() => setFormato("instrumento")}
              className={`flex-1 rounded-md py-1.5 text-center text-xs font-medium transition ${
                formato === "instrumento" ? "bg-surface text-brand shadow-sm" : "text-ink-muted"
              }`}
            >
              Instrumento Particular
            </button>
            <button
              type="button"
              onClick={() => setFormato("escritura")}
              className={`flex-1 rounded-md py-1.5 text-center text-xs font-medium transition ${
                formato === "escritura" ? "bg-surface text-brand shadow-sm" : "text-ink-muted"
              }`}
            >
              Escritura Pública
            </button>
          </div>

          <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
            <CabecalhoSecao
              icon={FileText}
              titulo="Resumo das custas estimadas"
              descricao="Valores aproximados, baseados nas informações acima."
            />

            {!resultado ? (
              <p className="text-sm text-ink-muted">Preencha os valores ao lado pra calcular.</p>
            ) : (
              <>
                <div className="flex flex-col gap-3 rounded-xl bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-rose-700">Custo total estimado</p>
                    <p className="num text-3xl font-bold text-rose-700">{brl(resultado.custoTotal)}</p>
                  </div>
                  <div className="flex w-full shrink-0 items-center gap-2 rounded-lg bg-surface px-3 py-2 shadow-sm sm:w-44">
                    <PieChart size={18} strokeWidth={2} className="shrink-0 text-rose-600" />
                    <span className="text-xs leading-snug text-ink-muted">
                      Equivalente a <span className="font-semibold text-ink">{resultado.percentualDoImovel}</span>{" "}
                      do valor do imóvel
                    </span>
                  </div>
                </div>

                <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  Detalhamento dos custos
                </p>
                <ul className="divide-y divide-border text-sm">
                  {[
                    {
                      label: `ITBI (${tipoImovel === "novo" ? "1%" : "2%"})`,
                      valor: resultado.itbi,
                      cor: CORES_LINHA[0],
                    },
                    {
                      label: "Registro de compra e venda",
                      valor: resultado.registroCompraVenda,
                      cor: CORES_LINHA[1],
                    },
                    {
                      label: "Registro de alienação fiduciária",
                      valor: resultado.registroAlienacao,
                      cor: CORES_LINHA[2],
                    },
                    { label: "Taxa bancária", valor: resultado.taxaBancaria, cor: CORES_LINHA[3] },
                    formato === "instrumento"
                      ? {
                          label: "Instrumento particular (despachante)",
                          valor: resultado.instrumentoParticular,
                          cor: CORES_LINHA[4],
                        }
                      : {
                          label: "Escritura",
                          valor: resultado.escritura,
                          cor: CORES_LINHA[4],
                        },
                  ].map((linha) => (
                    <li key={linha.label} className="flex items-center gap-2 py-2.5">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${linha.cor}`} />
                      <span className="flex min-w-0 flex-1 items-center gap-1 text-ink">
                        <span className="truncate">{linha.label}</span>
                        <Info size={12} strokeWidth={2} className="shrink-0 text-ink-muted/60" />
                      </span>
                      <span className="num shrink-0 whitespace-nowrap font-medium text-ink">{brl(linha.valor)}</span>
                      <span className="num w-14 shrink-0 text-right text-xs text-ink-muted">
                        {pct(linha.valor, resultado.custoTotal)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2.5">
                  <span className="text-sm font-semibold text-ink">Total estimado</span>
                  <span className="num font-semibold text-rose-700">{brl(resultado.custoTotal)}</span>
                </div>

                <div className="mt-4 flex justify-end">
                  <BotaoCopiarLink texto={textoWhatsapp} rotulo="Copiar como texto" />
                </div>
              </>
            )}
          </div>

          {resultado && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-start gap-2.5">
                <Info size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-ink">Informações complementares</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-ink-muted">
                    <li>
                      O ITBI foi calculado com alíquota de {tipoImovel === "novo" ? "1%" : "2%"} (imóvel{" "}
                      {tipoImovel}).
                    </li>
                    {primeiroImovel && (
                      <li>Foi aplicado o desconto de 50% no registro da compra e venda (primeiro imóvel).</li>
                    )}
                    {minhaCasaMinhaVida && (
                      <li>Foi aplicado o desconto de 50% no registro da alienação (Minha Casa Minha Vida).</li>
                    )}
                    <li>O ITBI pode ser parcelado em até {numParcelasItbi}x.</li>
                    <li>Valores podem variar conforme o cartório, o município e a instituição financeira.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
