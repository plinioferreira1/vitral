"use client";

import { useState } from "react";
import { gerarLinhaDoTempoPNG, type EtapaLinhaTempo } from "@/lib/canvas-linha-tempo";

export function BotaoExportarLinhaTempo({
  titulo,
  subtitulo,
  etapas,
}: {
  titulo: string;
  subtitulo: string;
  etapas: EtapaLinhaTempo[];
}) {
  const [gerando, setGerando] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        setGerando(true);
        try {
          gerarLinhaDoTempoPNG({ titulo, subtitulo, etapas, nomeArquivo: "linha-do-tempo" });
        } finally {
          setGerando(false);
        }
      }}
      disabled={gerando}
      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-background disabled:opacity-60"
    >
      {gerando ? "Gerando..." : "Exportar imagem"}
    </button>
  );
}
