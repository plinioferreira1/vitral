"use client";

import { useState } from "react";

type Fatia = { nome: string; valor: number };

// Paleta categórica validada da skill de dataviz (ordem fixa, não ciclada).
const CORES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const COR_OUTROS = "#a8a29e";

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Donut categórico dependente só de SVG (sem lib de gráfico), com
 * legenda lateral e tooltip por fatia no hover. Agrupa o que passar
 * de `maxFatias` num bucket "Outros" (cor neutra, fora da paleta
 * categórica) — segue a regra de não estourar 8 séries coloridas.
 */
export function GraficoDonut({
  titulo,
  fatias,
  maxFatias = 6,
}: {
  titulo: string;
  fatias: Fatia[];
  maxFatias?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const ordenadas = [...fatias].filter((f) => f.valor > 0).sort((a, b) => b.valor - a.valor);
  const principais = ordenadas.slice(0, maxFatias);
  const resto = ordenadas.slice(maxFatias);
  const totalResto = resto.reduce((s, f) => s + f.valor, 0);
  const dados: (Fatia & { cor: string })[] = principais.map((f, i) => ({ ...f, cor: CORES[i] }));
  if (totalResto > 0) dados.push({ nome: "Outros", valor: totalResto, cor: COR_OUTROS });

  const total = dados.reduce((s, f) => s + f.valor, 0);
  const raio = 60;
  const espessura = 22;
  const circunferencia = 2 * Math.PI * raio;

  const { segmentos } = dados.reduce(
    (acc, f, i) => {
      const fracao = total > 0 ? f.valor / total : 0;
      const dash = fracao * circunferencia;
      const offset = -acc.acumulado * circunferencia;
      return {
        acumulado: acc.acumulado + fracao,
        segmentos: [...acc.segmentos, { ...f, dash, offset, indice: i }],
      };
    },
    { acumulado: 0, segmentos: [] as (Fatia & { cor: string; dash: number; offset: number; indice: number })[] }
  );

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-ink">{titulo}</p>
      <div className="flex items-center gap-6">
        <div className="relative shrink-0" style={{ width: 150, height: 150 }}>
          <svg viewBox="0 0 150 150" width={150} height={150} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={75} cy={75} r={raio} fill="none" stroke="var(--border)" strokeWidth={espessura} opacity={0.4} />
            {segmentos.map((s) => (
              <circle
                key={s.nome}
                cx={75}
                cy={75}
                r={raio}
                fill="none"
                stroke={s.cor}
                strokeWidth={espessura}
                strokeDasharray={`${s.dash} ${circunferencia - s.dash}`}
                strokeDashoffset={s.offset}
                opacity={hover === null || hover === s.indice ? 1 : 0.35}
                style={{ cursor: "pointer", transition: "opacity 120ms" }}
                onMouseEnter={() => setHover(s.indice)}
                onMouseLeave={() => setHover(null)}
              />
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="num text-base font-bold leading-tight text-ink">{brl(hover !== null ? segmentos[hover].valor : total)}</p>
            <p className="text-[10px] text-ink-muted">{hover !== null ? segmentos[hover].nome : "Total"}</p>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-1.5">
          {segmentos.length === 0 ? (
            <li className="text-xs text-ink-muted">Sem dados no período.</li>
          ) : (
            segmentos.map((s) => (
              <li
                key={s.nome}
                className="flex items-center justify-between gap-2 text-xs"
                onMouseEnter={() => setHover(s.indice)}
                onMouseLeave={() => setHover(null)}
              >
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.cor }} />
                  <span className="truncate text-ink-muted">{s.nome}</span>
                </span>
                <span className="shrink-0 text-ink-muted">
                  {((s.valor / (total || 1)) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%{" "}
                  <span className="num text-ink">{brl(s.valor)}</span>
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
