import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CARD_CLASS, INPUT_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { VoltarLink } from "@/components/voltar-link";
import { formatarDataHoraBR } from "@/lib/data-br";
import { DIAS_SEMANA, bancoDeHoras, cargaSemanalHoras, diasDoMes, duracao, espelho, localDe, podeDecidirSobre, resumir, somarDias } from "@/lib/dp/ponto";
import { ROTULO_ACAO_EVENTO, calcularSaldos, dataBR, fraseSituacao, periodoBR, periodosAquisitivos, situacao } from "@/lib/ferias/regras";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { adicionarAjusteFerias } from "../../../ferias/actions";
import { SeloSituacao } from "../../../ferias/ui";
import { acessoDP, carregarPonto, contextoPonto, jornadaDe } from "../../dados";
import { Espelho } from "../../espelho";
import { Cartao, FormAusencia, FormDocumento, ListaAusencias, ListaDocumentos } from "../../listas";
import { Avatar, ROTULO, ROTULO_STATUS_COLAB } from "../../ui";
import { FormColaborador } from "../form";

const ABAS = [
  ["geral", "Visão geral"],
  ["ferias", "Férias"],
  ["ponto", "Ponto"],
  ["ausencias", "Ausências"],
  ["documentos", "Documentos"],
  ["historico", "Histórico"],
] as const;
type Aba = (typeof ABAS)[number][0];

