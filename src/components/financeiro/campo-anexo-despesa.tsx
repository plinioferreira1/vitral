"use client";

import { useId, useState } from "react";
import { Paperclip } from "lucide-react";
import { erroArquivoDespesa, TIPOS_ANEXO_DESPESA } from "@/lib/anexo-despesa";

export function CampoAnexoDespesa({ obrigatorio = false }: { obrigatorio?: boolean }) {
  const id = useId();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Paperclip size={16} /> Boleto ou outro documento{!obrigatorio && " (opcional)"}
      </label>
      <input id={id} type="file" name="anexo" required={obrigatorio} accept={TIPOS_ANEXO_DESPESA.join(",")}
        aria-describedby={`${id}-ajuda`} aria-invalid={!!erro}
        className="block w-full rounded-lg border border-border p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-background file:px-3 file:py-2"
        onChange={(event) => {
          const arquivo = event.currentTarget.files?.[0];
          const mensagem = arquivo ? erroArquivoDespesa(arquivo) : null;
          setErro(mensagem);
          event.currentTarget.setCustomValidity(mensagem ?? "");
        }} />
      <p id={`${id}-ajuda`} className="text-xs text-ink-muted">PDF, JPG, PNG ou WebP, até 3 MB. O arquivo fica restrito a quem tem acesso ao Financeiro.</p>
      {erro && <p role="alert" className="text-sm text-rose-700">{erro}</p>}
    </div>
  );
}
