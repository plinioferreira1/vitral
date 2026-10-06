import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CARD_CLASS, INPUT_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import {
  ROTULO_REGISTRO,
  TIPOS_REGISTRO,
  bancoDeHoras,
  diaDoContexto,
  diasDoMes,
  duracao,
  espelho,
  hhmm,
  localDe,
  podeDecidirSobre,
  proximoRegistro,
  resumir,
  somarDias,
  statusHoje,
  type TipoRegistro,
} from "@/lib/dp/ponto";
import { dataBR } from "@/lib/ferias/regras";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { decidirCorrecao, lancarAjusteBanco, registrarPonto, solicitarCorrecao } from "../actions";
import { CampoArquivo } from "../campo-arquivo";
import { acessoDP, carregarPonto, contextoPonto } from "../dados";
import { Espelho } from "../espelho";
import { Avatar, ROTULO, SeloHoje } from "../ui";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default async function PontoPage({ searchParams }: { searchParams: Promise<{ colaborador?: string; mes?: string }> }) {
  const sp = await searchParams;
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const acesso = await acessoDP(supabase, user.id, usuario.nivel_acesso);
  if (!acesso.liberado || !acesso.perms.ver) redirect("/");
  const agoraIso = new Date().toISOString();
  const agora = localDe(agoraIso);
  const hoje = agora.data;

  const { data: visiveis } = await supabase.from("dp_colaboradores").select("*").order("nome");
  const colaboradores = (visiveis ?? []).filter((c) => c.status !== "desligado");
  const alvo = sp.colaborador ? (colaboradores.find((c) => c.id === sp.colaborador) ?? null) : acesso.eu;
  const proprio = !!alvo && alvo.id === acesso.eu?.id;
  const decide = !!alvo && podeDecidirSobre(acesso.perms, acesso.eu?.id ?? null, alvo);
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : hoje.slice(0, 7);
  const [ano, m] = mes.split("-").map(Number);
  const outroMes = (delta: number) => new Date(Date.UTC(ano, m - 1 + delta, 1)).toISOString().slice(0, 7);
  const hrefMes = (v: string) => `/dp/ponto?${sp.colaborador ? `colaborador=${sp.colaborador}&` : ""}mes=${v}`;

  // equipe (gestor/administrador): quem registra ponto, situação de hoje e correções pendentes
  const equipe = acesso.perms.gestorDeEquipe ? colaboradores.filter((c) => c.registra_ponto && c.id !== acesso.eu?.id) : [];
  const dadosEquipe = equipe.length ? await carregarPonto(supabase, somarDias(hoje, -1)) : null;
  const pendentes = (dadosEquipe?.correcoes ?? []).filter((c) => c.status === "pendente" && equipe.some((e) => e.id === c.colaborador_id));

  const dados = alvo?.registra_ponto ? await carregarPonto(supabase, alvo.ponto_inicio && alvo.ponto_inicio < `${mes}-01` ? alvo.ponto_inicio : `${mes}-01`, alvo.id) : null;
  const ctx = alvo && dados ? contextoPonto(alvo, acesso.config, dados, agoraIso) : null;
  const diaHoje = ctx ? diaDoContexto(ctx, hoje) : null;
  const dias = ctx ? espelho(ctx, diasDoMes(mes)) : [];
  const resumoMes = resumir(dias);
  const banco = ctx && dados ? bancoDeHoras(ctx, dados.ajustes) : 0;
  const prox = diaHoje ? proximoRegistro(diaHoje.registros) : null;
  const ultimo = diaHoje ? ([...TIPOS_REGISTRO].reverse().find((t) => diaHoje.registros[t] !== undefined) ?? null) : null;
  const naoTrabalha = diaHoje && ["ferias", "afastamento"].includes(diaHoje.situacao);
  const minhasCorrecoes = (dados?.correcoes ?? []).slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">Controle de ponto</h1>
        {alvo && !proprio && (
          <p className="mt-1 text-sm text-ink-muted">
            Ponto de <strong className="text-ink">{alvo.nome}</strong> ·{" "}
            <Link href="/dp/ponto" className="font-medium text-brand hover:underline">
              voltar
            </Link>
          </p>
        )}
      </div>

      {!alvo && <p className={`${CARD_CLASS} px-6 py-8 text-center text-sm text-ink-muted`}>Você não tem ficha de colaborador, então não registra ponto. {equipe.length ? "Veja a equipe logo abaixo." : ""}</p>}
      {alvo && !alvo.registra_ponto && (
        <p className={`${CARD_CLASS} px-6 py-8 text-center text-sm text-ink-muted`}>
          {proprio ? "Seu cadastro não está configurado para registrar ponto." : `${alvo.nome} não registra ponto.`}
          {acesso.perms.administrador && (
            <>
              {" "}
              <Link href={`/dp/colaboradores/${alvo.id}`} className="font-medium text-brand hover:underline">
                Ligar o controle de ponto na ficha
              </Link>
            </>
          )}
        </p>
      )}

      {alvo && ctx && diaHoje && prox && (
        <>
          {/* registrar: pensado para o celular */}
          {proprio && (
            <section className={`${CARD_CLASS} overflow-hidden`}>
              <div className="bg-brand px-5 py-5 text-white">
                <p className="text-xs font-medium uppercase tracking-wide opacity-80">{dataBR(hoje)} · agora {hhmm(agora.minutos)}</p>
                <p className="mt-1 text-lg font-semibold">
                  {naoTrabalha ? (diaHoje.situacao === "ferias" ? "Você está de férias hoje" : `Hoje: ${diaHoje.detalhe ?? "afastamento"}`) : prox.proximo ? `Próximo registro: ${ROTULO_REGISTRO[prox.proximo]}` : "Expediente finalizado"}
                </p>
                <p className="text-sm opacity-90">{ultimo ? `Último registro: ${ROTULO_REGISTRO[ultimo]} às ${hhmm(diaHoje.registros[ultimo])}` : "Nenhum registro hoje"}</p>
              </div>
              <div className="space-y-3 p-5">
                {prox.proximo && (
                  <form action={registrarPonto}>
                    <input type="hidden" name="tipo" value={prox.proximo} />
                    <BotaoEnviar className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand px-6 py-6 text-xl font-bold text-white shadow-md transition hover:opacity-90 active:scale-[0.99]" textoEnviando="Registrando…">
                      <Clock size={26} /> Registrar {ROTULO_REGISTRO[prox.proximo].toLowerCase()}
                    </BotaoEnviar>
                  </form>
                )}
                {prox.alternativa && (
                  <form action={registrarPonto}>
                    <input type="hidden" name="tipo" value={prox.alternativa} />
                    <BotaoEnviar className={`${SECONDARY_BUTTON_CLASS} w-full`} textoEnviando="Registrando…">
                      Encerrar o dia sem intervalo (registrar saída)
                    </BotaoEnviar>
                  </form>
                )}
                <p className="text-center text-[11px] text-ink-muted">O horário gravado é o do servidor do Vitral, no momento do toque.</p>
              </div>
            </section>
          )}

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Horas trabalhadas hoje", duracao(diaHoje.trabalhadas), `de ${duracao(diaHoje.previstas)} previstas`],
              ["Saldo do dia", diaHoje.situacao === "em_andamento" || diaHoje.situacao === "sem_registro" ? "—" : duracao(diaHoje.saldo, true), diaHoje.situacao === "em_andamento" ? "fecha ao registrar a saída" : ""],
              [`Saldo de ${MESES[m - 1].toLowerCase()}`, duracao(resumoMes.saldo, true), `${resumoMes.faltas} falta(s) · ${resumoMes.incompletos} dia(s) incompleto(s)`],
              acesso.config.bancoHorasAtivo ? ["Banco de horas", duracao(banco, true), alvo.ponto_inicio ? `desde ${dataBR(alvo.ponto_inicio)}` : ""] : ["Horas extras no mês", duracao(resumoMes.extras), "banco de horas desligado"],
            ].map(([rotulo, valor, detalhe]) => (
              <div key={rotulo} className={`${CARD_CLASS} px-4 py-3`}>
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{rotulo}</p>
                <p className="num mt-1 text-xl font-semibold text-ink">{valor}</p>
                {detalhe && <p className="text-[11px] text-ink-muted">{detalhe}</p>}
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink">Espelho mensal</h2>
              <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
                <Link href={hrefMes(outroMes(-1))} aria-label="Mês anterior" className="rounded-lg p-2 text-ink-muted hover:bg-background">
                  <ChevronLeft size={16} />
                </Link>
                <span className="min-w-[120px] text-center text-sm font-semibold text-ink">
                  {MESES[m - 1]}/{ano}
                </span>
                <Link href={hrefMes(outroMes(1))} aria-label="Próximo mês" className="rounded-lg p-2 text-ink-muted hover:bg-background">
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
            <Espelho dias={dias} hoje={hoje} />
            <p className="text-xs text-ink-muted">
              Previstas {duracao(resumoMes.previstas)} · trabalhadas {duracao(resumoMes.trabalhadas)} · extras {duracao(resumoMes.extras)} · atrasos {duracao(resumoMes.atrasos)}. Tolerância de {acesso.config.toleranciaMin} min por dia.
            </p>
          </section>

          {(proprio || decide) && (
            <section className={`${CARD_CLASS} p-4 sm:p-5`}>
              <details open={resumoMes.incompletos > 0 && proprio}>
                <summary className="cursor-pointer text-sm font-semibold text-brand">{decide ? "Corrigir um registro (vale na hora, com registro no histórico)" : "Pedir correção de ponto"}</summary>
                <form action={solicitarCorrecao} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <input type="hidden" name="colaborador_id" value={alvo.id} />
                  <label className="block">
                    <span className={ROTULO}>Data</span>
                    <input type="date" name="data" required max={hoje} min={alvo.ponto_inicio ?? undefined} className={INPUT_CLASS} />
                  </label>
                  <label className="block">
                    <span className={ROTULO}>Registro</span>
                    <select name="tipo" required className={INPUT_CLASS}>
                      {TIPOS_REGISTRO.map((t: TipoRegistro) => (
                        <option key={t} value={t}>
                          {ROTULO_REGISTRO[t]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={ROTULO}>Novo horário</span>
                    <input type="time" name="horario" required className={INPUT_CLASS} />
                  </label>
                  <div>
                    <span className={ROTULO}>Anexo (opcional)</span>
                    <CampoArquivo destino="correcao" colaboradorId={alvo.id} rotulo="Anexar" />
                  </div>
                  <label className="block sm:col-span-2 lg:col-span-4">
                    <span className={ROTULO}>Justificativa</span>
                    <input name="justificativa" required placeholder="Ex.: esqueci de bater o retorno do almoço" className={INPUT_CLASS} />
                  </label>
                  <div>
                    <BotaoEnviar className={SECONDARY_BUTTON_CLASS} textoEnviando="Enviando…">
                      {decide ? "Corrigir" : "Enviar pedido"}
                    </BotaoEnviar>
                  </div>
                </form>
              </details>
              {minhasCorrecoes.length > 0 && (
                <ul className="mt-4 divide-y divide-border border-t border-border text-xs">
                  {minhasCorrecoes.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <span className="text-ink">
                        <span className="num">{dataBR(c.data)}</span> · {ROTULO_REGISTRO[c.tipo as TipoRegistro]}: <span className="num">{c.horario_original ? hhmm(localDe(c.horario_original).minutos) : "sem registro"}</span> →{" "}
                        <span className="num font-semibold">{hhmm(localDe(c.horario_solicitado).minutos)}</span>
                        <span className="block text-ink-muted">
                          “{c.justificativa}” — {c.solicitado_por_nome ?? "—"}
                          {c.motivo_recusa ? ` · recusada: ${c.motivo_recusa}` : ""}
                        </span>
                      </span>
                      <span className={`rounded-full px-2 py-0.5 font-medium ${c.status === "aprovada" ? "bg-emerald-50 text-emerald-800" : c.status === "recusada" ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-800"}`}>
                        {c.status === "aprovada" ? `Aprovada por ${c.decidido_por_nome ?? "—"}` : c.status === "recusada" ? "Recusada" : "Aguardando gestor"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {acesso.perms.administrador && !proprio && acesso.config.bancoHorasAtivo && (
            <section className={`${CARD_CLASS} p-4 sm:p-5`}>
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-ink-muted">Ajuste manual do banco de horas</summary>
                <form action={lancarAjusteBanco} className="mt-4 grid gap-3 sm:grid-cols-[140px_1fr_auto] sm:items-end">
                  <input type="hidden" name="colaborador_id" value={alvo.id} />
                  <label className="block">
                    <span className={ROTULO}>Horas (ex.: 2:30 ou -1:00)</span>
                    <input name="horas" required className={`${INPUT_CLASS} num`} />
                  </label>
                  <label className="block">
                    <span className={ROTULO}>Motivo</span>
                    <input name="motivo" required placeholder="Ex.: saldo trazido de antes do Vitral" className={INPUT_CLASS} />
                  </label>
                  <BotaoEnviar className={SECONDARY_BUTTON_CLASS}>Lançar</BotaoEnviar>
                </form>
                {(dados?.ajustes ?? []).length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-ink-muted">
                    {dados!.ajustes.map((a) => (
                      <li key={a.id}>
                        {dataBR(a.data)} · <span className="num">{duracao(a.minutos, true)}</span> · {a.motivo} · {a.criado_por_nome ?? "—"}
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </section>
          )}
        </>
      )}

      {acesso.perms.gestorDeEquipe && !sp.colaborador && (
        <>
          {pendentes.length > 0 && (
            <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-sm font-semibold text-amber-900">Correções de ponto aguardando você ({pendentes.length})</h2>
              {pendentes.map((c) => {
                const pessoa = equipe.find((e) => e.id === c.colaborador_id);
                return (
                  <div key={c.id} className={`${CARD_CLASS} space-y-3 p-4`}>
                    <p className="text-sm text-ink">
                      <strong>{pessoa?.nome ?? "—"}</strong> · <span className="num">{dataBR(c.data)}</span> · {ROTULO_REGISTRO[c.tipo as TipoRegistro]}:{" "}
                      <span className="num">{c.horario_original ? hhmm(localDe(c.horario_original).minutos) : "sem registro"}</span> → <span className="num font-semibold">{hhmm(localDe(c.horario_solicitado).minutos)}</span>
                    </p>
                    <p className="text-xs text-ink-muted">
                      “{c.justificativa}”
                      {c.anexo_caminho && (
                        <>
                          {" · "}
                          <a href={`/dp/arquivo?tipo=correcao&id=${c.id}`} target="_blank" rel="noreferrer" className="text-brand underline">
                            ver anexo
                          </a>
                        </>
                      )}
                    </p>
                    <div className="flex flex-wrap items-end gap-2">
                      <form action={decidirCorrecao}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="decisao" value="aprovar" />
                        <BotaoEnviar className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90" textoEnviando="Aprovando…">
                          Aprovar
                        </BotaoEnviar>
                      </form>
                      <form action={decidirCorrecao} className="flex flex-1 flex-wrap items-end gap-2">
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="decisao" value="recusar" />
                        <input name="motivo" required placeholder="Motivo da recusa" className={`${INPUT_CLASS} min-w-[160px] flex-1`} />
                        <BotaoEnviar className={SECONDARY_BUTTON_CLASS} textoEnviando="Recusando…">
                          Recusar
                        </BotaoEnviar>
                      </form>
                    </div>
                  </div>
                );
              })}
            </section>
          )}
          {equipe.length > 0 && dadosEquipe && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-ink">Ponto da equipe hoje</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {equipe.map((c) => {
                  const d = diaDoContexto(contextoPonto(c, acesso.config, dadosEquipe, agoraIso), hoje);
                  return (
                    <li key={c.id}>
                      <Link href={`/dp/ponto?colaborador=${c.id}`} className={`${CARD_CLASS} flex items-center gap-3 px-4 py-3 transition hover:border-brand/40`}>
                        <Avatar c={c} tamanho={36} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{c.nome}</span>
                          <span className="num block text-xs text-ink-muted">{d.registros.entrada !== undefined ? `Entrada ${hhmm(d.registros.entrada)} · ${duracao(d.trabalhadas)} hoje` : "Sem registro hoje"}</span>
                        </span>
                        <SeloHoje status={statusHoje(d, true)} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