export default async function FichaColaboradorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string; mes?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const acesso = await acessoDP(supabase, user.id, usuario.nivel_acesso);
  if (!acesso.liberado || !acesso.perms.ver) redirect("/");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: c } = await supabase.from("dp_colaboradores").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();

  const { config, perms } = acesso;
  const admin = perms.administrador;
  const proprio = acesso.eu?.id === c.id;
  const decide = podeDecidirSobre(perms, acesso.eu?.id ?? null, c);
  const abasVisiveis = ABAS.filter(([a]) => (a === "documentos" ? admin || proprio : a === "historico" ? admin : true));
  const aba: Aba = abasVisiveis.some(([a]) => a === sp.aba) ? (sp.aba as Aba) : "geral";
  const agoraIso = new Date().toISOString();
  const hoje = localDe(agoraIso).data;
  const jornada = jornadaDe(c, config);
  const { data: gestor } = c.gestor_id ? await supabase.from("dp_colaboradores").select("nome").eq("id", c.gestor_id).maybeSingle() : { data: null };

  return (
    <div className="mx-auto w-full min-w-0 space-y-5">
      <div>
        {perms.gestorDeEquipe && <VoltarLink href="/dp/colaboradores" label="Colaboradores" />}
        <div className="flex flex-wrap items-center gap-4">
          <Avatar c={c} tamanho={64} />
          <div className="min-w-0">
            <h1 className="text-[24px] font-bold leading-tight tracking-tight text-ink">{c.nome}</h1>
            <p className="text-sm text-ink-muted">
              {[c.cargo, c.departamento, c.empresa].filter(Boolean).join(" · ") || "Ficha incompleta"}
              {c.status !== "ativo" ? ` · ${ROTULO_STATUS_COLAB[c.status]}` : ""}
            </p>
          </div>
        </div>
      </div>

      <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1">
        {abasVisiveis.map(([a, rotulo]) => (
          <Link key={a} href={`/dp/colaboradores/${c.id}${a === "geral" ? "" : `?aba=${a}`}`} className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${aba === a ? "border-brand text-brand" : "border-transparent text-ink-muted hover:text-ink"}`}>
            {rotulo}
          </Link>
        ))}
      </nav>

      {aba === "geral" && (await abaGeral())}
      {aba === "ferias" && (await abaFerias())}
      {aba === "ponto" && (await abaPonto())}
      {aba === "ausencias" && (await abaAusencias())}
      {aba === "documentos" && (await abaDocumentos())}
      {aba === "historico" && (await abaHistorico())}
    </div>
  );

  async function abaGeral() {
    const dados: [string, string | null][] = [
      ["Empresa", c!.empresa],
      ["Departamento", c!.departamento],
      ["Cargo", c!.cargo],
      ["Gestor responsável", gestor?.nome ?? "Diretoria / gerência"],
      ["Data de admissão", c!.data_admissao ? dataBR(c!.data_admissao) : null],
      ["Tipo de vínculo", c!.vinculo],
      ["Situação", ROTULO_STATUS_COLAB[c!.status]],
      ["Jornada", `${jornada.dias.map((d) => DIAS_SEMANA[d]).join(", ")}${c!.jornada ? "" : " (padrão)"}`],
      ["Horário padrão", `${jornada.entrada} às ${jornada.saida}`],
      ["Intervalo", `${jornada.intervalo_min} min`],
      ["Carga horária semanal", `${c!.carga_semanal_horas ?? cargaSemanalHoras(jornada)} h`],
      ["E-mail", c!.email],
      ["Telefone", c!.telefone],
      ["Controle de ponto", c!.registra_ponto ? `Sim, desde ${dataBR(c!.ponto_inicio)}` : "Não registra"],
      ["Férias pelo Vitral", c!.tem_ferias ? `Sim, ${c!.dias_ferias_periodo} dias por período` : "Não"],
      ["Usuário do Vitral", c!.usuario_id ? "Vinculado" : "Sem usuário"],
    ];
    if (admin) {
      const [{ data: colaboradores }, { data: usuarios }] = await Promise.all([supabase.from("dp_colaboradores").select("id, nome, usuario_id").neq("status", "desligado").order("nome"), supabase.from("usuarios").select("id, nome").eq("ativo", true).order("nome")]);
      const ocupados = new Set((colaboradores ?? []).map((x) => x.usuario_id).filter(Boolean));
      return (
        <Cartao titulo="Dados do colaborador">
          <FormColaborador c={c} config={config} colaboradores={colaboradores ?? []} usuarios={(usuarios ?? []).map((u) => ({ ...u, ocupado: ocupados.has(u.id) }))} hoje={hoje} />
        </Cartao>
      );
    }
    return (
      <Cartao titulo="Dados do colaborador">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {dados.map(([rotulo, valor]) => (
            <div key={rotulo}>
              <dt className="text-xs text-ink-muted">{rotulo}</dt>
              <dd className="text-sm text-ink">{valor || "—"}</dd>
            </div>
          ))}
        </dl>
        {proprio && <p className="mt-4 text-xs text-ink-muted">Algum dado errado? Avise a gestão — só diretor e gerente alteram a ficha.</p>}
      </Cartao>
    );
  }

  async function abaFerias() {
    if (!c!.tem_ferias || !c!.usuario_id || !c!.data_admissao) {
      return <p className={`${CARD_CLASS} px-6 py-8 text-center text-sm text-ink-muted`}>{c!.usuario_id ? "Férias pelo Vitral não estão ligadas para esta pessoa (marque na Visão geral e informe a admissão)." : "Sem usuário do Vitral, esta pessoa não solicita férias pelo sistema."}</p>;
    }
    const [{ data: solicitacoes }, { data: ajustes }] = await Promise.all([
      supabase.from("ferias_solicitacoes").select("*").eq("usuario_id", c!.usuario_id).order("criado_em", { ascending: false }),
      supabase.from("ferias_ajustes").select("*").eq("usuario_id", c!.usuario_id).order("criado_em", { ascending: false }),
    ]);
    const saldos = calcularSaldos(periodosAquisitivos(c!.data_admissao, hoje), c!.dias_ferias_periodo, solicitacoes ?? [], ajustes ?? []);
    return (
      <>
        <Cartao titulo="Saldo por período aquisitivo">
          <ul className="divide-y divide-border text-sm">
            {saldos.map((s) => (
              <li key={s.inicio} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="num text-ink">{s.rotulo}</span>
                <span className="text-xs text-ink-muted">{s.adquirido ? `${s.utilizados} usados${s.emAnalise ? ` · ${s.emAnalise} em análise` : ""} · usar até ${dataBR(s.limite)}` : "em aquisição"}</span>
                <span className={`num rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.adquirido && s.disponivel > 0 ? (s.limite <= somarDias(hoje, config.feriasAlertaVencimentoDias) ? "bg-amber-50 text-amber-800" : "bg-brand-soft text-brand") : "bg-background text-ink-muted"}`}>{s.adquirido ? `${s.disponivel} dias` : "—"}</span>
              </li>
            ))}
          </ul>
          {admin && saldos.length > 0 && (
            <details className="mt-4 border-t border-border pt-3">
              <summary className="cursor-pointer text-xs font-semibold text-ink-muted">Ajuste de saldo (férias tiradas antes do Vitral, correções)</summary>
              <form action={adicionarAjusteFerias} className="mt-3 grid gap-3 sm:grid-cols-[1.3fr_0.7fr_1.6fr_auto] sm:items-end">
                <input type="hidden" name="usuario_id" value={c!.usuario_id!} />
                <label className="block">
                  <span className={ROTULO}>Período</span>
                  <select name="periodo_inicio" className={INPUT_CLASS}>
                    {saldos.map((s) => (
                      <option key={s.inicio} value={s.inicio}>
                        {s.rotulo}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={ROTULO}>Dias já usados</span>
                  <input type="number" name="dias" min={-60} max={60} required className={`${INPUT_CLASS} num`} />
                </label>
                <label className="block">
                  <span className={ROTULO}>Motivo</span>
                  <input name="motivo" required className={INPUT_CLASS} />
                </label>
                <BotaoEnviar className={SECONDARY_BUTTON_CLASS}>Lançar</BotaoEnviar>
              </form>
              <ul className="mt-2 space-y-1 text-[11px] text-ink-muted">
                {(ajustes ?? []).map((a) => (
                  <li key={a.id}>
                    {dataBR(a.criado_em.slice(0, 10))} · período de {dataBR(a.periodo_inicio)} · {a.dias > 0 ? `−${a.dias}` : `+${-a.dias}`} dia(s) · {a.motivo} · {a.criado_por_nome ?? "—"}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Cartao>
        <Cartao titulo="Solicitações">
          {(solicitacoes ?? []).length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhuma solicitação de férias.</p>
          ) : (
            <ul className="divide-y divide-border">
              {(solicitacoes ?? []).map((s) => {
                const sit = situacao(s, hoje);
                return (
                  <li key={s.id}>
                    <Link href={`/ferias/${s.id}`} className="flex flex-wrap items-center justify-between gap-3 py-2.5 hover:opacity-80">
                      <span className="num text-sm text-ink">
                        {periodoBR(s.data_inicio, s.data_fim)} · {s.dias} dias
                      </span>
                      <SeloSituacao situacao={sit} texto={fraseSituacao(sit, proprio)} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Cartao>
      </>
    );
  }

  async function abaPonto() {
    if (!c!.registra_ponto) return <p className={`${CARD_CLASS} px-6 py-8 text-center text-sm text-ink-muted`}>Esta pessoa não registra ponto pelo Vitral.</p>;
    const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : hoje.slice(0, 7);
    const dados = await carregarPonto(supabase, c!.ponto_inicio && c!.ponto_inicio < `${mes}-01` ? c!.ponto_inicio : `${mes}-01`, c!.id);
    const ctx = contextoPonto(c!, config, dados, agoraIso);
    const dias = espelho(ctx, diasDoMes(mes));
    const r = resumir(dias);
    return (
      <>
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Saldo do mês", duracao(r.saldo, true)],
            [config.bancoHorasAtivo ? "Banco de horas" : "Extras no mês", config.bancoHorasAtivo ? duracao(bancoDeHoras(ctx, dados.ajustes), true) : duracao(r.extras)],
            ["Faltas no mês", String(r.faltas)],
            ["Dias incompletos", String(r.incompletos)],
          ].map(([rotulo, valor]) => (
            <div key={rotulo} className={`${CARD_CLASS} px-4 py-3`}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{rotulo}</p>
              <p className="num mt-1 text-xl font-semibold text-ink">{valor}</p>
            </div>
          ))}
        </section>
        <Espelho dias={dias} hoje={hoje} />
        <Link href={proprio ? "/dp/ponto" : `/dp/ponto?colaborador=${c!.id}`} className="inline-block text-sm font-medium text-brand hover:underline">
          Abrir o controle de ponto completo (outros meses, correções{admin ? ", ajustes" : ""}) →
        </Link>
      </>
    );
  }

  async function abaAusencias() {
    const { data: ausencias } = await supabase.from("dp_ausencias").select("*").eq("colaborador_id", c!.id).order("data_inicio", { ascending: false }).limit(200);
    return (
      <>
        {(decide || proprio) && (
          <Cartao titulo={decide ? "Registrar ausência" : "Informar ausência"}>
            <FormAusencia config={config} colaboradorId={c!.id} proprio={!decide} />
          </Cartao>
        )}
        <Cartao titulo="Ausências e afastamentos">
          <ListaAusencias ausencias={ausencias ?? []} podeDecidir={() => decide} podeCancelar={(a) => admin || (proprio && a.status === "pendente")} />
        </Cartao>
      </>
    );
  }

  async function abaDocumentos() {
    const { data: documentos } = await supabase.from("dp_documentos").select("*").eq("colaborador_id", c!.id).order("criado_em", { ascending: false });
    return (
      <>
        {admin && (
          <Cartao titulo="Adicionar documento">
            <FormDocumento config={config} colaboradorId={c!.id} />
          </Cartao>
        )}
        <Cartao titulo="Documentos">
          <ListaDocumentos documentos={documentos ?? []} hoje={hoje} alertaAte={somarDias(hoje, config.documentosAlertaDias)} podeExcluir={admin} />
        </Cartao>
      </>
    );
  }

  async function abaHistorico() {
    const [{ data: eventos }, { data: feriasEventos }] = await Promise.all([
      supabase.from("dp_eventos").select("*").eq("colaborador_id", c!.id).order("criado_em", { ascending: false }).limit(150),
      c!.usuario_id
        ? supabase.from("ferias_eventos").select("id, acao, usuario_nome, comentario, data_inicio, data_fim, dias, criado_em, ferias_solicitacoes!inner ( usuario_id )").eq("ferias_solicitacoes.usuario_id", c!.usuario_id).order("criado_em", { ascending: false }).limit(100)
        : Promise.resolve({ data: [] as never[] }),
    ]);
    const linhas = [
      ...(eventos ?? []).map((e) => ({ id: e.id, quando: e.criado_em, quem: e.usuario_nome, texto: e.descricao, extra: e.justificativa })),
      ...((feriasEventos ?? []) as { id: string; acao: string; usuario_nome: string | null; comentario: string | null; data_inicio: string | null; data_fim: string | null; dias: number | null; criado_em: string }[]).map((e) => ({
        id: e.id,
        quando: e.criado_em,
        quem: e.usuario_nome,
        texto: `Férias: ${ROTULO_ACAO_EVENTO[e.acao] ?? e.acao}${e.data_inicio && e.data_fim ? ` — ${periodoBR(e.data_inicio, e.data_fim)} (${e.dias} dias)` : ""}`,
        extra: e.comentario,
      })),
    ].sort((a, b) => b.quando.localeCompare(a.quando));
    return (
      <Cartao titulo="Histórico (auditoria)">
        {linhas.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhum registro.</p>
        ) : (
          <ol className="space-y-2.5">
            {linhas.map((l) => (
              <li key={l.id} className="border-l-2 border-border pl-3 text-xs">
                <p className="text-ink">{l.texto}</p>
                {l.extra && <p className="text-ink-muted">“{l.extra}”</p>}
                <p className="text-ink-muted">
                  {l.quem ?? "—"} · {formatarDataHoraBR(l.quando)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Cartao>
    );
  }
}
