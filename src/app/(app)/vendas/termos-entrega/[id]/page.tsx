import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock, Copy, Download, ExternalLink, FileSignature, History, Mail, Paperclip, PencilLine, Send } from "lucide-react";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { BotaoCopiarLink } from "@/components/botao-copiar-link";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { VoltarLink } from "@/components/voltar-link";
import { formatarDataHoraBR } from "@/lib/data-br";
import { obterSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { dataBR, fraseAcerto } from "@/lib/termo-entrega/calculo";
import {
  calcularDocumento,
  compradores,
  pendenciasParaGerar,
  podeCriarNovaVersao,
  podeVoltarParaEdicao,
  vendedores,
} from "@/lib/termo-entrega/conteudo";
import { formatarCentavos } from "@/lib/termo-entrega/extenso";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { cancelarTermo, criarNovaVersao, duplicarTermo, enviarLinkPorEmail, enviarParaAssinatura, gerarDocumento, salvarResponsavel, voltarParaEdicao } from "../actions";
import { carregarPermissoes, carregarTermo } from "../dados";
import { BOTAO_MINI, ROTULO, SeloStatusTermo } from "../ui";
import { EditorTermo } from "./editor";

const BASE = "/vendas/termos-entrega";

function Painel({ titulo, icone, id, children }: { titulo: string; icone?: React.ReactNode; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={`${CARD_CLASS} scroll-mt-24 p-4 sm:p-5`}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        {icone}
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export default async function TermoEntregaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ previa?: string }> }) {
  const { id } = await params;
  const { previa } = await searchParams;
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const perms = await carregarPermissoes(supabase, user.id, usuario.nivel_acesso);
  if (!perms.ver) redirect("/");
  const [t, { data: pessoas }, site] = await Promise.all([
    carregarTermo(supabase, id, usuario.tenant_id),
    supabase.from("usuarios").select("id, nome").eq("ativo", true).order("nome"),
    obterSiteUrl(),
  ]);
  if (!t) notFound();

  const { termo, documento: doc } = t;
  const status = termo.status;
  const emRascunho = status === "rascunho";
  const editando = emRascunho && perms.operar && !previa;
  const { acerto } = calcularDocumento(doc);
  const pendencias = emRascunho ? pendenciasParaGerar(doc) : [];
  const assinaturasAtuais = t.signatarios.filter((s) => s.versao === termo.versao);
  const assinadas = assinaturasAtuais.filter((s) => s.assinado_em).length;
  const nV = vendedores(doc).length;
  const nC = compradores(doc).length;
  const pdf = `${BASE}/${id}/pdf`;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className={`${CARD_CLASS} overflow-hidden`}>
        <div className="h-1.5 bg-gradient-to-r from-brand via-brand/80 to-gold" />
        <div className="p-4 sm:p-6">
          <VoltarLink href={BASE} label="Termos de entrega de chaves" />
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand">Termo de entrega de chaves</span>
                <span className="num font-mono text-xs text-ink-muted">
                  {termo.codigo} · versão {termo.versao}
                </span>
                <SeloStatusTermo status={status} />
              </div>
              <h1 className="mt-2 text-xl font-bold leading-tight tracking-tight text-ink sm:text-2xl">{doc.imovel.endereco || "Imóvel ainda não informado"}</h1>
              <p className="mt-1 text-sm text-ink-muted">
                {termo.vendedores_nomes ?? "Sem vendedor"} → {termo.compradores_nomes ?? "sem comprador"}
                {doc.dataEntrega ? ` · entrega em ${dataBR(doc.dataEntrega)}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {doc.processoId && (
                <Link href={`/processos/${doc.processoId}`} className={BOTAO_MINI}>
                  Abrir venda <ExternalLink size={13} />
                </Link>
              )}
              {perms.operar && (
                <form action={duplicarTermo}>
                  <input type="hidden" name="id" value={id} />
                  <BotaoEnviar className={BOTAO_MINI} textoEnviando="Duplicando…">
                    <Copy size={13} /> Duplicar
                  </BotaoEnviar>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {editando ? (
        <EditorTermo
          key={`${termo.versao}-${termo.atualizado_em}`}
          termoId={id}
          tenantId={usuario.tenant_id}
          codigo={termo.codigo}
          versao={termo.versao}
          inicial={doc}
          anexosIniciais={t.anexos.map((a) => ({ id: a.id, encargoId: a.encargo_id, nome: a.nome }))}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* documento */}
          <div className="min-w-0 space-y-3">
            <div className={`${CARD_CLASS} flex flex-wrap items-center justify-between gap-2 px-4 py-3`}>
              <p className="text-sm font-semibold text-ink">{emRascunho ? "Pré-visualização do documento" : `Documento — versão ${termo.versao}`}</p>
              <div className="flex flex-wrap gap-2">
                <a href={pdf} target="_blank" rel="noreferrer" className={BOTAO_MINI}>
                  <ExternalLink size={13} /> Visualizar PDF
                </a>
                <a href={`${pdf}?baixar=1`} className={BOTAO_MINI}>
                  <Download size={13} /> Baixar PDF
                </a>
              </div>
            </div>
            <iframe title="Documento do termo" src={`${pdf}#view=FitH`} className="hidden h-[82vh] w-full rounded-2xl border border-border bg-white md:block" />
            <p className={`${CARD_CLASS} px-4 py-3 text-xs text-ink-muted md:hidden`}>No celular, toque em “Visualizar PDF” para abrir o documento em tela cheia.</p>
          </div>

          {/* lateral */}
          <div className="min-w-0 space-y-4">
            {emRascunho && (
              <Painel titulo="Pré-visualização" icone={<PencilLine size={15} className="text-brand" />}>
                <p className="text-xs text-ink-muted">Confira o documento. Enquanto for rascunho, ele sai com a marca “MINUTA” e ainda pode ser editado.</p>
                {pendencias.length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                    <p className="font-semibold">Falta para gerar o documento:</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                      {pendencias.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {perms.operar && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`${BASE}/${id}`} className={`${SECONDARY_BUTTON_CLASS} flex-1`}>
                      Voltar e editar
                    </Link>
                    <form action={gerarDocumento} className="flex-1">
                      <input type="hidden" name="id" value={id} />
                      <BotaoComConfirmacao
                        className={`${PRIMARY_BUTTON_CLASS} w-full disabled:opacity-50`}
                        disabled={pendencias.length > 0}
                        textoEnviando="Gerando…"
                        mensagem="Gerar o documento definitivo desta versão? Os dados ficam congelados nela (ainda dá para voltar a editar enquanto ninguém assinar)."
                      >
                        Gerar documento
                      </BotaoComConfirmacao>
                    </form>
                  </div>
                )}
              </Painel>
            )}

            {status === "gerado" && perms.operar && (
              <Painel titulo="Próximo passo" icone={<Send size={15} className="text-brand" />}>
                <p className="text-xs text-ink-muted">Documento gerado. Envie para assinatura: cada vendedor e comprador recebe um link próprio.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={enviarParaAssinatura} className="flex-1">
                    <input type="hidden" name="id" value={id} />
                    <BotaoEnviar className={`${PRIMARY_BUTTON_CLASS} w-full`} textoEnviando="Criando links…">
                      <FileSignature size={15} /> Enviar para assinatura
                    </BotaoEnviar>
                  </form>
                </div>
              </Painel>
            )}

            {assinaturasAtuais.length > 0 && (
              <Painel id="assinaturas" titulo={`Assinaturas (${assinadas} de ${assinaturasAtuais.length})`} icone={<FileSignature size={15} className="text-brand" />}>
                <ul className="space-y-3">
                  {assinaturasAtuais.map((s) => (
                    <li key={s.id} className="rounded-xl border border-border/70 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{s.nome_esperado}</p>
                          <p className="text-xs text-ink-muted">
                            {s.papel === "vendedor" ? "Vendedor(a)" : "Comprador(a)"}
                            {s.email ? ` · ${s.email}` : ""}
                          </p>
                        </div>
                        {s.assinado_em ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 size={14} /> Assinado
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-amber-700">
                            <Clock size={14} /> Aguardando
                          </span>
                        )}
                      </div>
                      {s.assinado_em ? (
                        <p className="mt-1.5 text-[11px] text-ink-muted">
                          {s.nome_digitado} · {formatarDataHoraBR(s.assinado_em)}
                          {s.ip_assinatura ? ` · IP ${s.ip_assinatura}` : ""}
                        </p>
                      ) : (
                        perms.operar && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <BotaoCopiarLink url={`${site}/assinar-termo/${s.token}`} rotulo="Copiar link" />
                            {s.email && (
                              <form action={enviarLinkPorEmail}>
                                <input type="hidden" name="signatario_id" value={s.id} />
                                <BotaoComConfirmacao className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-background" textoEnviando="Enviando…" mensagem={`Enviar o link de assinatura por e-mail para ${s.nome_esperado} (${s.email})?`}>
                                  <Mail size={13} /> {s.email_enviado_em ? "Reenviar e-mail" : "Enviar por e-mail"}
                                </BotaoComConfirmacao>
                              </form>
                            )}
                            {s.email_enviado_em && <span className="text-[11px] text-ink-muted">E-mail enviado em {formatarDataHoraBR(s.email_enviado_em)}</span>}
                          </div>
                        )
                      )}
                    </li>
                  ))}
                </ul>
                {status === "assinado" && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">Documento assinado por todos e bloqueado. Para alterar algo, crie uma nova versão.</p>}
              </Painel>
            )}

            <Painel titulo="Acerto final">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-ink-muted">Comprador deve ao vendedor</p>
                  <p className="num text-base font-semibold text-ink">{formatarCentavos(acerto.compradorDeveCentavos)}</p>
                </div>
                <div>
                  <p className="text-ink-muted">Vendedor deve ao comprador</p>
                  <p className="num text-base font-semibold text-ink">{formatarCentavos(acerto.vendedorDeveCentavos)}</p>
                </div>
              </div>
              <div className={`mt-3 rounded-xl px-4 py-3 ${acerto.devedor ? "bg-brand text-white" : "bg-emerald-50 text-emerald-800"}`}>
                <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">Saldo final</p>
                <p className="num text-2xl font-bold">{formatarCentavos(acerto.saldoCentavos)}</p>
                <p className="text-xs font-semibold">{fraseAcerto(acerto, { vendedores: Math.max(1, nV), compradores: Math.max(1, nC) })}</p>
              </div>
            </Painel>

            {perms.operar && status !== "cancelado" && (
              <Painel titulo="Ações">
                <div className="space-y-3">
                  <form action={salvarResponsavel} className="flex items-end gap-2">
                    <input type="hidden" name="id" value={id} />
                    <label className="block min-w-0 flex-1">
                      <span className={ROTULO}>Responsável pelo termo</span>
                      <select name="responsavel_id" defaultValue={termo.responsavel_id ?? ""} className={INPUT_CLASS}>
                        <option value="">— Sem responsável —</option>
                        {(pessoas ?? []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                    <BotaoEnviar className={SECONDARY_BUTTON_CLASS} textoEnviando="…">
                      Salvar
                    </BotaoEnviar>
                  </form>
                  {podeVoltarParaEdicao(status) && (
                    <form action={voltarParaEdicao}>
                      <input type="hidden" name="id" value={id} />
                      <BotaoComConfirmacao
                        className={`${SECONDARY_BUTTON_CLASS} w-full`}
                        textoEnviando="Voltando…"
                        mensagem={status === "aguardando_assinatura" ? "Voltar para edição? Os links de assinatura já enviados deixam de funcionar e será preciso gerar e enviar de novo." : "Voltar para edição?"}
                      >
                        <PencilLine size={15} /> Voltar para edição
                      </BotaoComConfirmacao>
                    </form>
                  )}
                  {podeCriarNovaVersao(status) && (
                    <form action={criarNovaVersao}>
                      <input type="hidden" name="id" value={id} />
                      <BotaoComConfirmacao
                        className={`${SECONDARY_BUTTON_CLASS} w-full`}
                        textoEnviando="Criando…"
                        mensagem={`Criar a versão ${termo.versao + 1} como nova minuta? A versão ${termo.versao}, com as assinaturas já feitas, fica guardada e não é alterada. A nova versão precisará ser assinada de novo.`}
                      >
                        Criar nova versão
                      </BotaoComConfirmacao>
                    </form>
                  )}
                  <details className="rounded-lg border border-border/60 px-3 py-2">
                    <summary className="cursor-pointer text-xs font-semibold text-rose-700">Cancelar termo</summary>
                    <form action={cancelarTermo} className="mt-3 space-y-2">
                      <input type="hidden" name="id" value={id} />
                      <input name="motivo" placeholder="Motivo do cancelamento (opcional)" className={INPUT_CLASS} />
                      <BotaoComConfirmacao className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100" textoEnviando="Cancelando…" mensagem="Cancelar este termo? Ele deixa de valer, mas o histórico e os documentos continuam guardados. Não dá para desfazer.">
                        Confirmar cancelamento
                      </BotaoComConfirmacao>
                    </form>
                  </details>
                </div>
              </Painel>
            )}
            {status === "cancelado" && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
                Termo cancelado em {termo.cancelado_em ? formatarDataHoraBR(termo.cancelado_em) : "—"}
                {termo.cancelado_motivo ? ` — ${termo.cancelado_motivo}` : ""}.
              </p>
            )}

            {t.anexos.length > 0 && (
              <Painel titulo={`Anexos (${t.anexos.length})`} icone={<Paperclip size={15} className="text-ink-muted" />}>
                <ul className="space-y-1.5 text-xs">
                  {t.anexos.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2">
                      <a href={`${BASE}/${id}/anexo/${a.id}`} target="_blank" rel="noreferrer" className="min-w-0 truncate text-brand hover:underline">
                        {a.nome}
                      </a>
                      <span className="shrink-0 text-ink-muted">{doc.encargos.find((e) => e.id === a.encargo_id)?.descricao ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              </Painel>
            )}
          </div>
        </div>
      )}

      {/* versões e histórico: sempre visíveis */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Painel titulo="Versões">
          {t.versoes.length === 0 ? (
            <p className="text-xs text-ink-muted">Nenhuma versão gerada ainda. A versão {termo.versao} está em rascunho.</p>
          ) : (
            <ul className="divide-y divide-border">
              {emRascunho && !t.versoes.some((v) => v.versao === termo.versao) && (
                <li className="flex items-center justify-between gap-3 py-2.5 text-xs">
                  <span className="font-semibold text-ink">Versão {termo.versao}</span>
                  <span className="text-ink-muted">Nova minuta (rascunho)</span>
                </li>
              )}
              {t.versoes.map((v) => {
                const sigs = t.signatarios.filter((s) => s.versao === v.versao);
                const feitas = sigs.filter((s) => s.assinado_em).length;
                const situacao =
                  v.versao === termo.versao && emRascunho
                    ? "Em edição (rascunho)"
                    : sigs.length > 0 && feitas === sigs.length
                      ? "Assinada"
                      : feitas > 0
                        ? `Parcialmente assinada (${feitas} de ${sigs.length})`
                        : v.versao < termo.versao
                          ? "Substituída"
                          : "Gerada";
                return (
                  <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-xs">
                    <div>
                      <p className="font-semibold text-ink">
                        Versão {v.versao} — {situacao}
                      </p>
                      <p className="text-ink-muted">
                        Gerada por {v.gerado_por_nome ?? "—"} em {formatarDataHoraBR(v.gerado_em)} · saldo {formatarCentavos(v.retrato.acerto.saldoCentavos)}
                      </p>
                      <p className="num text-[10px] text-ink-muted">Conferência: {v.hash.slice(0, 16)}…</p>
                    </div>
                    <a href={`${pdf}?versao=${v.versao}`} target="_blank" rel="noreferrer" className={BOTAO_MINI}>
                      PDF
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </Painel>

        <Painel id="historico" titulo="Histórico" icone={<History size={15} className="text-ink-muted" />}>
          {t.eventos.length === 0 ? (
            <p className="text-xs text-ink-muted">Nenhum registro.</p>
          ) : (
            <ol className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
              {t.eventos.map((e) => (
                <li key={e.id} className="border-l-2 border-border pl-3 text-xs">
                  <p className="text-ink">{e.descricao}</p>
                  <p className="text-ink-muted">
                    {e.usuario_nome ?? "—"} · {formatarDataHoraBR(e.criado_em)}
                    {e.versao ? ` · v${e.versao}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Painel>
      </div>
    </div>
  );
}
