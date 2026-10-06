"use client";

import { useState } from "react";
import { Loader2, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { prepararUpload } from "./actions";

/**
 * Anexo do Departamento Pessoal: pede ao servidor um link de envio de uso
 * único e manda o arquivo direto para a pasta privada. Entrega o caminho
 * ao formulário nos campos ocultos `<nome>_caminho` e `<nome>_nome`.
 */
export function CampoArquivo({ destino, colaboradorId, seletorColaborador, rotulo = "Anexar arquivo", nome = "anexo", obrigatorio = false }: { destino: "documento" | "ausencia" | "correcao" | "foto"; colaboradorId?: string; seletorColaborador?: string; rotulo?: string; nome?: string; obrigatorio?: boolean }) {
  const [caminho, setCaminho] = useState("");
  const [arquivoNome, setArquivoNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(arquivo: File | undefined, campo: HTMLInputElement) {
    if (!arquivo) return;
    setErro(null);
    // quando o colaborador é escolhido no próprio formulário, lê o valor de lá
    const alvo = colaboradorId ?? (seletorColaborador ? (campo.form?.elements.namedItem(seletorColaborador) as HTMLSelectElement | null)?.value : "") ?? "";
    if (!alvo) return setErro("Escolha primeiro o colaborador.");
    if (arquivo.size > 10 * 1024 * 1024) return setErro("Arquivo maior que 10 MB.");
    setEnviando(true);
    const preparo = await prepararUpload(destino, alvo, arquivo.name);
    if (!preparo.ok || !preparo.caminho || !preparo.token) {
      setEnviando(false);
      return setErro(preparo.erro ?? "Não foi possível enviar.");
    }
    const { error } = await createClient().storage.from("departamento-pessoal").uploadToSignedUrl(preparo.caminho, preparo.token, arquivo, { contentType: arquivo.type });
    setEnviando(false);
    if (error) return setErro(`Não foi possível enviar: ${error.message}`);
    setCaminho(preparo.caminho);
    setArquivoNome(arquivo.name);
  }

  return (
    <div>
      <input type="hidden" name={`${nome}_caminho`} value={caminho} />
      <input type="hidden" name={`${nome}_nome`} value={arquivoNome} />
      <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-strong bg-background px-3 py-2.5 text-xs font-medium text-ink-muted hover:border-brand hover:text-brand ${enviando ? "pointer-events-none opacity-70" : ""}`}>
        {enviando ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
        <span className="max-w-[220px] truncate">{enviando ? "Enviando…" : arquivoNome ? `Anexado: ${arquivoNome}` : `${rotulo}${obrigatorio ? " *" : ""}`}</span>
        <input type="file" accept="application/pdf,image/*" className="sr-only" onChange={(e) => { void enviar(e.target.files?.[0], e.target); e.target.value = ""; }} />
      </label>
      {erro && <p className="mt-1 text-xs text-rose-700">{erro}</p>}
    </div>
  );
}
