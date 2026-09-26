"use client";

import { useState } from "react";

type Dia = { rotulo: string; entradas: number; saidas: number };

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/**
 * Barras agrupadas (entradas x saídas) por dia, sem depender de
 * biblioteca externa de gráficos. Cores fixas por status
 * (entradas = verde/sucesso, saídas = vermelho/crítico), não por
 * categoria — por isso não seguem a paleta categórica.
 */
export function GraficoFluxoCaixa({ dias }: { dias: Dia[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...dias.map((d) => Math.max(d.entradas, d.saidas)));
  const largura = 760;
  const altura = 180;
  const margemBaixo = 20;
  const areaAltura = altura - margemBaixo;
  const passo = largura / dias.length;
  const larguraBarra = Math.max(2, Math.min(10, passo * 0.32));

  return (
    <div className="relative">
      <div className="mb-2 flex items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#0F7A4E" }} /> Entradas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: "#B91C1C" }} /> Saídas
        </span>
      </div>
      <svg viewBox={`0 0 ${largura} ${altura}`} className="w-full" style={{ height: altura }}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={0}
            x2={largura}
            y1={areaAltura - areaAltura * f}
            y2={areaAltura - areaAltura * f}
            stroke="var(--border)"
            strokeWidth={1}
            opacity={0.5}
          />
        ))}
        {dias.map((d, i) => {
          const x = i * passo + passo / 2;
          const hEntrada = (d.entradas / max) * (areaAltura - 4);
          const hSaida = (d.saidas / max) * (areaAltura - 4);
          const ativo = hover === i;
          return (
            <g
              key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            >
              <rect x={x - larguraBarra - 1} y={0} width={larguraBarra * 2 + 2} height={areaAltura} fill="transparent" />
              <rect
                x={x - larguraBarra - 1}
                y={areaAltura - hEntrada}
                width={larguraBarra}
                height={Math.max(hEntrada, 1)}
                rx={2}
                fill="#0F7A4E"
                opacity={ativo ? 1 : 0.85}
              />
              <rect
                x={x + 1}
                y={areaAltura - hSaida}
                width={larguraBarra}
                height={Math.max(hSaida, 1)}
                rx={2}
                fill="#B91C1C"
                opacity={ativo ? 1 : 0.85}
              />
              {i % Math.ceil(dias.length / 8) === 0 && (
                <text x={x} y={altura - 4} textAnchor="middle" fontSize={9} fill="var(--ink-muted, #7a7168)">
                  {d.rotulo}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs shadow-md">
          <p className="font-medium text-ink">{dias[hover].rotulo}</p>
          <p style={{ color: "#0F7A4E" }}>Entradas: {brl(dias[hover].entradas)}</p>
          <p style={{ color: "#B91C1C" }}>Saídas: {brl(dias[hover].saidas)}</p>
        </div>
      )}
    </div>
  );
}
