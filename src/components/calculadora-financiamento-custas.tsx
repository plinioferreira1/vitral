"use client";

import { useState } from "react";
import { brl } from "@/lib/proporcionalidade";
import { CampoMoeda } from "@/components/campo-moeda";
import { BotaoCopiarLink } from "@/components/botao-copiar-link";
import { FAIXAS_ESCRITURA, FAIXAS_REGISTRO, buscarFaixa } from "@/lib/emolumentos-cartorio";

export function CalculadoraFinanciamento() {
  const [valor, setValor] = useState(0);
  const [valorFinanciado, setValorFinanciado] = useState(0);
  const [tipoImovel, setTipoImovel] = useState<"usado" | "novo">("usado");
  const [primeiroImovel, setPrimeiroImovel] = useState(false);
  const [taxaBancaria, setTaxaBancaria] = useState(0);
  const [parcelasItbi, setParcelasItbi] = useState("10");
  const [valorInstrumentoParticular, setValorInstrumentoParticular] = useState(2500);

  const numParcelasItbi = Math.max(1, Math.round(Number(parcelasItbi) || 10));

  let resultado: {
    itbi: number;
    escrituraCompraVenda: number;
    escrituraAlienacao: number;
    escritura: number;
    registroCompraVendaCheio: number;
    registroCompraVenda: number;
    registroAlienacao: number;
    registro: number;
    total: number;
    cotaItbi: number;
    totalAVista: number;
    cotasRestantes: number;
  } | null = null;

  if (valor > 0 && valorFinanciado > 0) {
    const aliquotaItbi = tipoImovel === "novo" ? 0.01 : 0.02;
    const itbi = valor * aliquotaItbi;

    const escrituraCompraVenda = buscarFaixa(valor, FAIXAS_ESCRITURA);
    const escrituraAlienacao = buscarFaixa(valorFinanciado, FAIXAS_ESCRITURA);
    const escritura = escrituraCompraVenda + escrituraAlienacao;

    const registroCompraVendaCheio = buscarFaixa(valor, FAIXAS_REGISTRO);
    const registroCompraVenda = primeiroImovel ? registroCompraVendaCheio / 2 : registroCompraVendaCheio;
    const registroAlienacao = buscarFaixa(valorFinanciado, FAIXAS_REGISTRO);
    const registro = registroCompraVenda + registroAlienacao;

    const total = itbi + escritura + registro + taxaBancaria;
    const cotaItbi = itbi / numParcelasItbi;
    // Total à vista: escolhendo o instrumento particular (sem escritura de
    // cartório) e parcelando o ITBI, só entram registro + taxa bancária +
    // a 1ª cota do ITBI. O serviço de instrumento particular é cobrado à
    // parte (ver observação abaixo).
    const totalAVista = registro + taxaBancaria + cotaItbi;

    resultado = {
      itbi,
      escrituraCompraVenda,
      escrituraAlienacao,
      escritura,
      registroCompraVendaCheio,
      registroCompraVenda,
      registroAlienacao,
      registro,
      total,
      cotaItbi,
      totalAVista,
      cotasRestantes: numParcelasItbi - 1,
    };
  }

  const textoWhatsapp = resultado
    ? [
        `💸 Valores do Imóvel — ${brl(valor)}`,
        `▫️ Escritura: ${brl(resultado.escritura)}`,
        `▫️ Registro: ${brl(resultado.registro)}`,
        `▫️ ITBI: ${brl(resultado.itbi)}`,
        `▫️ Taxa Bancária: ${brl(taxaBancaria)}`,
        `Total: ${brl(resultado.total)}`,
        "",
        "💢 Esses valores fazem parte de qualquer operação de compra e venda financiada. Para facilitar, temos duas opções:",
        `▫️ ITBI: pode ser parcelado em até ${numParcelasItbi} cotas de igual valor.`,
        `▫️ Escritura: é possível assinar o contrato emitido pelo banco, que tem força de escritura. Nesse caso, eu cuido da lavratura, da organização das assinaturas e de todo o traslado para registro (exigências, etc.). Esse é um serviço particular no valor de ${brl(valorInstrumentoParticular)}, que substitui o valor da escritura em cartório.`,
        "",
        `Total à vista: ${brl(resultado.totalAVista)}`,
        ...(resultado.cotasRestantes > 0
          ? [
              `+ ${resultado.cotasRestantes} cota${resultado.cotasRestantes > 1 ? "s" : ""} mensa${resultado.cotasRestantes > 1 ? "is" : "l"} do ITBI de ${brl(resultado.cotaItbi)}`,
            ]
          : []),
      ].join("\n")
    : "";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Custas de Financiamento
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Estimativa completa de custas pra passar pro cliente logo no início do processo — já
          com a opção de instrumento particular, que costuma pesar na decisão dele.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
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
            <label className="mb-1 block text-xs font-medium text-ink-muted">Taxa bancária</label>
            <CampoMoeda onValorChange={setTaxaBancaria} />
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

        <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
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
      </div>

      {resultado && (
        <>
          <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-ink">💸 Valores do imóvel — {brl(valor)}</p>
            <ul className="divide-y divide-border text-sm">
              <li className="flex items-center justify-between py-2">
                <span className="text-ink">Escritura</span>
                <span className="font-mono text-ink">{brl(resultado.escritura)}</span>
              </li>
              <li className="flex items-center justify-between py-2">
                <span className="text-ink">Registro</span>
                <span className="text-right font-mono text-ink">
                  {primeiroImovel && (
                    <span className="mr-1.5 text-xs text-ink-muted line-through">
                      {brl(resultado.registroCompraVendaCheio + resultado.registroAlienacao)}
                    </span>
                  )}
                  {brl(resultado.registro)}
                </span>
              </li>
              <li className="flex items-center justify-between py-2">
                <span className="text-ink">
                  ITBI
                  <span className="block text-xs text-ink-muted">
                    {tipoImovel === "novo" ? "1%" : "2%"} do valor do imóvel
                  </span>
                </span>
                <span className="font-mono text-ink">{brl(resultado.itbi)}</span>
              </li>
              <li className="flex items-center justify-between py-2">
                <span className="text-ink">Taxa bancária</span>
                <span className="font-mono text-ink">{brl(taxaBancaria)}</span>
              </li>
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-semibold text-ink">Total</span>
              <span className="font-mono text-base font-semibold text-brand">{brl(resultado.total)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
            <p className="mb-2 font-semibold">
              💢 Esses valores fazem parte de qualquer operação de compra e venda financiada. Pra
              facilitar, temos duas opções:
            </p>
            <ul className="space-y-2">
              <li>
                ▫️ <strong>ITBI:</strong> pode ser parcelado em até {numParcelasItbi} cotas de
                igual valor.
              </li>
              <li>
                ▫️ <strong>Escritura:</strong> é possível assinar o contrato emitido pelo banco,
                que tem força de escritura. Nesse caso, cuidamos da lavratura, da organização das
                assinaturas e de todo o traslado para registro (exigências, etc.). Esse é um
                serviço particular no valor de {brl(valorInstrumentoParticular)}, que substitui o
                valor da escritura em cartório.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-ink-muted">Total à vista (com instrumento particular)</p>
                <p className="font-mono text-3xl font-semibold text-ink">{brl(resultado.totalAVista)}</p>
              </div>
              <BotaoCopiarLink texto={textoWhatsapp} rotulo="Copiar como texto" />
            </div>
            {resultado.cotasRestantes > 0 && (
              <p className="mt-1 text-sm text-ink-muted">
                + {resultado.cotasRestantes} cota{resultado.cotasRestantes > 1 ? "s" : ""} mensa
                {resultado.cotasRestantes > 1 ? "is" : "l"} do ITBI de {brl(resultado.cotaItbi)}
              </p>
            )}
            <p className="mt-2 text-xs text-ink-muted">
              Registro ({brl(resultado.registro)}) + Taxa bancária ({brl(taxaBancaria)}) + 1ª cota
              do ITBI ({brl(resultado.cotaItbi)}). O serviço de instrumento particular (
              {brl(valorInstrumentoParticular)}) é cobrado à parte, direto com o despachante.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
