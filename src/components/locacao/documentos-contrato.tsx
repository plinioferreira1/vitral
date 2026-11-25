import { FileText, FolderOpen } from "lucide-react";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { EnvioDocumentoContrato } from "@/components/locacao/envio-documento-contrato";
import { ROTULO_TIPO, TIPOS_DOCUMENTO } from "@/lib/locacao/documentos";
import { tabelaDocumentos, type LinhaDocumentoLocacao } from "@/lib/locacao/documentos-banco";
import { createClient } from "@/lib/supabase/server";
import { removerDocumento } from "@/app/(app)/locacao/[id]/documentos-actions";

function dataBR(iso: string | null): string {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

function tamanho(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const BOTAO = "inline-flex min-h-11 items-center rounded-md border border-border px-3 text-xs font-medium text-ink hover:bg-background sm:min-h-8";

/** Seção "Documentos" do contrato: lista por tipo, abrir/baixar e, para quem edita, anexar e remover. */
export async function DocumentosContrato({ contratoId }: { contratoId: string }) {
  const supabase = await createClient();
  const [{ data, error }, { data: podeEditar }] = await Promise.all([
    tabelaDocumentos(supabase)
      .select("id, tipo, nome, data_documento, observacao, tamanho, criado_em")
      .eq("contrato_id", contratoId)
      .order("data_documento", { ascending: false, nullsFirst: false })
      .order("criado_em", { ascending: false })
      .returns<Pick<LinhaDocumentoLocacao, "id" | "tipo" | "nome" | "data_documento" | "observacao" | "tamanho" | "criado_em">[]>(),
    supabase.rpc("usuario_pode_editar"),
  ]);
  const docs = data ?? [];
  const indisponivel = !!error;

  return (
    <div className="space-y-3">
      <CabecalhoSecao icon={FolderOpen} titulo="Documentos" />
      {indisponivel ? (
        <p className="rounded-xl border border-border/70 bg-surface p-4 text-sm text-ink-muted">
          Os documentos ainda não estão disponíveis. Tente de novo em instantes.
        </p>
      ) : (
        <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-sm sm:p-5">
          {docs.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum documento anexado a este contrato.</p>
          ) : (
            <div className="space-y-4">
              {TIPOS_DOCUMENTO.filter((t) => docs.some((d) => d.tipo === t)).map((t) => (
                <div key={t}>
                  <p className="mb-1.5 text-xs font-semibold text-ink-muted">{ROTULO_TIPO[t]}</p>
                  <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
                    {docs.filter((d) => d.tipo === t).map((d) => (
                      <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                        <div className="min-w-0 flex-1 basis-64">
                          <p className="flex items-start gap-1.5 break-words text-sm font-medium text-ink">
                            <FileText size={14} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
                            {d.nome}
                          </p>
                          <p className="text-[11px] text-ink-muted">
                            {[d.data_documento ? `Documento de ${dataBR(d.data_documento)}` : `Anexado em ${dataBR(d.criado_em)}`, tamanho(d.tamanho), d.observacao].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a href={`/locacao/${contratoId}/documentos/${d.id}`} target="_blank" rel="noopener noreferrer" className={BOTAO}>
                            Abrir
                          </a>
                          <a href={`/locacao/${contratoId}/documentos/${d.id}?baixar=1`} className={BOTAO}>
                            Baixar
                          </a>
                          {podeEditar === true && (
                            <form action={removerDocumento}>
                              <input type="hidden" name="contrato_id" value={contratoId} />
                              <input type="hidden" name="documento_id" value={d.id} />
                              <BotaoComConfirmacao
                                mensagem={`Remover "${d.nome}"? O arquivo será apagado e não poderá ser recuperado.`}
                                textoEnviando="Removendo…"
                                className="inline-flex min-h-11 items-center rounded-md border border-rose-200 px-3 text-xs font-medium text-rose-700 hover:bg-rose-50 sm:min-h-8"
                              >
                                Remover
                              </BotaoComConfirmacao>
                            </form>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {podeEditar === true && (
            <details className="mt-4 group">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-lg border border-border px-3 text-sm font-semibold text-ink hover:bg-background">
                Anexar documento
              </summary>
              <div className="mt-3">
                <EnvioDocumentoContrato contratoId={contratoId} />
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
