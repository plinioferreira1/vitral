"use client";

import { useState } from "react";
import { Loader2, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BotaoEnviar } from "@/components/botao-enviar";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { BUCKET_DOCUMENTOS_LOCACAO, erroArquivoDocumento, ROTULO_TIPO, TIPOS_DOCUMENTO } from "@/lib/locacao/documentos";
import { prepararEnvioDocumento, registrarDocumento } from "@/app/(app)/locacao/[id]/documentos-actions";

/**
 * Formulário de novo documento: o arquivo vai direto para a pasta privada
 * (link de envio de uso único) e o servidor confere e registra ao salvar.
 */
export function EnvioDocumentoContrato({ contratoId }: { contratoId: string }) {
  const [caminho, setCaminho] = useState("");
  const [arquivoNome, setArquivoNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    setCaminho("");
    setArquivoNome("");
    const invalido = erroArquivoDocumento(arquivo);
    if (invalido) return setErro(invalido);
    setEnviando(true);
    const preparo = await prepararEnvioDocumento(contratoId, arquivo.name, arquivo.size);
    if (!preparo.ok || !preparo.caminho || !preparo.token) {
      setEnviando(false);
      return setErro(preparo.erro ?? "Não foi possível enviar.");
    }
    const { error } = await createClient()
      .storage.from(BUCKET_DOCUMENTOS_LOCACAO)
      .uploadToSignedUrl(preparo.caminho, preparo.token, arquivo, { contentType: arquivo.type || undefined });
    setEnviando(false);
    if (error) return setErro("Não foi possível enviar o arquivo. Tente de novo.");
    setCaminho(preparo.caminho);
    setArquivoNome(arquivo.name);
  }

  return (
    <form
      action={async (dados) => {
        await registrarDocumento(dados);
        setCaminho("");
        setArquivoNome("");
      }}
      className="grid gap-3 rounded-xl border border-border/70 bg-background p-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <input type="hidden" name="contrato_id" value={contratoId} />
      <input type="hidden" name="arquivo_caminho" value={caminho} />
      <input type="hidden" name="arquivo_nome" value={arquivoNome} />
      <label className="text-xs font-medium text-ink-muted">
        Tipo
        <select name="tipo" required defaultValue="" className={`${INPUT_CLASS} mt-1 min-h-11`}>
          <option value="" disabled>Escolha…</option>
          {TIPOS_DOCUMENTO.map((t) => (
            <option key={t} value={t}>{ROTULO_TIPO[t]}</option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-ink-muted">
        Data do documento
        <input type="date" name="data_documento" className={`${INPUT_CLASS} mt-1 min-h-11`} />
      </label>
      <label className="text-xs font-medium text-ink-muted sm:col-span-2">
        Complemento do nome <span className="font-normal">(opcional, ex.: 2º aditivo, vistoria de saída)</span>
        <input name="complemento" maxLength={60} className={`${INPUT_CLASS} mt-1 min-h-11`} />
      </label>
      <label className="text-xs font-medium text-ink-muted sm:col-span-2 lg:col-span-3">
        Observação <span className="font-normal">(opcional)</span>
        <input name="observacao" maxLength={500} className={`${INPUT_CLASS} mt-1 min-h-11`} />
      </label>
      <div className="flex flex-col justify-end">
        <label
          className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface px-3 py-2 text-xs font-medium text-ink-muted hover:border-brand hover:text-brand ${enviando ? "pointer-events-none opacity-70" : ""}`}
        >
          {enviando ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Paperclip size={14} aria-hidden="true" />}
          <span className="min-w-0 truncate">{enviando ? "Enviando…" : arquivoNome ? `Anexado: ${arquivoNome}` : "Escolher arquivo (PDF ou imagem)"}</span>
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => {
              void enviar(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {erro && <p role="alert" className="text-xs text-rose-700 sm:col-span-2 lg:col-span-4">{erro}</p>}
      <div className="sm:col-span-2 lg:col-span-4">
        <BotaoEnviar disabled={!caminho || enviando} className={`${PRIMARY_BUTTON_CLASS} min-h-11 disabled:opacity-50`}>
          Salvar documento
        </BotaoEnviar>
        <p className="mt-1.5 text-[11px] text-ink-muted">O nome é montado assim: tipo — número do contrato — endereço — data. Até 15 MB.</p>
      </div>
    </form>
  );
}
