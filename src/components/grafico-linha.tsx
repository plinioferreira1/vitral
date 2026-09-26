"use client";

import { useState } from "react";

type Ponto = { rotulo: string; valor: number };

function brl(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

/**
 * Linha única (saldo acumulado) sem lib externa — área suave + linha
 * de 2px, cor azul (série sequencial/magnitude, não é categórica),
 * com crosshair e tooltip no hover.
 */
export function GraficoLinha({ pontos, cor = "#2a78d6" }: { pontos: Ponto[]; cor?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (pontos.length === 0) return <p className="text-sm text-ink-muted">Sem dados no período.</p>;

  const largura = 760;
  const altura = 200;
  const margemBaixo = 20;
  const areaAltura = altura - margemBaixo;
  const valores = pontos.map((p) => p.valor);
  const max = Math.max(1, ...valores);
  const min = Math.min(0, ...valores);
  const amplitude = max - min || 1;
  const passo = pontos.length > 1 ? largura / (pontos.length - 1) : largura;

  const y = (v: number) => areaAltura - ((v - min) / amplitude) * (areaAltura - 8) - 4;
  const linha = pontos.map((p, i) => `${i === 0 ? "M" : "L"} ${i * passo} ${y(p.valor)}`).join(" ");
  const area = `${linha} L ${(pontos.length - 1) * passo} ${areaAltura} L 0 ${areaAltura} Z`;
  const yZero = y(0);

  return (
    <div className="relative">
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
        {min < 0 && <line x1={0} x2={largura} y1={yZero} y2={yZero} stroke="var(--ink-muted, #7a7168)" strokeWidth={1} strokeDasharray="3 3" />}
        <path d={area} fill={cor} opacity={0.12} />
        <path d={linha} fill="none" stroke={cor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {pontos.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
            <rect x={i * passo - passo / 2} y={0} width={passo} height={areaAltura} fill="transparent" />
            {hover === i && <line x1={i * passo} x2={i * passo} y1={0} y2={areaAltura} stroke={cor} strokeWidth={1} opacity={0.4} />}
            <circle cx={i * passo} cy={y(p.valor)} r={hover === i ? 4 : 2.5} fill={cor} />
            {i % Math.ceil(pontos.length / 8) === 0 && (
              <text x={i * passo} y={altura - 4} textAnchor="middle" fontSize={9} fill="var(--ink-muted, #7a7168)">
                {p.rotulo}
              </text>
            )}
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-1 rounded-md border border-border bg-surface px-3 py-1.5 text-xs shadow-md"
          style={{ left: `${(hover / Math.max(1, pontos.length - 1)) * 100}%`, transform: "translateX(-50%)" }}
        >
          <p className="font-medium text-ink">{pontos[hover].rotulo}</p>
          <p style={{ color: cor }}>{brl(pontos[hover].valor)}</p>
        </div>
      )}
    </div>
  );
}
