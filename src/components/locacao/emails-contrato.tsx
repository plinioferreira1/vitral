import Link from "next/link";
import { Inbox, Paperclip, Send } from "lucide-react";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { assuntoVisivel, linhaDoTempo, totalPendentes, type RespostaEmail, type SolicitacaoEmail } from "@/lib/locacao/emails-contrato";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual, GESTORES } from "@/lib/usuario-atual";
import { AnexosEmail } from "@/components/locacao/anexos-email";

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/**
 * E-mails com as administradoras deste contrato: solicitações enviadas pelo
 * VITRAL e respostas que chegaram em locacao@ (sincronizadas do Zoho).
 * Só aparece para quem vê o Controle de Débitos. Somente leitura.
 */
export async function EmailsContrato({ contratoId }: { contratoId: string }) {
  const supabase = await createClient();
  const [{ data: podeVer }, { usuario }] = await Promise.all([supabase.rpc("debitos_pode_ver"), getUsuarioAtual()]);
  if (podeVer !== true) return null;
  // A leitura de anexos no Zoho é restrita à gestão (mesma regra da caixa de e-mails).
  const podeAnexos = !!usuario?.ativo && GESTORES.includes(usuario.nivel_acesso);

  const { data: itens } = await supabase.from("debitos_solicitacao_itens").select("solicitacao_id").eq("contrato_id", contratoId);
  const ids = [...new Set((itens ?? []).map((i) => i.solicitacao_id))];
  const [{ data: solicitacoes }, { data: respostas }] = ids.length
    ? await Promise.all([
        supabase.from("debitos_solicitacoes").select("id, assunto, administradora_nome, destinatario, enviado_em, status, respondido_em").in("id", ids),
        supabase.from("debitos_respostas_email").select("id, mensagem_id, solicitacao_id, remetente, assunto, resumo, recebido_em, tem_anexo").in("solicitacao_id", ids),
      ])
    : [{ data: [] }, { data: [] }];

  const eventos = linhaDoTempo((solicitacoes ?? []) as SolicitacaoEmail[], (respostas ?? []) as RespostaEmail[]).slice(0, 30);
  const pendentes = totalPendentes(eventos);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CabecalhoSecao icon={Inbox} titulo="E-mails com a administradora" />
        {pendentes > 0 && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
            {pendentes} resposta(s) para atender
          </span>
        )}
      </div>
      <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-sm sm:p-5">
        {eventos.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhum e-mail sobre este contrato ainda. As solicitações enviadas pelo Controle de Débitos e as respostas aparecem aqui.</p>
        ) : (
          <ol className="space-y-3">
            {eventos.map((e) =>
              e.tipo === "enviado" ? (
                <li key={`s-${e.solicitacao.id}`} className="flex gap-3">
                  <Send size={15} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="break-words text-sm text-ink"><span className="font-medium">Enviado</span> para {e.solicitacao.administradora_nome ?? e.solicitacao.destinatario}</p>
                    <p className="break-words text-xs text-ink-muted">{quando(e.quando)} · {assuntoVisivel(e.solicitacao.assunto)}</p>
                  </div>
                </li>
              ) : (
                <li key={`r-${e.resposta.id}`} className={`flex gap-3 rounded-lg ${e.pendente ? "-mx-2 bg-amber-50 px-2 py-1.5" : ""}`}>
                  <Inbox size={15} className={`mt-0.5 shrink-0 ${e.pendente ? "text-amber-700" : "text-ink-muted"}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="break-words text-sm text-ink">
                      <span className="font-medium">Recebido</span> de {e.resposta.remetente}
                      {e.resposta.tem_anexo && <Paperclip size={12} className="ml-1 inline text-ink-muted" aria-label="com anexo" />}
                      {e.pendente && <span className="ml-2 text-xs font-semibold text-amber-800">Precisa de atendimento</span>}
                    </p>
                    <p className="break-words text-xs text-ink-muted">{quando(e.quando)} · {assuntoVisivel(e.resposta.assunto)}</p>
                    {e.resposta.resumo && <p className="mt-0.5 line-clamp-2 break-words text-xs text-ink-muted">{e.resposta.resumo}</p>}
                    {e.resposta.tem_anexo && podeAnexos && e.resposta.mensagem_id && <AnexosEmail mensagemId={e.resposta.mensagem_id} />}
                  </div>
                </li>
              ),
            )}
          </ol>
        )}
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <Link href="/locacao/debitos?aba=solicitacoes" className="font-semibold text-brand hover:underline">Registrar resposta nas solicitações</Link>
          <Link href="/locacao/emails" className="font-semibold text-brand hover:underline">Abrir a caixa de e-mails</Link>
        </div>
      </div>
    </div>
  );
}
