"use client";

import { useState } from "react";
import { brl, parseBR, formatarEntradaBR } from "@/lib/proporcionalidade";
import { gerarMemoriaAvaliacaoPNG } from "@/lib/canvas-memoria-avaliacao";

interface Comparavel {
  id: string;
  endereco: string;
  area: string;
  fonte: "anuncio" | "venda_realizada";
  valorPesquisado: string;
  calibragemPercentual: string;
}

function novoComparavel(): Comparavel {
  return {
    id: Math.random().toString(36).slice(2),
    endereco: "",
    area: "",
    fonte: "anuncio",
    valorPesquisado: "",
    calibragemPercentual: "5",
  };
}

export function CalculadoraAvaliacao() {
  const [areaImovel, setAreaImovel] = useState("");
  const [comparaveis, setComparaveis] = useState<Comparavel[]>([novoComparavel(), novoComparavel()]);
  const [exportando, setExportando] = useState(false);

  function atualizar(id: string, campo: keyof Comparavel, valor: string) {
    setComparaveis((lista) =>
      lista.map((c) => (c.id === id ? { ...c, [campo]: valor } : c))
    );
  }

  function remover(id: string) {
    setComparaveis((lista) => lista.filter((c) => c.id !== id));
  }

  const linhas = comparaveis
    .map((c) => {
      const area = parseBR(c.area);
      const valor = parseBR(c.valorPesquisado);
      const calibragemPct = parseBR(c.calibragemPercentual);
      if (isNaN(area) || area <= 0 || isNaN(valor) || valor <= 0) return null;

      const fatorCalibragem =
        c.fonte === "venda_realizada" && !isNaN(calibragemPct) ? valor * (calibragemPct / 100) : 0;
      const valorM2 = (valor + fatorCalibragem) / area;
      return { ...c, area, valor, fatorCalibragem, valorM2 };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  const mediaM2 =
    linhas.length > 0 ? linhas.reduce((soma, l) => soma + l.valorM2, 0) / linhas.length : null;

  const areaImovelNum = parseBR(areaImovel);
  const valorSugerido =
    mediaM2 !== null && !isNaN(areaImovelNum) && areaImovelNum > 0 ? mediaM2 * areaImovelNum : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Avaliação de Imóvel</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Sugere um valor de anúncio comparando imóveis parecidos na região. Cada comparável do
          tipo &quot;Venda realizada&quot; é ajustado pra cima pelo percentual de calibragem — o
          valor vendido tende a ser menor que o valor anunciado, então isso estima de volta o
          valor de anúncio equivalente.
        </p>
      </div>

      <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <label className="mb-1 block text-xs font-medium text-ink-muted">
          Área construída do imóvel avaliando (m²)
        </label>
        <input
          value={areaImovel}
          onChange={(e) => setAreaImovel(e.target.value)}
          placeholder="Ex: 56"
          inputMode="decimal"
          className="w-48 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">Imóveis comparáveis</p>
          <button
            type="button"
            onClick={() => setComparaveis((lista) => [...lista, novoComparavel()])}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-background"
          >
            + Adicionar comparável
          </button>
        </div>

        {comparaveis.map((c, i) => (
          <div key={c.id} className="rounded-xl border border-border/60 bg-surface p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Comparável {i + 1}
              </p>
              {comparaveis.length > 1 && (
                <button
                  type="button"
                  onClick={() => remover(c.id)}
                  className="text-xs text-ink-muted hover:text-rose-600"
                >
                  Remover
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Endereço / referência
                </label>
                <input
                  value={c.endereco}
                  onChange={(e) => atualizar(c.id, "endereco", e.target.value)}
                  placeholder="Ex: QI 10 Bloco T"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Área construída (m²)</label>
                <input
                  value={c.area}
                  onChange={(e) => atualizar(c.id, "area", e.target.value)}
                  placeholder="Ex: 56"
                  inputMode="decimal"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Fonte da pesquisa</label>
                <select
                  value={c.fonte}
                  onChange={(e) => atualizar(c.id, "fonte", e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                >
                  <option value="anuncio">Anúncio</option>
                  <option value="venda_realizada">Venda realizada</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">
                  Valor pesquisado (R$)
                </label>
                <input
                  value={c.valorPesquisado}
                  onChange={(e) => atualizar(c.id, "valorPesquisado", e.target.value)}
                  onBlur={() => {
                    const v = parseBR(c.valorPesquisado);
                    if (!isNaN(v)) atualizar(c.id, "valorPesquisado", formatarEntradaBR(v));
                  }}
                  placeholder="0,00"
                  inputMode="decimal"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                />
              </div>
              {c.fonte === "venda_realizada" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">
                    Calibragem (%)
                  </label>
                  <input
                    value={c.calibragemPercentual}
                    onChange={(e) => atualizar(c.id, "calibragemPercentual", e.target.value)}
                    placeholder="5"
                    inputMode="decimal"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                  />
                </div>
              )}
            </div>

            {(() => {
              const linha = linhas.find((l) => l.id === c.id);
              return linha ? (
                <p className="mt-3 border-t border-border pt-3 text-xs text-ink-muted">
                  Valor de mercado do m²: <strong className="text-ink">{brl(linha.valorM2)}</strong>
                  {linha.fatorCalibragem > 0 && (
                    <> (valor pesquisado + {brl(linha.fatorCalibragem)} de calibragem, ÷ área)</>
                  )}
                </p>
              ) : null;
            })()}
          </div>
        ))}
      </div>

      {mediaM2 !== null && (
        <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-ink-muted">
                Valor de mercado médio do m² ({linhas.length} comparável{linhas.length > 1 ? "is" : ""})
              </p>
              <p className="font-mono text-xl font-semibold text-ink">{brl(mediaM2)}</p>
            </div>
            {valorSugerido !== null && (
              <button
                type="button"
                disabled={exportando}
                onClick={async () => {
                  setExportando(true);
                  try {
                    await gerarMemoriaAvaliacaoPNG({
                      areaImovel: areaImovelNum,
                      comparaveis: linhas.map((l) => ({
                        endereco: l.endereco || "—",
                        area: l.area,
                        fonte: l.fonte === "anuncio" ? "Anúncio" : "Venda realizada",
                        valorPesquisado: l.valor,
                        fatorCalibragem: l.fatorCalibragem,
                        valorM2: l.valorM2,
                      })),
                      mediaM2,
                      valorSugerido,
                    });
                  } finally {
                    setExportando(false);
                  }
                }}
                className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-background disabled:opacity-60"
              >
                {exportando ? "Gerando..." : "Exportar memória de cálculo"}
              </button>
            )}
          </div>

          {valorSugerido !== null && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs text-ink-muted">Valor de anúncio sugerido</p>
              <p className="font-mono text-3xl font-semibold text-ink">{brl(valorSugerido)}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {brl(mediaM2)}/m² × {areaImovelNum} m²
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
