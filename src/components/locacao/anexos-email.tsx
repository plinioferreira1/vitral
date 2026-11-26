"use client";

import { useState } from "react";
import { Download, Loader2, Paperclip } from "lucide-react";

type Anexo = { id: string; nome: string; tamanho: number };

/**
 * Anexos de um e-mail recebido em locacao@, lidos do Zoho na hora (só
 * leitura). Usa a mesma rota da caixa de e-mails, que confere a permissão.
 */
export function AnexosEmail({ mensagemId }: { mensagemId: string }) {
  const [anexos, setAnexos] = useState<Anexo[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function carregar() {
    setCarregando(true);
    setErro("");
    try {
      const resposta = await fetch(`/api/integracoes/zoho/locacao?attachmentsFor=${encodeURIComponent(mensagemId)}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const dados = (await resposta.json()) as { attachments?: Anexo[]; error?: string };
      if (!resposta.ok || !Array.isArray(dados.attachments)) throw new Error(dados.error || "Anexos indisponíveis.");
      setAnexos(dados.attachments);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível consultar os anexos.");
    } finally {
      setCarregando(false);
    }
  }

  if (anexos === null) {
    return (
      <div className="mt-1">
        <button
          type="button"
          onClick={() => void carregar()}
          disabled={carregando}
          className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-brand hover:underline disabled:opacity-60 sm:min-h-0"
        >
          {carregando ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Paperclip size={13} aria-hidden="true" />}
          {carregando ? "Consultando anexos…" : "Ver anexos"}
        </button>
        {erro && <p role="alert" className="text-xs text-rose-700">{erro}</p>}
      </div>
    );
  }

  if (anexos.length === 0) return <p className="mt-1 text-xs text-ink-muted">Nenhum anexo encontrado neste e-mail.</p>;

  return (
    <ul className="mt-1.5 space-y-1">
      {anexos.map((a) => (
        <li key={a.id}>
          <a
            href={`/api/integracoes/zoho/locacao?downloadMessage=${encodeURIComponent(mensagemId)}&attachmentId=${encodeURIComponent(a.id)}`}
            download={a.nome}
            className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-xs font-medium text-brand hover:bg-brand-soft sm:min-h-8"
          >
            <Download size={13} className="shrink-0" aria-hidden="true" />
            <span className="break-all">{a.nome}</span>
            {a.tamanho > 0 && <span className="shrink-0 text-ink-muted">{Math.max(1, Math.round(a.tamanho / 1024))} KB</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}
