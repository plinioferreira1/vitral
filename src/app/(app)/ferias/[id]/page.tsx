import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { VoltarLink } from "@/components/voltar-link";
import { formatarDataHoraBR, hojeISO } from "@/lib/data-br";
import {
  ROTULO_ACAO_EVENTO,
  ROTULO_SITUACAO,
  acoesPossiveis,
  aguardandoQuem,
  dataBR,
  impactoEquipe,
  papelNaSolicitacao,
  periodoBR,
  podePedirAlteracao,
  situacao,
  somarDias,
  type Status,
} from "@/lib/ferias/regras";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { marcarNotificacoesFeriasLidas, responderSolicitacao, solicitarFerias } from "../actions";
import { acessoFerias, ausenciasDe, carregarEquipe, equipeDe, saldosDe } from "../dados";
import { ROTULO, ROTULO_TIPO, SeloSituacao } from "../ui";

function Resposta({ id, acao, children }: { id: string; acao: string; children: React.ReactNode }) {
  return (
    <form action={responderSolicitacao} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="acao" value={acao} />
      {children}
    </form>
  );
}

export default async function SolicitacaoFeriasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const acesso = await acessoFerias(supabase, user.id, usuario.nivel_acesso);
  if (!acesso.liberado) redirect("/");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [{ data: s }, { data: eventos }, equipe] = await Promise.all([
    supabase.from("ferias_solicitacoes").select("*").eq("id", id).maybeSingle(),
    supabase.from("ferias_eventos").select("*").eq("solicitacao_id", id).order("criado_em"),
    carregarEquipe(supabase),
  ]);
  if (!s) notFound();
  await marcarNotificacoesFeriasLidas(id);

  const hoje = hojeISO();
  const souDono = s.usuario_id === user.id;
  const papel = papelNaSolicitacao(s, user.id, acesso.administrador);
  const acoes = acoesPossiveis(s.status as Status, papel);
  const sit = situacao(s, hoje);
  const quem = aguardandoQuem(s.status as Status);
  const nomeDono = equipe.nomes.get(s.usuario_id) ?? "Colaborador";
  const nomeGestor = s.gestor_id ? (equipe.nomes.get(s.gestor_id) ?? "Gestor") : "Diretoria";
  const cadastro = equipe.cadastros.find((c) => c.usuario_id === s.usuario_id) ?? null;
  // saldo sem contar este pedido (nem a programação que ele substitui)
  const saldoPeriodo = saldosDe(cadastro, equipe.solicitacoes.filter((x) => x.id !== s.id && x.id !== (s.tipo === "alteracao" ? s.origem_id : null)), equipe.ajustes, hoje).find((p) => p.inicio === s.periodo_aquisitivo_inicio);
  const consumo = s.tipo === "cancelamento" ? 0 : s.dias + s.abono_dias;
  const impacto = !souDono && s.tipo !== "cancelamento" ? impactoEquipe({ inicio: s.data_inicio, fim: s.data_fim }, s.usuario_id, equipeDe(equipe, s.usuario_id), ausenciasDe(equipe)) : null;
  const pedidoVinculado = equipe.solicitacoes.find((x) => x.origem_id === s.id && ["aguardando_analise", "aguardando_colaborador", "aguardando_gestor"].includes(x.status));
  const origem = s.origem_id ? equipe.solicitacoes.find((x) => x.id === s.origem_id) : null;
  const decide = acoes.includes("aprovar");
  const responde = acoes.includes("aceitar_proposta");

  // calendário da equipe ao redor do período pedido
  const janelaInicio = somarDias(s.data_inicio, -5);
  const totalDias = Math.min(45, s.dias + 10);
  const diasJanela = Array.from({ length: totalDias }, (_, i) => somarDias(janelaInicio, i));
  const ausencias = ausenciasDe(equipe);
  const linhasCalendario = impacto
    ? equipeDe(equipe, s.usuario_id)
        .map((p) => ({ ...p, marcas: ausencias.filter((a) => a.usuarioId === p.id && a.inicio <= diasJanela[totalDias - 1] && a.fim >= janelaInicio) }))
        .filter((p) => p.id === s.usuario_id || p.marcas.length > 0)
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <VoltarLink href={souDono ? "/ferias" : "/ferias/equipe"} label={souDono ? "Minhas férias" : "Solicitações de férias"} />
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[24px] font-bold leading-tight tracking-tight text-ink">
            {ROTULO_TIPO[s.tipo]} — {souDono ? "meu pedido" : nomeDono}
          </h1>
          <SeloSituacao situacao={sit} />
        </div>
        {cadastro?.departamento && !souDono && <p className="mt-1 text-sm text-ink-muted">{cadastro.departamento}</p>}
      </div>

      {/* o essencial, sempre à vista */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={`${CARD_CLASS} px-4 py-3`}>
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Situação</p>
          <p className="mt-1 text-sm font-semibold text-ink">{ROTULO_SITUACAO[sit]}</p>
          {s.decidido_em && <p className="text-[11px] text-ink-muted">por {s.decidido_por_nome ?? "—"} em {formatarDataHoraBR(s.decidido_em)}</p>}
        </div>
        <div className={`${CARD_CLASS} px-4 py-3 ${quem && ((quem === "colaborador") === souDono) ? "border-brand/50 bg-brand-soft" : ""}`}>
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Quem responde agora</p>
          <p className="mt-1 text-sm font-semibold text-ink">{quem === null ? "Ninguém — concluído" : quem === "colaborador" ? (souDono ? "Você" : nomeDono) : papel === "gestor" || (papel === "administrador" && !s.gestor_id) ? "Você" : nomeGestor}</p>
        </div>
        <div className={`${CARD_CLASS} px-4 py-3`}>
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{s.status === "aprovado" ? "Período final" : "Período atual proposto"}</p>
          <p className="num mt-1 text-sm font-semibold text-ink">{periodoBR(s.data_inicio, s.data_fim)}</p>
          <p className="text-[11px] text-ink-muted">
            {s.dias} dias · retorno em {dataBR(s.data_retorno)}
            {s.abono_dias ? ` · ${s.abono_dias} vendidos` : ""}
            {s.adiantamento_13 ? " · com adiantamento do 13º" : ""}
          </p>
        </div>
        <div className={`${CARD_CLASS} px-4 py-3`}>
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Saldo de férias</p>
          {saldoPeriodo ? (
            <>
              <p className="num mt-1 text-sm font-semibold text-ink">
                {saldoPeriodo.disponivel} dias → {saldoPeriodo.disponivel - consumo} após {s.tipo === "cancelamento" ? "o cancelamento" : "as férias"}
              </p>
              <p className="text-[11px] text-ink-muted">Período {saldoPeriodo.rotulo}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">—</p>
          )}
        </div>
      </section>

      {s.status === "recusado" && s.motivo_recusa && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <p className="font-semibold">Motivo da recusa</p>
          <p className="mt-0.5">{s.motivo_recusa}</p>
          {souDono && (
            <Link href="/ferias/solicitar" className="mt-2 inline-block text-xs font-semibold text-brand underline">
              Fazer uma nova solicitação
            </Link>
          )}
        </div>
      )}
      {origem && (
        <p className="text-xs text-ink-muted">
          Refere-se às férias aprovadas de{" "}
          <Link href={`/ferias/${origem.id}`} className="font-medium text-brand underline">
            {periodoBR(origem.data_inicio, origem.data_fim)}
          </Link>
          .
        </p>
      )}
      {pedidoVinculado && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Há um pedido de {pedidoVinculado.tipo === "cancelamento" ? "cancelamento" : "alteração"} destas férias em andamento.{" "}
          <Link href={`/ferias/${pedidoVinculado.id}`} className="font-semibold underline">
            Abrir
          </Link>
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* conversa */}
        <section className={`${CARD_CLASS} p-4 sm:p-5`}>
          <h2 className="mb-4 text-sm font-semibold text-ink">Histórico da negociação</h2>
          <ol className="space-y-3">
            {(eventos ?? []).map((e) => {
              const doColaborador = e.papel === "colaborador";
              return (
                <li key={e.id} className={`flex ${doColaborador ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm ${e.papel === "sistema" ? "bg-background text-ink-muted" : doColaborador ? "rounded-tl-sm bg-background text-ink" : "rounded-tr-sm bg-brand-soft text-ink"}`}>
                    <p className="text-xs">
                      <span className="font-semibold">{e.papel === "sistema" ? "Vitral" : (e.usuario_nome ?? "—").split(" ")[0]}</span>{" "}
                      {ROTULO_ACAO_EVENTO[e.acao] ?? e.acao}
                      {e.intervencao ? " (intervenção da administração)" : ""}
                    </p>
                    {e.data_inicio && e.data_fim && e.acao !== "cancelar" && (
                      <p className="num mt-0.5 font-semibold">
                        {periodoBR(e.data_inicio, e.data_fim)} · {e.dias} dias
                      </p>
                    )}
                    {e.comentario && <p className="mt-1 whitespace-pre-line">“{e.comentario}”</p>}
                    <p className="mt-1 text-[11px] text-ink-muted">{formatarDataHoraBR(e.criado_em)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-[11px] text-ink-muted">Este histórico não pode ser editado nem apagado.</p>
        </section>

        {/* ações e contexto */}
        <div className="min-w-0 space-y-4">
          {decide && (
            <section className={`${CARD_CLASS} space-y-3 p-4`}>
              <h2 className="text-sm font-semibold text-ink">{papel === "administrador" ? `Sua resposta (no lugar de ${nomeGestor})` : "Sua resposta"}</h2>
              <Resposta id={s.id} acao="aprovar">
                <input name="comentario" placeholder="Comentário (opcional)" className={INPUT_CLASS} />
                <BotaoEnviar className={`${PRIMARY_BUTTON_CLASS} w-full`} textoEnviando="Aprovando…">
                  {s.tipo === "cancelamento" ? "Aprovar o cancelamento" : `Aprovar ${periodoBR(s.data_inicio, s.data_fim)}`}
                </BotaoEnviar>
              </Resposta>
              {acoes.includes("propor") && s.tipo !== "cancelamento" && (
                <details className="rounded-xl border border-border/70 px-3 py-2.5">
                  <summary className="cursor-pointer text-sm font-semibold text-brand">Propor nova data</summary>
                  <div className="mt-3">
                    <Resposta id={s.id} acao="propor">
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className={ROTULO}>Novo início</span>
                          <input type="date" name="data_inicio" min={hoje} required className={INPUT_CLASS} />
                        </label>
                        <label className="block">
                          <span className={ROTULO}>Dias</span>
                          <input type="number" name="dias" min={1} max={60} defaultValue={s.dias} className={`${INPUT_CLASS} num`} />
                        </label>
                      </div>
                      <textarea name="comentario" rows={2} placeholder="Explique o motivo. Ex.: teremos equipe reduzida no início do mês." className={INPUT_CLASS} />
                      <BotaoEnviar className={`${SECONDARY_BUTTON_CLASS} w-full`} textoEnviando="Enviando…">
                        Enviar proposta
                      </BotaoEnviar>
                    </Resposta>
                  </div>
                </details>
              )}
              <details className="rounded-xl border border-border/70 px-3 py-2.5">
                <summary className="cursor-pointer text-sm font-semibold text-rose-700">Recusar</summary>
                <div className="mt-3">
                  <Resposta id={s.id} acao="recusar">
                    <textarea name="comentario" rows={2} required placeholder="Motivo (obrigatório) — o colaborador vai ler." className={INPUT_CLASS} />
                    <BotaoEnviar className="w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100" textoEnviando="Recusando…">
                      Confirmar recusa
                    </BotaoEnviar>
                  </Resposta>
                </div>
              </details>
            </section>
          )}

          {responde && (
            <section className={`${CARD_CLASS} space-y-3 border-violet-200 p-4`}>
              <h2 className="text-sm font-semibold text-ink">O gestor propôs {periodoBR(s.data_inicio, s.data_fim)}</h2>
              <Resposta id={s.id} acao="aceitar_proposta">
                <BotaoEnviar className={`${PRIMARY_BUTTON_CLASS} w-full`} textoEnviando="Aceitando…">
                  Aceitar nova data
                </BotaoEnviar>
              </Resposta>
              <details className="rounded-xl border border-border/70 px-3 py-2.5">
                <summary className="cursor-pointer text-sm font-semibold text-brand">Fazer contraproposta</summary>
                <div className="mt-3">
                  <Resposta id={s.id} acao="contrapropor">
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className={ROTULO}>Novo início</span>
                        <input type="date" name="data_inicio" min={hoje} required className={INPUT_CLASS} />
                      </label>
                      <label className="block">
                        <span className={ROTULO}>Dias</span>
                        <input type="number" name="dias" min={1} max={60} defaultValue={s.dias} className={`${INPUT_CLASS} num`} />
                      </label>
                    </div>
                    <textarea name="comentario" rows={2} placeholder="Observação. Ex.: consigo reorganizar minha viagem para essa data." className={INPUT_CLASS} />
                    <BotaoEnviar className={`${SECONDARY_BUTTON_CLASS} w-full`} textoEnviando="Enviando…">
                      Enviar contraproposta
                    </BotaoEnviar>
                  </Resposta>
                </div>
              </details>
              <details className="rounded-xl border border-border/70 px-3 py-2.5">
                <summary className="cursor-pointer text-sm font-semibold text-ink-muted">Recusar proposta</summary>
                <div className="mt-3">
                  <Resposta id={s.id} acao="recusar_proposta">
                    <p className="text-xs text-ink-muted">O pedido volta ao gestor com as datas que você tinha pedido.</p>
                    <textarea name="comentario" rows={2} placeholder="Observação (opcional)" className={INPUT_CLASS} />
                    <BotaoEnviar className={`${SECONDARY_BUTTON_CLASS} w-full`} textoEnviando="Enviando…">
                      Manter meu pedido
                    </BotaoEnviar>
                  </Resposta>
                </div>
              </details>
            </section>
          )}

          {acoes.includes("cancelar") && (
            <Resposta id={s.id} acao="cancelar">
              <BotaoComConfirmacao className="text-xs font-medium text-ink-muted underline hover:text-rose-700" textoEnviando="Cancelando…" mensagem="Cancelar esta solicitação? O histórico continua guardado.">
                {souDono ? "Desistir desta solicitação" : "Cancelar esta solicitação (administração)"}
              </BotaoComConfirmacao>
            </Resposta>
          )}

          {souDono && podePedirAlteracao(s, hoje) && !pedidoVinculado && (
            <section className={`${CARD_CLASS} space-y-3 p-4`}>
              <h2 className="text-sm font-semibold text-ink">Precisa mudar?</h2>
              <p className="text-xs text-ink-muted">Férias aprovadas não são editadas direto: você envia um pedido e o gestor aprova ou recusa.</p>
              <Link href={`/ferias/solicitar?alterar=${s.id}`} className={`${SECONDARY_BUTTON_CLASS} w-full`}>
                Pedir alteração das datas
              </Link>
              <details className="rounded-xl border border-border/70 px-3 py-2.5">
                <summary className="cursor-pointer text-sm font-semibold text-rose-700">Pedir cancelamento</summary>
                <form action={solicitarFerias} className="mt-3 space-y-3">
                  <input type="hidden" name="tipo" value="cancelamento" />
                  <input type="hidden" name="origem_id" value={s.id} />
                  <textarea name="observacao" rows={2} required placeholder="Motivo do cancelamento" className={INPUT_CLASS} />
                  <BotaoEnviar className={`${SECONDARY_BUTTON_CLASS} w-full`} textoEnviando="Enviando…">
                    Enviar pedido de cancelamento
                  </BotaoEnviar>
                </form>
              </details>
            </section>
          )}

          {impacto && (
            <section className={`${CARD_CLASS} space-y-2 p-4`}>
              <h2 className="text-sm font-semibold text-ink">Impacto na equipe</h2>
              <p className="text-xs text-ink-muted">No período solicitado{cadastro?.departamento ? ` (${cadastro.departamento})` : ""}:</p>
              <ul className="space-y-1 text-sm text-ink">
                <li>
                  <strong className="num">{new Set(impacto.emFerias.map((a) => a.usuarioId)).size}</strong> já estará(ão) de férias
                  {impacto.emFerias.length > 0 && <span className="block text-xs text-ink-muted">{impacto.emFerias.map((a) => `${a.nome} (${periodoBR(a.inicio, a.fim)})`).join("; ")}</span>}
                </li>
                <li>
                  <strong className="num">{new Set(impacto.afastados.map((a) => a.usuarioId)).size}</strong> estará(ão) afastado(s)
                  {impacto.afastados.length > 0 && <span className="block text-xs text-ink-muted">{impacto.afastados.map((a) => `${a.nome} (${periodoBR(a.inicio, a.fim)})`).join("; ")}</span>}
                </li>
                <li>
                  <strong className="num">{impacto.disponiveis}</strong> de {impacto.totalEquipe} colega(s) disponíveis
                </li>
              </ul>
              <p className="text-[11px] text-ink-muted">É só um alerta: o Vitral não bloqueia a aprovação.</p>
            </section>
          )}
        </div>
      </div>

      {impacto && (
        <section className={`${CARD_CLASS} p-4 sm:p-5`}>
          <h2 className="mb-3 text-sm font-semibold text-ink">Calendário da equipe no período</h2>
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-0 text-[10px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-surface pr-3 text-left font-medium text-ink-muted">Pessoa</th>
                  {diasJanela.map((d) => (
                    <th key={d} className={`num w-6 min-w-6 px-0 text-center font-normal ${d >= s.data_inicio && d <= s.data_fim ? "font-semibold text-brand" : "text-ink-muted"}`}>
                      {d.slice(8, 10)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhasCalendario.map((p) => (
                  <tr key={p.id}>
                    <td className="sticky left-0 z-10 max-w-[140px] truncate bg-surface py-1 pr-3 text-xs text-ink">{p.id === s.usuario_id ? `${p.nome} (pedido)` : p.nome}</td>
                    {diasJanela.map((d) => {
                      const marca = p.marcas.find((a) => a.inicio <= d && a.fim >= d);
                      const pedido = p.id === s.usuario_id && d >= s.data_inicio && d <= s.data_fim;
                      return (
                        <td key={d} className="p-0">
                          <div className={`mx-px h-5 rounded-sm ${pedido ? "bg-brand/70" : marca?.tipo === "ferias" ? "bg-emerald-400" : marca ? "bg-amber-400" : "bg-background"}`} title={marca ? `${p.nome}: ${marca.tipo === "ferias" ? "férias" : "afastamento"}` : undefined} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
            <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-brand/70 align-middle" />período pedido</span>
            <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400 align-middle" />férias aprovadas</span>
            <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-amber-400 align-middle" />afastamento</span>
            <span>De {dataBR(diasJanela[0])} a {dataBR(diasJanela[totalDias - 1])}. Só aparecem o solicitante e quem estará ausente.</span>
          </p>
        </section>
      )}
    </div>
  );
}
