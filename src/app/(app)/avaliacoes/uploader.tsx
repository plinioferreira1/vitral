"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registrarArquivo } from "./actions";

const LADO_MAXIMO = 1800;

/** Reduz e converte a foto para JPEG no navegador (PDF menor, envio rápido). */
async function prepararImagem(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível converter a imagem."))), "image/jpeg", 0.84)
  );
}

export function Uploader({
  avaliacaoId,
  tenantId,
  tipo,
  comparavelId,
  aceitaPdf = false,
  multiplo = true,
  rotulo,
  compacto = false,
}: {
  avaliacaoId: string;
  tenantId: string;
  tipo: "imovel" | "vistoria" | "mapa" | "matricula" | "anexo" | "comparavel";
  comparavelId?: string;
  aceitaPdf?: boolean;
  multiplo?: boolean;
  rotulo: string;
  compacto?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function enviar(arquivos: FileList | null) {
    if (!arquivos || arquivos.length === 0) return;
    setEnviando(true);
    setMensagem(null);
    const supabase = createClient();
    const erros: string[] = [];
    for (const arquivo of Array.from(arquivos).slice(0, 12)) {
      try {
        const ehPdf = arquivo.type === "application/pdf";
        if (ehPdf && !aceitaPdf) throw new Error("aqui só entram imagens.");
        if (!ehPdf && !arquivo.type.startsWith("image/")) throw new Error("formato não aceito.");
        const conteudo = ehPdf ? arquivo : await prepararImagem(arquivo);
        if (conteudo.size > 10 * 1024 * 1024) throw new Error("arquivo maior que 10 MB.");
        const mime = ehPdf ? "application/pdf" : "image/jpeg";
        const caminho = `${tenantId}/${avaliacaoId}/${tipo}/${crypto.randomUUID()}.${ehPdf ? "pdf" : "jpg"}`;
        const { error } = await supabase.storage.from("avaliacoes").upload(caminho, conteudo, { contentType: mime, upsert: false });
        if (error) throw new Error(error.message);
        const resultado = await registrarArquivo({
          avaliacaoId,
          tipo: tipo === "comparavel" ? "anexo" : tipo,
          caminho,
          nome: arquivo.name,
          mime,
          tamanho: conteudo.size,
          comparavelId,
        });
        if (!resultado.ok) throw new Error(resultado.erro ?? "falha ao registrar.");
      } catch (erro) {
        erros.push(`${arquivo.name}: ${erro instanceof Error ? erro.message : "falha no envio."}`);
      }
    }
    setEnviando(false);
    setMensagem(erros.length ? erros.join(" ") : null);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div>
      <label
        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-strong bg-background font-medium text-ink-muted hover:border-brand hover:text-brand ${
          compacto ? "px-2.5 py-1.5 text-xs" : "px-4 py-3 text-sm"
        } ${enviando ? "pointer-events-none opacity-70" : ""}`}
      >
        {enviando ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
        {enviando ? "Enviando…" : rotulo}
        <input
          ref={inputRef}
          type="file"
          accept={aceitaPdf ? "image/*,application/pdf" : "image/*"}
          multiple={multiplo}
          className="sr-only"
          onChange={(e) => enviar(e.target.files)}
        />
      </label>
      {mensagem && <p className="mt-2 text-xs text-rose-700">{mensagem}</p>}
    </div>
  );
}
