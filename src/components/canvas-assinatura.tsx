"use client";

import { useRef, useState, useEffect } from "react";

export function CanvasAssinatura({
  onChange,
}: {
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [vazio, setVazio] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function posicao(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function iniciar(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    desenhando.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = posicao(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = posicao(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (vazio) setVazio(false);
  }

  function soltar() {
    if (!desenhando.current) return;
    desenhando.current = false;
    const canvas = canvasRef.current!;
    onChange(vazio ? null : canvas.toDataURL("image/png"));
  }

  function limpar() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setVazio(true);
    onChange(null);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={600}
        height={220}
        onPointerDown={iniciar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerLeave={soltar}
        className="w-full touch-none rounded-lg border border-border bg-white"
        style={{ aspectRatio: "600 / 220" }}
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-ink-muted">Desenhe sua assinatura na área acima</p>
        <button
          type="button"
          onClick={limpar}
          className="text-xs font-medium text-ink-muted hover:text-brand"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
