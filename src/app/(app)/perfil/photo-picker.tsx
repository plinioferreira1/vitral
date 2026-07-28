"use client";

import { useRef, useState, useCallback } from "react";

interface Props {
  fotoAtual: string | null;
  iniciais: string;
}

const TAMANHO_PREVIEW = 220;
const TAMANHO_SAIDA = 480;

export function SeletorFoto({ fotoAtual, iniciais }: Props) {
  const [imagemSrc, setImagemSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [arrastando, setArrastando] = useState(false);
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const arrastoInicioRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });

  const handleArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      setImagemSrc(leitor.result as string);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setFotoBase64(null);
    };
    leitor.readAsDataURL(arquivo);
  };

  const iniciarArrasto = (e: React.MouseEvent | React.TouchEvent) => {
    const ponto = "touches" in e ? e.touches[0] : e;
    arrastoInicioRef.current = {
      x: ponto.clientX,
      y: ponto.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
    setArrastando(true);
  };

  const moverArrasto = (e: React.MouseEvent | React.TouchEvent) => {
    if (!arrastando) return;
    const ponto = "touches" in e ? e.touches[0] : e;
    const dx = ponto.clientX - arrastoInicioRef.current.x;
    const dy = ponto.clientY - arrastoInicioRef.current.y;
    setOffset({
      x: arrastoInicioRef.current.offsetX + dx,
      y: arrastoInicioRef.current.offsetY + dy,
    });
  };

  const finalizarArrasto = () => setArrastando(false);

  const confirmarRecorte = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;

    const canvas = document.createElement("canvas");
    canvas.width = TAMANHO_SAIDA;
    canvas.height = TAMANHO_SAIDA;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const escala = TAMANHO_SAIDA / TAMANHO_PREVIEW;
    const larguraNatural = img.naturalWidth;
    const alturaNatural = img.naturalHeight;
    const escalaBase = Math.max(TAMANHO_PREVIEW / larguraNatural, TAMANHO_PREVIEW / alturaNatural);
    const escalaFinal = escalaBase * zoom;

    const larguraDesenhada = larguraNatural * escalaFinal * escala;
    const alturaDesenhada = alturaNatural * escalaFinal * escala;

    const x = TAMANHO_SAIDA / 2 - larguraDesenhada / 2 + offset.x * escala;
    const y = TAMANHO_SAIDA / 2 - alturaDesenhada / 2 + offset.y * escala;

    ctx.save();
    ctx.beginPath();
    ctx.arc(TAMANHO_SAIDA / 2, TAMANHO_SAIDA / 2, TAMANHO_SAIDA / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x, y, larguraDesenhada, alturaDesenhada);
    ctx.restore();

    setFotoBase64(canvas.toDataURL("image/jpeg", 0.9));
  }, [zoom, offset]);

  return (
    <div className="flex items-center gap-4">
      {!imagemSrc ? (
        <>
          {fotoAtual ? (
            <img
              src={fotoAtual}
              alt=""
              className="h-16 w-16 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-lg font-serif font-semibold text-white">
              {iniciais || "?"}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Foto de perfil
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleArquivo}
              className="block text-xs text-ink-muted file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-xs file:text-ink hover:file:bg-border"
            />
          </div>
        </>
      ) : (
        <div className="w-full">
          {!fotoBase64 ? (
            <>
              <p className="mb-2 text-xs text-ink-muted">
                Arraste pra posicionar e use o controle pra dar zoom.
              </p>
              <div
                className="relative mx-auto overflow-hidden rounded-full border border-border bg-background"
                style={{ width: TAMANHO_PREVIEW, height: TAMANHO_PREVIEW, cursor: arrastando ? "grabbing" : "grab" }}
                onMouseDown={iniciarArrasto}
                onMouseMove={moverArrasto}
                onMouseUp={finalizarArrasto}
                onMouseLeave={finalizarArrasto}
                onTouchStart={iniciarArrasto}
                onTouchMove={moverArrasto}
                onTouchEnd={finalizarArrasto}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={imagemSrc}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                  style={{
                    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    width: TAMANHO_PREVIEW,
                    height: "auto",
                  }}
                />
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="mx-auto mt-3 block w-[220px] accent-brand"
              />
              <div className="mt-3 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={confirmarRecorte}
                  className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                >
                  Usar essa foto
                </button>
                <button
                  type="button"
                  onClick={() => setImagemSrc(null)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs text-ink-muted hover:bg-background"
                >
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <img src={fotoBase64} alt="" className="h-16 w-16 rounded-full border border-border object-cover" />
              <button
                type="button"
                onClick={() => {
                  setImagemSrc(null);
                  setFotoBase64(null);
                }}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-ink-muted hover:bg-background"
              >
                Escolher outra foto
              </button>
            </div>
          )}
        </div>
      )}

      <input type="hidden" name="foto_base64" value={fotoBase64 ?? ""} />
    </div>
  );
}
