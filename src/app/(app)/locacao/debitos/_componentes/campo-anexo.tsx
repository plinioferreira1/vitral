"use client";

import { useState } from "react";
import { Loader2, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Envia o boleto/DAR para a pasta privada e entrega o caminho ao formulário. */
export function CampoAnexo({ tenantId, contratoId, rotulo }: { tenantId: string; contratoId: string; rotulo: string }) {
  const [caminho, setCaminho] = useState("");
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    if (arquivo.size > 10 * 1024 * 1024) {
      setErro("Arquivo maior que 10 MB.");
      return;
    }
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(arquivo.type)) {
      setErro("Envie PDF ou imagem (JPG, PNG).");
      return;
    }
    setEnviando(true);
    const extensao = arquivo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
    const destino = `${tenantId}/${contratoId}/${crypto.randomUUID()}.${extensao}`;
    const { error } = await createClient().storage.from("debitos-locacao").upload(destino, arquivo, { contentType: arquivo.type, upsert: false });
    setEnviando(false);
    if (error) {
      setErro(`Não foi possível enviar: ${error.message}`);
      return;
    }
    setCaminho(destino);
    setNome(arquivo.name);
  }

  return (
    <div>
      <input type="hidden" name="anexo_caminho" value={caminho} />
      <input type="hidden" name="anexo_nome" value={nome} />
      <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-strong bg-background px-3 py-2 text-xs font-medium text-ink-muted hover:border-brand hover:text-brand ${enviando ? "pointer-events-none opacity-70" : ""}`}>
        {enviando ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
        {enviando ? "Enviando…" : nome ? `Anexado: ${nome}` : rotulo}
        <input type="file" accept="application/pdf,image/*" className="sr-only" onChange={(e) => enviar(e.target.files?.[0])} />
      </label>
      {erro && <p className="mt-1 text-xs text-rose-700">{erro}</p>}
    </div>
  );
}
