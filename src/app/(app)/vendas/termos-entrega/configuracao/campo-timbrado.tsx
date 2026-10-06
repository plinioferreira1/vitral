"use client";

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Envia a imagem do papel timbrado (A4) para a pasta privada e entrega o caminho ao formulário. */
export function CampoTimbrado({ tenantId }: { tenantId: string }) {
  const [caminho, setCaminho] = useState("");
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    if (!["image/jpeg", "image/png"].includes(arquivo.type)) return setErro("Envie a imagem do papel timbrado em JPG ou PNG (página A4 inteira).");
    if (arquivo.size > 6 * 1024 * 1024) return setErro("Imagem maior que 6 MB. Reduza a resolução (cerca de 1650 × 2340 pixels é suficiente).");
    setEnviando(true);
    const destino = `${tenantId}/timbrado/${Date.now()}.${arquivo.type === "image/png" ? "png" : "jpg"}`;
    const { error } = await createClient().storage.from("termos-entrega").upload(destino, arquivo, { contentType: arquivo.type, upsert: false });
    setEnviando(false);
    if (error) return setErro(`Não foi possível enviar: ${error.message}`);
    setCaminho(destino);
    setNome(arquivo.name);
  }

  return (
    <div>
      <input type="hidden" name="timbrado_caminho" value={caminho} />
      <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-strong bg-background px-3 py-2 text-xs font-medium text-ink-muted hover:border-brand hover:text-brand ${enviando ? "pointer-events-none opacity-70" : ""}`}>
        {enviando ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {enviando ? "Enviando…" : nome ? `Novo timbrado: ${nome} (salve para aplicar)` : "Enviar novo papel timbrado"}
        <input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(e) => enviar(e.target.files?.[0])} />
      </label>
      {erro && <p className="mt-1 text-xs text-rose-700">{erro}</p>}
    </div>
  );
}
