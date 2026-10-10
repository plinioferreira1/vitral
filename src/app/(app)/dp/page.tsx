import Link from "next/link";
import { redirect } from "next/navigation";
import { CARD_CLASS } from "@/components/ui/styles";
import { diaDoContexto, espelho, hhmm, intervaloDeDatas, localDe, somarDias, statusHoje, ausenteHoje, presenteHoje, type StatusHoje } from "@/lib/dp/ponto";
import { calcularSaldos, dataBR, periodosAquisitivos } from "@/lib/ferias/regras";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { acessoDP, carregarPonto, contextoPonto } from "./dados";
import { Avatar, SeloHoje } from "./ui";

type Evento = { data: string; texto: string; href: string; tom: "ferias" | "alerta" | "neutro" };

export default async function ResumoDPPage() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const acesso = await acessoDP(supabase, user.id, usuario.nivel_acesso);
  if (!acesso.liberado || !acesso.perms.ver) redirect("/");
  const agoraIso = new Date().toISOString();
  const hoje = localDe(agoraIso).data;
  const { config } = acesso;

  const [{ data: todos }, dados, { data: solicitacoes }, { data: ajustesFerias }, { data: documentos }] = await Promise.all([
    supabase.from("dp_colaboradores").select("*").order("nome"),
    carregarPonto(supabase, somarDias(hoje, -30)),
    supabase.from("ferias_solicitacoes").select("id, usuario_id, tipo, status, periodo_aquisitivo_inicio, dias, abono_dias, data_inicio, data_fim, data_retorno"),
    supabase.from("ferias_ajustes").select("usuario_id, periodo_inicio, dias"),
    supabase.from("dp_documentos").select("id, colaborador_id, titulo, vencimento").not("vencimento", "is", null).lte("vencimento", somarDias(hoje, config.documentosAlertaDias)),
  ]);
  const ativos = (todos ?? []).filter((c) => c.status === "ativo");
  const nome = new Map((todos ?? []).map((c) => [c.id, c.nome]));

  // hoje
  const linhas = ativos.map((c) => {
    const ctx = contextoPonto(c, config, dados, agoraIso);
    const dia = diaDoContexto(ctx, hoje);
    // pendências: dias incompletos nos últimos 30 dias (só de quem registra ponto)
    const incompletos = c.registra_ponto ? espelho(ctx, intervaloDeDatas(somarDias(hoje, -30), somarDias(hoje, -1))).filter((d) => d.contabiliza && d.situacao === "ponto_incompleto").length : 0;
    return { c, dia, status: statusHoje(dia, c.registra_ponto) as StatusHoje, incompletos };
  });
  const correcoesPendentes = dados.correcoes.filter((x) => x.status === "pendente").length;
  const pendenciasPonto = linhas.reduce((t, l) => t + l.incompletos, 0) + correcoesPendentes;

  // férias: períodos próximos do vencimento (com saldo)
  const vencendo: { c: (typeof ativos)[number]; limite: string; dias: number }[] = [];
  for (const c of ativos) {
    if (!c.tem_ferias || !c.usuario_id || !c.data_admissao) continue;
    const saldos = calcularSaldos(
      periodosAquisitivos(c.data_admissao, hoje),
      c.dias_ferias_periodo,
      (solicitacoes ?? []).filter((s) => s.usuario_id === c.usuario_id),
      (ajustesFerias ?? []).filter((a) => a.usuario_id === c.usuario_id).map((a) => ({ periodo_inicio: a.periodo_inicio, dias: a.dias }))
    );
    for (const s of saldos) if (s.adquirido && s.disponivel > 0 && s.limite <= somarDias(hoje, config.feriasAlertaVencimentoDias)) vencendo.push({ c, limite: s.limite, dias: s.disponivel });
  }

  // próximos eventos (30 dias)
  const ate = somarDias(hoje, 30);
  const eventos: Evento[] = [];
  const porUsuario = new Map(ativos.filter((c) => c.usuario_id).map((c) => [c.usuario_id!, c]));
  for (const s of solicitacoes ?? []) {
    if (s.status !== "aprovado" || s.tipo === "cancelamento") continue;
    const c = porUsuario.get(s.usuario_id);
    if (!c) continue;
    if (s.data_inicio >= hoje && s.data_inicio <= ate) eventos.push({ data: s.data_inicio, texto: `${c.nome} inicia férias (${s.dias} dias)`, href: `/ferias/${s.id}`, tom: "ferias" });
    if (s.data_retorno >= hoje && s.data_retorno <= ate) eventos.push({ data: s.data_retorno, texto: `${c.nome} volta das férias`, href: `/ferias/${s.id}`, tom: "ferias" });
  }
  for (const c of ativos) {
    if (!c.data_nascimento) continue;
    for (const ano of [Number(hoje.slice(0, 4)), Number(hoje.slice(0, 4)) + 1]) {
      const d = `${ano}-${c.data_nascimento.slice(5)}`;
      if (d >= hoje && d <= ate) eventos.push({ data: d, texto: `Aniversário de ${c.nome}`, href: `/dp/colaboradores/${c.id}`, tom: "neutro" });
    }
  }
  for (const a of dados.ausencias) {
    if (a.status === "aprovada" && a.data_inicio >= hoje && a.data_inicio <= ate) eventos.push({ data: a.data_inicio, texto: `${nome.get(a.colaborador_id) ?? "—"}: ${a.tipo.toLowerCase()} até ${dataBR(a.data_fim)}`, href: "/dp/ausencias", tom: "neutro" });
  }
  for (const v of vencendo) eventos.push({ data: v.limite < hoje ? hoje : v.limite, texto: `${v.c.nome}: ${v.dias} dia(s) de férias ${v.limite < hoje ? `venceram em ${dataBR(v.limite)}` : "vencem"}`, href: `/dp/colaboradores/${v.c.id}?aba=ferias`, tom: "alerta" });
  for (const d of documentos ?? []) eventos.push({ data: d.vencimento! < hoje ? hoje : d.vencimento!, texto: `${nome.get(d.colaborador_id) ?? "—"}: "${d.titulo}" ${d.vencimento! < hoje ? `venceu em ${dataBR(d.vencimento)}` : "vence"}`, href: `/dp/colaboradores/${d.colaborador_id}?aba=documentos`, tom: "alerta" });
  eventos.sort((a, b) => a.data.localeCompare(b.data));

  const cartoes: [string, number, string, string][] = [
    ["Colaboradores ativos", ativos.length, "/dp/colaboradores", ""],
    ["Presentes hoje", linhas.filter((l) => presenteHoje(l.status)).length, "/dp/ponto", "text-emerald-700"],
    ["Em férias hoje", linhas.filter((l) => l.status === "ferias").length, "/ferias/equipe?aba=calendario", "text-violet-700"],
    ["Ausentes hoje", linhas.filter((l) => ausenteHoje(l.status)).length, "/dp/ausencias", "text-orange-700"],
    ["Pendências de ponto", pendenciasPonto, "/dp/ponto", pendenciasPonto ? "text-rose-700" : ""],
    ["Férias perto de vencer", vencendo.length, "/dp/colaboradores", vencendo.length ? "text-amber-700" : ""],
  ];
  const soEu = !acesso.perms.gestorDeEquipe;

  return (
    <div className="mx-auto w-full min-w-0 space-y-5">
      <div>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">Departamento Pessoal</h1>
        <p className="mt-1 text-sm text-ink-muted">{soEu ? "Seu ponto, suas férias e seus documentos." : `Como está a equipe hoje, ${dataBR(hoje)}.`}</p>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cartoes.map(([rotulo, valor, href, cor]) => (
          <Link key={rotulo} href={href} className={`${CARD_CLASS} block px-4 py-3 transition hover:border-brand/40`}>
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{rotulo}</p>
            <p className={`num mt-1 text-2xl font-semibold ${cor || "text-ink"}`}>{valor}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className={`${CARD_CLASS} p-4 sm:p-5`}>
          <h2 className="mb-3 text-sm font-semibold text-ink">Hoje</h2>
          {linhas.length === 0 ? (
            <p className="text-sm text-ink-muted">Nenhum colaborador ativo cadastrado.</p>
          ) : (
            <ul className="divide-y divide-border">
              {linhas.map(({ c, dia, status }) => (
                <li key={c.id}>
                  <Link href={`/dp/colaboradores/${c.id}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                    <Avatar c={c} tamanho={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{c.nome}</span>
                      <span className="block truncate text-xs text-ink-muted">
                        {dia.registros.entrada !== undefined ? `Entrada às ${hhmm(dia.registros.entrada)}` : "Sem entrada registrada"}
                        {dia.registros.saida !== undefined ? ` · saída às ${hhmm(dia.registros.saida)}` : ""}
                        {dia.detalhe ? ` · ${dia.detalhe}` : ""}
                      </span>
                    </span>
                    <SeloHoje status={status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${CARD_CLASS} p-4 sm:p-5`}>
          <h2 className="mb-3 text-sm font-semibold text-ink">Próximos eventos</h2>
          {eventos.length === 0 ? (
            <p className="text-sm text-ink-muted">Nada previsto para os próximos 30 dias.</p>
          ) : (
            <ul className="space-y-2.5">
              {eventos.slice(0, 20).map((e, i) => (
                <li key={i}>
                  <Link href={e.href} className="flex items-start gap-3 text-sm hover:opacity-80">
                    <span className={`num mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${e.tom === "alerta" ? "bg-amber-50 text-amber-800" : e.tom === "ferias" ? "bg-violet-50 text-violet-800" : "bg-background text-ink-muted"}`}>{dataBR(e.data).slice(0, 5)}</span>
                    <span className="text-ink">{e.texto}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
