"use client";

import { useState } from "react";
import { brl, parseBR, formatarEntradaBR, parseDataISO, diasEntre } from "@/lib/proporcionalidade";
import { hojeISO } from "@/lib/data-br";
import { gerarMemoriaMultaPNG } from "@/lib/canvas-memoria-multa";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { Calculator, FileText, Layers, CalendarClock, Clock3, Percent, Info } from "lucide-react";

function formatarDataCurta(iso: string): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

function pct(v: number): string {
  return `${(v * 100).toFixed(2).replace(".", ",")}%`;
}

export function CalculadoraMultaRescisoria() {
  const [aluguel, setAluguel] = useState("");
  const [meses, setMeses] = useState("3");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [rescisao, setRescisao] = useState(hojeISO());
  const [exportando, setExportando] = useState(false);

  const valorAluguel = parseBR(aluguel);
  const qtdMeses = parseBR(meses);
  const dInicio = parseDataISO(inicio);
  const dFim = parseDataISO(fim);
  const dRescisao = parseDataISO(rescisao);

  let resultado: {
    multaTotal: number;
    mesesTotais: number;
    mesesRestantes: number;
    multaProporcional: number;
    fracaoCumprida: number;
    fracaoRestante: number;
  } | null = null;
  let aviso: string | null = null;

  if (dInicio && dFim && dRescisao && !isNaN(valorAluguel) && !isNaN(qtdMeses)) {
    const diasTotais = diasEntre(dInicio, dFim);
    const diasRestantes = diasEntre(dRescisao, dFim);
    const mesesTotais = diasTotais / 30;
    const mesesRestantes = diasRestantes / 30;
    const multaTotal = valorAluguel * qtdMeses;

    if (diasTotais <= 0) {
      aviso = "A data de término precisa ser depois da data de início.";
    } else if (dRescisao < dInicio) {
      aviso = "A data de rescisão não pode ser antes do início do contrato.";
    } else if (diasRestantes <= 0) {
      resultado = {
        multaTotal,
        mesesTotais,
        mesesRestantes: 0,
        multaProporcional: 0,
        fracaoCumprida: 1,
        fracaoRestante: 0,
      };
      aviso = "O contrato já venceu na data de rescisão informada — sem multa proporcional.";
    } else {
      const fracaoRestante = mesesRestantes / mesesTotais;
      const multaProporcional = multaTotal * fracaoRestante;
      resultado = {
        multaTotal,
        mesesTotais,
        mesesRestantes,
        multaProporcional,
        fracaoCumprida: 1 - fracaoRestante,
        fracaoRestante,
      };
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <CabecalhoSecao
        icon={Calculator}
        titulo="Multa Rescisória"
        descricao="Calcula a multa proporcional por rescisão antecipada de contrato de locação (art. 4º da Lei do Inquilinato) — a multa contratual é reduzida proporcionalmente ao tempo que já se cumpriu do contrato."
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex-1 space-y-4 rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Valor do aluguel (R$)</label>
              <input
                value={aluguel}
                onChange={(e) => setAluguel(e.target.value)}
                onBlur={() => {
                  const v = parseBR(aluguel);
                  if (!isNaN(v)) setAluguel(formatarEntradaBR(v));
                }}
                placeholder="0,00"
                inputMode="decimal"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">
                Multa contratual (meses de aluguel)
              </label>
              <input
                value={meses}
                onChange={(e) => setMeses(e.target.value)}
                placeholder="3"
                inputMode="decimal"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Início do contrato</label>
              <input
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Término do contrato</label>
              <input
                type="date"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Data da rescisão</label>
              <input
                type="date"
                value={rescisao}
                onChange={(e) => setRescisao(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>

          {aviso && (
            <p
              className={`rounded-md border px-3 py-2 text-sm ${
                resultado
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {aviso}
            </p>
          )}
        </div>

        <div className="w-full shrink-0 space-y-4 lg:w-96">
          <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
            <CabecalhoSecao icon={FileText} titulo="Resultado da simulação" descricao="Com base nas informações fornecidas, veja o detalhamento da multa." />

            {!resultado ? (
              <p className="text-sm text-ink-muted">Preencha os dados ao lado pra calcular.</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-rose-50 p-4">
                  <div>
                    <p className="text-sm font-medium text-rose-700">Valor estimado da multa</p>
                    <p className="num text-3xl font-bold text-rose-700">{brl(resultado.multaProporcional)}</p>
                    <p className="mt-0.5 text-xs text-rose-700/80">
                      Equivalente a {(resultado.fracaoRestante * qtdMeses).toFixed(2).replace(".", ",")} meses de
                      aluguel
                    </p>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                    <Percent size={22} strokeWidth={2} />
                  </div>
                </div>

                <div className="mt-4 divide-y divide-border text-sm">
                  <div className="flex items-center gap-3 py-2.5">
                    <Layers size={16} strokeWidth={2} className="shrink-0 text-ink-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="text-ink">Multa contratual cheia (total)</p>
                      <p className="text-xs text-ink-muted">
                        Valor correspondente a {qtdMeses.toFixed(2).replace(".", ",")} meses de aluguel
                      </p>
                    </div>
                    <p className="num shrink-0 font-medium text-ink">{brl(resultado.multaTotal)}</p>
                  </div>
                  <div className="flex items-center gap-3 py-2.5">
                    <CalendarClock size={16} strokeWidth={2} className="shrink-0 text-ink-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="text-ink">Tempo cumprido do contrato</p>
                      <p className="text-xs text-ink-muted">
                        {(resultado.mesesTotais - resultado.mesesRestantes).toFixed(1)} meses de um total de{" "}
                        {resultado.mesesTotais.toFixed(1)}
                      </p>
                    </div>
                    <p className="num shrink-0 font-medium text-ink">{pct(resultado.fracaoCumprida)}</p>
                  </div>
                  <div className="flex items-center gap-3 py-2.5">
                    <Clock3 size={16} strokeWidth={2} className="shrink-0 text-ink-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="text-ink">Tempo restante</p>
                      <p className="text-xs text-ink-muted">{resultado.mesesRestantes.toFixed(1)} meses restantes</p>
                    </div>
                    <p className="num shrink-0 font-medium text-ink">{pct(resultado.fracaoRestante)}</p>
                  </div>
                  <div className="flex items-center gap-3 py-2.5">
                    <FileText size={16} strokeWidth={2} className="shrink-0 text-ink-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="text-ink">Percentual da multa</p>
                      <p className="text-xs text-ink-muted">Proporcional ao tempo não cumprido</p>
                    </div>
                    <p className="num shrink-0 font-medium text-ink">{pct(resultado.fracaoRestante)}</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={exportando}
                  onClick={async () => {
                    setExportando(true);
                    try {
                      await gerarMemoriaMultaPNG({
                        aluguel: valorAluguel,
                        meses: qtdMeses,
                        inicio: formatarDataCurta(inicio),
                        fim: formatarDataCurta(fim),
                        rescisao: formatarDataCurta(rescisao),
                        multaTotal: resultado.multaTotal,
                        mesesTotais: resultado.mesesTotais,
                        mesesRestantes: resultado.mesesRestantes,
                        multaProporcional: resultado.multaProporcional,
                      });
                    } finally {
                      setExportando(false);
                    }
                  }}
                  className="mt-4 w-full rounded-md border border-border px-3 py-2 text-xs font-medium text-ink-muted hover:bg-background disabled:opacity-60"
                >
                  {exportando ? "Gerando..." : "Exportar memória de cálculo"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Info size={18} strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Como é calculada a multa rescisória?</p>
            <p className="mt-1 text-sm text-ink-muted">
              A multa por rescisão antecipada é proporcional ao tempo que falta para o término do
              contrato, conforme o art. 4º da Lei do Inquilinato.
            </p>
            <div className="mt-3 rounded-lg bg-surface p-3">
              <p className="text-xs font-semibold text-ink">Fórmula utilizada</p>
              <p className="mt-1 font-mono text-xs text-ink-muted">
                Valor da multa = Valor do aluguel × Meses de multa × (Tempo restante ÷ Tempo total do
                contrato)
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                O resultado é proporcional ao tempo que ainda falta ser cumprido.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
