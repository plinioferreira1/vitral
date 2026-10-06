import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { CARD_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { hojeISO } from "@/lib/data-br";
import { dataBR, emAndamento, fraseSituacao, grupoDoGestor, periodoBR, situacao } from "@/lib/ferias/regras";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { acessoFerias, saldoTotal, saldosDe, type Solicitacao } from "./dados";
import { NavFerias, ROTULO_TIPO, SeloSituacao } from "./ui";

function Cartao({ s, hoje }: { s: Solicitacao; hoje: string }) {
  const sit = situacao(s, hoje);
  return (
    <Link href={`/ferias/${s.id}`} className={`${CARD_CLASS} flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:border-brand/40`}>
      <div className="min-w-0">
        <p className="num text-sm font-semibold text-ink">
          {periodoBR(s.data_inicio, s.data_fim)} · {s.dias} dias
        </p>
        <p className="text-xs text-ink-muted">
          {ROTULO_TIPO[s.tipo]} · retorno em {dataBR(s.data_retorno)}
          {s.abono_dias ? ` · ${s.abono_dias} dia(s) vendidos` : ""}
        </p>
      </div>
      <SeloSituacao situacao={sit} texto={fraseSituacao(sit, true)} />
    </Link>
  );
}

export default async function MinhasFeriasPage() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const acesso = await acessoFerias(supabase, user.id, usuario.nivel_acesso);
  if (!acesso.liberado) redirect("/");
  const hoje = hojeISO();
  const [{ data: todas }, { data: ajustes }] = await Promise.all([
    supabase.from("ferias_solicitacoes").select("*").order("criado_em", { ascending: false }).limit(500),
    supabase.from("ferias_ajustes").select("*").eq("usuario_id", user.id),
  ]);
  const minhas = (todas ?? []).filter((s) => s.usuario_id === user.id);
  const pendentesEquipe = acesso.analisa ? (todas ?? []).filter((s) => s.usuario_id !== user.id && grupoDoGestor(s.status) === "pendentes").length : 0;
  const saldos = saldosDe(acesso.cadastro, minhas, ajustes ?? [], hoje);
  const adquiridos = saldos.filter((s) => s.adquirido && (s.disponivel > 0 || s.emAnalise > 0));
  const emAquisicao = saldos.find((s) => !s.adquirido);

  const comigo = minhas.filter((s) => s.status === "aguardando_colaborador");
  const andamento = minhas.filter((s) => emAndamento(s.status) && s.status !== "aguardando_colaborador");
  const programadas = minhas.filter((s) => ["programado", "em_ferias"].includes(situacao(s, hoje))).sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));
  const historico = minhas.filter((s) => !emAndamento(s.status) && !["programado", "em_ferias"].includes(situacao(s, hoje)));

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">Minhas férias</h1>
          <p className="mt-1 text-sm text-ink-muted">Seu saldo, seus pedidos e a conversa com o gestor em um só lugar.</p>
        </div>
        {acesso.participa && (
          <Link href="/ferias/solicitar" className={PRIMARY_BUTTON_CLASS}>
            <CalendarPlus size={16} /> Solicitar férias
          </Link>
        )}
      </div>
      <NavFerias acesso={acesso} atual="minhas" pendentes={pendentesEquipe} />

      {!acesso.participa ? (
        <div className={`${CARD_CLASS} px-6 py-10 text-center text-sm text-ink-muted`}>
          Seu cadastro de férias ainda não foi feito.{" "}
          {acesso.administrador ? (
            <Link href="/ferias/configuracao" className="font-medium text-brand hover:underline">
              Fazer o cadastro da equipe
            </Link>
          ) : (
            "Fale com a gestão para informar sua data de admissão."
          )}
        </div>
      ) : (
        <>
          {comigo.length > 0 && (
            <section className="space-y-2 rounded-2xl border border-violet-200 bg-violet-50 p-4">
              <h2 className="text-sm font-semibold text-violet-900">Precisa da sua resposta</h2>
              {comigo.map((s) => (
                <Cartao key={s.id} s={s} hoje={hoje} />
              ))}
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className={`${CARD_CLASS} bg-brand px-5 py-4 text-white`}>
              <p className="text-[11px] font-medium uppercase tracking-wide opacity-80">Saldo disponível</p>
              <p className="num mt-1 text-3xl font-bold">{saldoTotal(saldos)} dias</p>
              <p className="text-xs opacity-80">{emAquisicao ? `Próximo período se completa em ${dataBR(emAquisicao.fim)}` : "—"}</p>
            </div>
            {adquiridos.map((s) => (
              <div key={s.inicio} className={`${CARD_CLASS} px-5 py-4`}>
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">Período {s.rotulo}</p>
                <p className="num mt-1 text-2xl font-semibold text-ink">{s.disponivel} dias</p>
                <p className="text-xs text-ink-muted">
                  {s.utilizados} usados{s.emAnalise ? ` · ${s.emAnalise} em análise` : ""} · usar até {dataBR(s.limite)}
                </p>
              </div>
            ))}
          </section>

          {[
            ["Programadas", programadas],
            ["Em andamento", andamento],
            ["Histórico", historico],
          ].map(([titulo, lista]) =>
            (lista as Solicitacao[]).length === 0 ? null : (
              <section key={titulo as string} className="space-y-2">
                <h2 className="text-sm font-semibold text-ink">{titulo as string}</h2>
                {(lista as Solicitacao[]).map((s) => (
                  <Cartao key={s.id} s={s} hoje={hoje} />
                ))}
              </section>
            )
          )}
          {minhas.length === 0 && <p className={`${CARD_CLASS} px-6 py-8 text-center text-sm text-ink-muted`}>Você ainda não fez nenhum pedido de férias.</p>}
        </>
      )}
    </div>
  );
}
