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

export default function CartorioPage() {
  const [valor, setValor] = useState(0);
  const [temFinanciamento, setTemFinanciamento] = useState(false);
  const [valorFinanciado, setValorFinanciado] = useState(0);
  const [tipoImovel, setTipoImovel] = useState<"usado" | "novo">("usado");
  const [resultado, setResultado] = useState<{
    valor: number;
    valorFinanciado: number;
    itbi: number;
    escritura: number;
    registroCompraVenda: number;
    registroAlienacao: number;
    total: number;
  } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

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
    const registroCompraVenda = buscarFaixa(valor, FAIXAS_REGISTRO);
    // Quando tem financiamento, o registro da alienação fiduciária
    // (garantia do banco) é um registro à parte, incidindo só sobre
    // o valor financiado — não sobre o valor total do imóvel.
    const registroAlienacao = temFinanciamento ? buscarFaixa(valorFinanciado, FAIXAS_REGISTRO) : 0;

    setResultado({
      valor,
      valorFinanciado,
      itbi,
      escritura,
      registroCompraVenda,
      registroAlienacao,
      total: itbi + escritura + registroCompraVenda + registroAlienacao,
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Calculadora de Cartório
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
                  </span>
                </span>
                <span className="font-mono text-ink">{brl(resultado.registroCompraVenda)}</span>
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
