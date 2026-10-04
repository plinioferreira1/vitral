"use client";

import { useState } from "react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CanvasAssinatura } from "@/components/canvas-assinatura";
import { PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { salvarAssinaturaAvaliadora } from "./actions";

/** Converte uma imagem enviada para PNG de no máximo 900 px de largura. */
async function paraPng(arquivo: File): Promise<string> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, 900 / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export function AssinaturaForm() {
  const [imagem, setImagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  return (
    <form action={salvarAssinaturaAvaliadora} className="space-y-4">
      <input type="hidden" name="assinatura" value={imagem ?? ""} />
      <div>
        <p className="mb-2 text-xs font-medium text-ink-muted">Desenhe a assinatura (dedo, caneta ou mouse)</p>
        <CanvasAssinatura onChange={setImagem} />
      </div>
      <label className="block text-xs text-ink-muted">
        …ou envie uma imagem da assinatura (de preferência PNG com fundo transparente)
        <input
          type="file"
          accept="image/png,image/jpeg"
          className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm"
          onChange={async (e) => {
            const arquivo = e.target.files?.[0];
            if (!arquivo) return;
            try {
              setImagem(await paraPng(arquivo));
              setErro(null);
            } catch {
              setErro("Não foi possível ler a imagem.");
            }
          }}
        />
      </label>
      {imagem && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagem} alt="Prévia da assinatura" className="h-20 rounded-md border border-border bg-white object-contain px-3" />
      )}
      {erro && <p className="text-xs text-rose-700">{erro}</p>}
      <label className="flex items-start gap-2 text-sm text-ink">
        <input type="checkbox" name="consentimento" required className="mt-1 accent-brand" />
        Autorizo o Vitral a aplicar esta imagem da minha assinatura somente nos documentos de avaliação que eu mesma aprovar e emitir.
      </label>
      <BotaoEnviar className={PRIMARY_BUTTON_CLASS} textoEnviando="Salvando…" disabled={!imagem}>
        Salvar assinatura
      </BotaoEnviar>
    </form>
  );
}
