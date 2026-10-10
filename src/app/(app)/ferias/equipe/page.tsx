import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CARD_CLASS } from "@/components/ui/styles";
import { hojeISO } from "@/lib/data-br";
import { GRUPOS_GESTOR, ROTULO_GRUPO, dataBR, fraseSituacao, grupoDoGestor, periodoBR, situacao, type GrupoGestor } from "@/lib/ferias/regras";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { acessoFerias, ausenciasDe, carregarEquipe, saldoTotal, saldosDe } from "../dados";
import { NavFerias, ROTULO_TIPO, SeloSituacao } from "../ui";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default async function EquipeFeriasPage({ searchParams }: { searchParams: Promise<{ aba?: string; grupo?: string; mes?: string }> }) {
  const sp = await searchParams;
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const acesso = await acessoFerias(supabase, user.id, usuario.nivel_acesso);
  if (!acesso.liberado) redirect("/");
  if (!acesso.analisa) redirect("/ferias");
  const hoje = hojeISO();
  const e = await carregarEquipe(supabase);
  const daEquipe = e.solicitacoes.filter((s) => s.usuario_id !== user.id && s.status !== "rascunho");
  const contagem = Object.fromEntries(GRUPOS_GESTOR.map((g) => [g, daEquipe.filter((s) => grupoDoGestor(s.status) === g).length])) as Record<GrupoGestor, number>;
  const cadastroDe = new Map(e.cadastros.map((c) => [c.usuario_id, c]));

  if (sp.aba === "calendario") {
    const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : hoje.slice(0, 7);
    const [ano, m] = mes.split("-").map(Number);
    const ultimo = new Date(Date.UTC(ano, m, 0)).getUTCDate();
    const dias = Array.from({ length: ultimo }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`);
    const outro = (delta: number) => new Date(Date.UTC(ano, m - 1 + delta, 1)).toISOString().slice(0, 7);
    const ausencias = ausenciasDe(e).filter((a) => a.inicio <= dias[ultimo - 1] && a.fim >= dias[0]);
    const pessoas = e.cadastros.filter((c) => c.participa).map((c) => ({ id: c.usuario_id, nome: e.nomes.get(c.usuario_id) ?? "—", departamento: c.departamento }));
    pessoas.sort((a, b) => (a.departamento ?? "").localeCompare(b.departamento ?? "") || a.nome.localeCompare(b.nome));

    return (
      <div className="mx-auto w-full min-w-0 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">Calendário da equipe</h1>
          <div className="flex items-center gap-1 rounded-xl border border-border bg-surface p-1">
            <Link href={`/ferias/equipe?aba=calendario&mes=${outro(-1)}`} aria-label="Mês anterior" className="rounded-lg p-2 text-ink-muted hover:bg-background">
              <ChevronLeft size={16} />
            </Link>
            <span className="min-w-[128px] text-center text-sm font-semibold text-ink">
              {MESES[m - 1]}/{ano}
            </span>
            <Link href={`/ferias/equipe?aba=calendario&mes=${outro(1)}`} aria-label="Próximo mês" className="rounded-lg p-2 text-ink-muted hover:bg-background">
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
        <NavFerias acesso={acesso} atual="calendario" pendentes={contagem.pendentes} />

        {pessoas.length === 0 ? (
          <p className={`${CARD_CLASS} px-6 py-10 text-center text-sm text-ink-muted`}>Ninguém com cadastro de férias ainda.</p>
        ) : (
          <section className={`${CARD_CLASS} p-4 sm:p-5`}>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-separate border-spacing-0 text-[10px]">
                <thead>
                  <tr>
                    <th className="pr-3 text-left font-medium text-ink-muted">Pessoa</th>
                    {dias.map((d) => (
                      <th key={d} className={`num px-0 text-center font-normal ${d === hoje ? "font-bold text-brand" : [0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay()) ? "text-ink-muted/50" : "text-ink-muted"}`}>
                        {d.slice(8, 10)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pessoas.map((p) => (
                    <tr key={p.id}>
                      <td className="max-w-[170px] truncate py-1 pr-3 text-xs text-ink" title={p.departamento ?? undefined}>
                        {p.nome}
                      </td>
                      {dias.map((d) => {
                        const marca = ausencias.find((a) => a.usuarioId === p.id && a.inicio <= d && a.fim >= d);
                        return (
                          <td key={d} className="p-0">
                            <div className={`mx-px h-5 rounded-sm ${marca?.tipo === "ferias" ? "bg-emerald-400" : marca ? "bg-amber-400" : "bg-background"}`} title={marca ? `${p.nome}: ${marca.tipo === "ferias" ? "férias" : "afastamento"} (${periodoBR(marca.inicio, marca.fim)})` : undefined} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="space-y-2 md:hidden">
              {ausencias.length === 0 && <li className="text-sm text-ink-muted">Ninguém ausente neste mês.</li>}
              {ausencias.map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-ink">{a.nome}</span>
                  <span className={`num shrink-0 rounded-full px-2 py-0.5 text-xs ${a.tipo === "ferias" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                    {a.tipo === "ferias" ? "Férias" : "Afastamento"} · {periodoBR(a.inicio, a.fim)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex flex-wrap gap-x-4 text-[11px] text-ink-muted">
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400 align-middle" />férias aprovadas</span>
              <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-amber-400 align-middle" />afastamento</span>
            </p>
          </section>
        )}

        <p className="text-xs text-ink-muted">
          Licenças, atestados e outras ausências são registrados em{" "}
          <Link href="/dp/ausencias" className="font-medium text-brand hover:underline">
            Departamento Pessoal › Ausências e afastamentos
          </Link>{" "}
          e aparecem aqui automaticamente.
        </p>
      </div>
    );
  }

  const grupo: GrupoGestor = (GRUPOS_GESTOR as readonly string[]).includes(sp.grupo ?? "") ? (sp.grupo as GrupoGestor) : "pendentes";
  const lista = daEquipe.filter((s) => grupoDoGestor(s.status) === grupo);

  return (
    <div className="mx-auto w-full min-w-0 space-y-5">
      <div>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">Solicitações de férias</h1>
        <p className="mt-1 text-sm text-ink-muted">{acesso.administrador ? "Pedidos de toda a equipe." : "Pedidos da sua equipe."} Abra um pedido para ver o impacto na equipe e responder.</p>
      </div>
      <NavFerias acesso={acesso} atual="equipe" pendentes={contagem.pendentes} />

      <div className="flex flex-wrap gap-2">
        {GRUPOS_GESTOR.map((g) => (
          <Link key={g} href={`/ferias/equipe?grupo=${g}`} className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${grupo === g ? "border-brand bg-brand text-white" : "border-border bg-surface text-ink-muted hover:text-ink"}`}>
            {ROTULO_GRUPO[g]} <span className="num text-xs opacity-80">{contagem[g]}</span>
          </Link>
        ))}
      </div>

      {lista.length === 0 ? (
        <p className={`${CARD_CLASS} px-6 py-10 text-center text-sm text-ink-muted`}>{grupo === "pendentes" ? "Nenhum pedido aguardando você. 🎉" : "Nada por aqui."}</p>
      ) : (
        <ul className="space-y-3">
          {lista.map((s) => {
            const c = cadastroDe.get(s.usuario_id) ?? null;
            const saldo = saldoTotal(saldosDe(c, e.solicitacoes, e.ajustes, hoje));
            const sit = situacao(s, hoje);
            return (
              <li key={s.id}>
                <Link href={`/ferias/${s.id}`} className={`${CARD_CLASS} grid gap-3 px-4 py-3.5 transition hover:border-brand/40 sm:grid-cols-[1.3fr_1.2fr_auto] sm:items-center`}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{e.nomes.get(s.usuario_id) ?? "—"}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {c?.departamento ?? "Sem departamento"} · {ROTULO_TIPO[s.tipo]}
                    </p>
                  </div>
                  <div>
                    <p className="num text-sm text-ink">
                      {periodoBR(s.data_inicio, s.data_fim)} · {s.dias} dias
                    </p>
                    <p className="text-xs text-ink-muted">
                      Saldo: {saldo} dias · pedido em {dataBR(s.criado_em.slice(0, 10))}
                    </p>
                  </div>
                  <SeloSituacao situacao={sit} texto={fraseSituacao(sit, false)} />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
