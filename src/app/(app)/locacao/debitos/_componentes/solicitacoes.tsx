import Link from "next/link";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import type { PermissoesDebitos } from "@/lib/debitos/permissoes";
import {
  agruparPorAdministradora,
  emailValido,
  montarMensagem,
  rotuloCompetencia,
  situacaoSolicitacao,
  type StatusVerificacao,
  type UnidadeSolicitacao,
} from "@/lib/debitos/regras";
import { formatarDataHoraBR } from "@/lib/data-br";
import { acaoEmLote, enviarSolicitacaoAgora, registrarResposta } from "../actions";
import type { DadosPainel, Solicitacao } from "../dados";
import { ROTULO, SeloMetodo, SeloSolicitacao, SeloStatus, hrefPainel } from "./ui";

const BOTAO_PEQUENO = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-surface px-3 py-2 text-xs font-medium text-ink-muted transition hover:bg-background hover:text-ink";

function FormResposta({ s }: { s: Solicitacao }) {
  return (
    <details className="rounded-lg border border-border/60 px-3 py-2">
      <summary className="cursor-pointer text-xs font-semibold text-brand">Registrar resposta</summary>
      <form action={registrarResposta} className="mt-3 space-y-3">
        <input type="hidden" name="solicitacao_id" value={s.id} />
        <p className="text-xs text-ink-muted">Marque o que a administradora informou para cada unidade. O que ficar como &ldquo;não informado&rdquo; continua aguardando.</p>
        <ul className="divide-y divide-border">
          {s.itens.map((item) => (
            <li key={item.id} className="grid gap-2 py-2.5 sm:grid-cols-[1fr_auto] sm:items-center">
              <p className="whitespace-pre-line text-xs text-ink">{item.descricao_unidade}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink">
                {(
                  [
                    ["sem_debito", "Sem débito"],
                    ["com_debito", "Com débito"],
                    ["nao_informado", "Não informado"],
                  ] as const
                ).map(([valor, rotulo]) => (
                  <label key={valor} className="inline-flex items-center gap-1.5">
                    <input type="radio" name={`resultado_${item.id}`} value={valor} defaultChecked={(item.resultado ?? "nao_informado") === valor} />
                    {rotulo}
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <label className="block">
          <span className={ROTULO}>Observação sobre a resposta</span>
          <input name="resposta_observacao" defaultValue={s.resposta_observacao ?? ""} className={INPUT_CLASS} />
        </label>
        <BotaoEnviar className={SECONDARY_BUTTON_CLASS} textoEnviando="Salvando…">
          Salvar resposta
        </BotaoEnviar>
      </form>
    </details>
  );
}

export function Solicitacoes({
  dados,
  competencia,
  params,
  perms,
  agoraIso,
}: {
  dados: DadosPainel;
  competencia: string;
  params: Record<string, string | undefined>;
  perms: PermissoesDebitos;
  agoraIso: string;
}) {
  const mapaAdm = new Map(dados.administradoras.map((a) => [a.id, a]));
  // unidades com conferência de condomínio na competência, por administradora
  const porAdm = new Map<string, DadosPainel["linhas"]>();
  const semAdministradora: DadosPainel["linhas"] = [];
  for (const l of dados.linhas) {
    if (!l.condominio || l.condominio.status === "nao_se_aplica") continue;
    if (!l.administradoraId) {
      semAdministradora.push(l);
      continue;
    }
    porAdm.set(l.administradoraId, [...(porAdm.get(l.administradoraId) ?? []), l]);
  }
  const grupos = [...porAdm.entries()]
    .map(([id, linhas]) => ({ adm: mapaAdm.get(id)!, linhas }))
    .filter((g) => g.adm)
    .sort((a, b) => a.adm.nome.localeCompare(b.adm.nome, "pt-BR"));

  const emAberto = (s: StatusVerificacao) => s === "pendente" || s === "aguardando_administradora";
  const aEnviar = grupos.filter((g) => g.adm.metodo_consulta === "email" && g.linhas.some((l) => l.condominio?.status === "pendente" && !l.verificacaoCondominio?.solicitacao_id));

  const paraUnidade = (l: DadosPainel["linhas"][number]): UnidadeSolicitacao => ({
    verificacaoId: l.condominio!.id,
    contratoId: l.contratoId,
    imovel: l.imovel,
    condominioNome: l.contrato.condominio_nome,
    bloco: l.contrato.condominio_bloco,
    unidade: l.contrato.condominio_unidade,
    codigoUnidade: l.contrato.condominio_codigo_unidade,
    administradoraId: l.administradoraId,
    administradoraNome: l.administradoraNome,
    metodo: l.metodo,
    emailAdministradora: l.administradoraId ? (mapaAdm.get(l.administradoraId)?.email_solicitacao ?? null) : null,
    emailUnidade: l.contrato.condominio_email,
  });

  return (
    <div className="space-y-5">
      <div className={`${CARD_CLASS} flex min-w-0 flex-wrap items-center justify-between gap-3 p-4`}>
        <div className="min-w-0 text-sm">
          <p className="font-semibold text-ink">Solicitações de {rotuloCompetencia(competencia)}</p>
          <p className="text-xs text-ink-muted">
            Cada administradora recebe um único e-mail com todas as unidades dela.{" "}
            {dados.config.envio_automatico ? `Envio automático ligado (a partir do dia ${dados.config.dia_envio}).` : "Envio automático desligado: os e-mails só saem quando alguém clica em enviar."}
          </p>
        </div>
        {perms.operar && (
          <div className="flex flex-wrap gap-2">
            <form action={enviarSolicitacaoAgora}>
              <input type="hidden" name="competencia" value={competencia} />
              <input type="hidden" name="modo" value="teste" />
              <BotaoEnviar className={SECONDARY_BUTTON_CLASS} textoEnviando="Enviando teste…">
                Enviar teste para mim
              </BotaoEnviar>
            </form>
            <form action={enviarSolicitacaoAgora}>
              <input type="hidden" name="competencia" value={competencia} />
              <BotaoComConfirmacao
                className={PRIMARY_BUTTON_CLASS}
                textoEnviando="Enviando…"
                disabled={aEnviar.length === 0}
                mensagem={`Enviar agora o e-mail de solicitação para ${aEnviar.length} administradora(s) consultada(s) por e-mail que ainda não receberam o pedido deste mês?`}
              >
                Enviar agora ({aEnviar.length})
              </BotaoComConfirmacao>
            </form>
          </div>
        )}
      </div>

      {grupos.length === 0 && <div className={`${CARD_CLASS} px-6 py-10 text-center text-sm text-ink-muted`}>Nenhuma conferência de condomínio com administradora nesta competência.</div>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {grupos.map(({ adm, linhas }) => {
          const abertas = linhas.filter((l) => emAberto(l.condominio!.status));
          const enviosDaAdm = dados.solicitacoes.filter((s) => s.administradora_id === adm.id);
          const { grupos: previa } = agruparPorAdministradora(abertas.map(paraUnidade), { somenteMetodoEmail: false });
          const temEmail = emailValido(adm.email_solicitacao) || abertas.some((l) => emailValido(l.contrato.condominio_email));
          return (
            <section key={adm.id} className={`${CARD_CLASS} min-w-0 space-y-3 p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-ink">{adm.nome}</h3>
                  <p className="truncate text-xs text-ink-muted">
                    {linhas.length} unidade(s) · {adm.email_solicitacao ?? "sem e-mail cadastrado"}
                  </p>
                </div>
                <SeloMetodo metodo={adm.metodo_consulta as "portal" | "email" | "outro"} />
              </div>

              <ul className="space-y-1.5">
                {linhas.map((l) => (
                  <li key={l.contratoId} className="flex items-center justify-between gap-3 text-xs">
                    <Link href={hrefPainel({ mes: params.mes, aba: "solicitacoes" }, { detalhe: l.contratoId })} scroll={false} className="min-w-0 truncate text-ink hover:text-brand hover:underline">
                      {l.imovel}
                    </Link>
                    <SeloStatus status={l.condominio?.status} />
                  </li>
                ))}
              </ul>

              {perms.operar && abertas.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  {temEmail && (
                    <form action={enviarSolicitacaoAgora}>
                      <input type="hidden" name="competencia" value={competencia} />
                      <input type="hidden" name="administradora_id" value={adm.id} />
                      <BotaoComConfirmacao
                        className={BOTAO_PEQUENO}
                        textoEnviando="Enviando…"
                        mensagem={`Enviar ${enviosDaAdm.length ? "novamente " : ""}o e-mail de solicitação para ${adm.nome} com ${abertas.length} unidade(s) em aberto?`}
                      >
                        {enviosDaAdm.length ? "Reenviar solicitação" : "Enviar agora"}
                      </BotaoComConfirmacao>
                    </form>
                  )}
                  <form action={acaoEmLote}>
                    <input type="hidden" name="competencia" value={competencia} />
                    <input type="hidden" name="administradora_lote" value={adm.id} />
                    <input type="hidden" name="acao" value="cond_sem_debito" />
                    <BotaoComConfirmacao className={BOTAO_PEQUENO} textoEnviando="Salvando…" mensagem={`Marcar as unidades de ${adm.nome} como SEM DÉBITO em ${rotuloCompetencia(competencia)}? Unidades com débito lançado não são alteradas.`}>
                      Marcar todas sem débito
                    </BotaoComConfirmacao>
                  </form>
                </div>
              )}

              {!temEmail && abertas.length > 0 && adm.metodo_consulta !== "portal" && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">Sem e-mail cadastrado: não é possível enviar a solicitação. Complete o cadastro na aba Administradoras.</p>
              )}

              {previa.length > 0 && temEmail && (
                <details className="rounded-lg border border-border/60 px-3 py-2">
                  <summary className="cursor-pointer text-xs font-semibold text-ink-muted hover:text-ink">Ver o e-mail que será enviado</summary>
                  {previa.map((g) => {
                    const m = montarMensagem(dados.config.email_modelo, dados.config.email_assunto, { unidades: g.unidades, competencia, administradora: adm.nome });
                    return (
                      <div key={g.chave} className="mt-3 text-xs">
                        <p className="text-ink-muted">Para: {g.destinatario}</p>
                        <p className="font-semibold text-ink">{m.assunto}</p>
                        <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-background p-3 font-sans text-ink">{m.texto}</pre>
                      </div>
                    );
                  })}
                </details>
              )}

              {enviosDaAdm.length > 0 && (
                <div className="space-y-2 border-t border-border pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Envios deste mês</p>
                  {enviosDaAdm.map((s) => (
                    <div key={s.id} className="space-y-2 rounded-lg bg-background px-3 py-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <p className="min-w-0 text-ink-muted">
                          {formatarDataHoraBR(s.enviado_em)} · {s.enviado_por_nome ?? "—"} · {s.itens.length} unidade(s) · para {s.destinatario}
                        </p>
                        <SeloSolicitacao situacao={situacaoSolicitacao(s, agoraIso, dados.config.dias_alerta_sem_resposta)} />
                      </div>
                      {s.erro && <p className="text-xs text-rose-700">Erro: {s.erro}</p>}
                      {s.respondido_em && (
                        <p className="text-xs text-ink-muted">
                          Resposta registrada em {formatarDataHoraBR(s.respondido_em)}
                          {s.resposta_observacao ? ` — ${s.resposta_observacao}` : ""}
                        </p>
                      )}
                      <details>
                        <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink">Mensagem enviada</summary>
                        <p className="mt-2 text-xs font-semibold text-ink">{s.assunto}</p>
                        <pre className="mt-1 whitespace-pre-wrap font-sans text-xs text-ink">{s.mensagem}</pre>
                      </details>
                      {perms.operar && s.status !== "falha" && <FormResposta s={s} />}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {semAdministradora.length > 0 && (
        <section className={`${CARD_CLASS} min-w-0 p-4`}>
          <h3 className="text-sm font-semibold text-ink">Imóveis sem administradora vinculada ({semAdministradora.length})</h3>
          <p className="mb-3 text-xs text-ink-muted">Abra o imóvel e informe a administradora (ou marque que não possui condomínio).</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {semAdministradora.map((l) => (
              <li key={l.contratoId} className="truncate text-xs">
                <Link href={hrefPainel({ mes: params.mes, aba: "solicitacoes" }, { detalhe: l.contratoId })} scroll={false} className="text-ink hover:text-brand hover:underline">
                  {l.imovel}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
