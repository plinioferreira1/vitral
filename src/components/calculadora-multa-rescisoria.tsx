"use client";

import { useState } from "react";
import { brl, parseBR, formatarEntradaBR, parseDataISO, diasEntre } from "@/lib/proporcionalidade";
import { hojeISO } from "@/lib/data-br";

export function CalculadoraMultaRescisoria() {
  const [aluguel, setAluguel] = useState("");
  const [meses, setMeses] = useState("3");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [rescisao, setRescisao] = useState(hojeISO());

  const valorAluguel = parseBR(aluguel);
  const qtdMeses = parseBR(meses);
  const dInicio = parseDataISO(inicio);
  const dFim = parseDataISO(fim);
  const dRescisao = parseDataISO(rescisao);

  let resultado: {
    multaTotal: number;
    diasTotais: number;
    diasRestantes: number;
    multaProporcional: number;
  } | null = null;
  let aviso: string | null = null;

  if (dInicio && dFim && dRescisao && !isNaN(valorAluguel) && !isNaN(qtdMeses)) {
    const diasTotais = diasEntre(dInicio, dFim);
    const diasRestantes = diasEntre(dRescisao, dFim);
    const multaTotal = valorAluguel * qtdMeses;

    if (diasTotais <= 0) {
      aviso = "A data de término precisa ser depois da data de início.";
    } else if (dRescisao < dInicio) {
      aviso = "A data de rescisão não pode ser antes do início do contrato.";
    } else if (diasRestantes <= 0) {
      resultado = { multaTotal, diasTotais, diasRestantes: 0, multaProporcional: 0 };
      aviso = "O contrato já venceu na data de rescisão informada — sem multa proporcional.";
    } else {
      const multaProporcional = multaTotal * (diasRestantes / diasTotais);
      resultado = { multaTotal, diasTotais, diasRestantes, multaProporcional };
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Multa Rescisória</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Calcula a multa proporcional por rescisão antecipada de contrato de locação (art. 4º da
          Lei do Inquilinato) — a multa contratual é reduzida proporcionalmente ao tempo que já
          se cumpriu do contrato.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
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

      {resultado && (
        <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
          <p className="text-xs text-ink-muted">Multa proporcional</p>
          <p className="font-mono text-3xl font-semibold text-ink">{brl(resultado.multaProporcional)}</p>

          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4 text-sm">
            <div>
              <p className="text-xs text-ink-muted">Multa total (contrato integral)</p>
              <p className="font-medium text-ink">{brl(resultado.multaTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Dias totais do contrato</p>
              <p className="font-medium text-ink">{resultado.diasTotais}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted">Dias restantes na rescisão</p>
              <p className="font-medium text-ink">{resultado.diasRestantes}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
