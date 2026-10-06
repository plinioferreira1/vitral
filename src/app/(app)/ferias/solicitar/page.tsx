import { redirect } from "next/navigation";
import { CARD_CLASS } from "@/components/ui/styles";
import { VoltarLink } from "@/components/voltar-link";
import { hojeISO } from "@/lib/data-br";
import { periodoBR, podePedirAlteracao } from "@/lib/ferias/regras";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { acessoFerias, regimeDe, saldosDe } from "../dados";
import { FormSolicitar } from "./form";

export default async function SolicitarFeriasPage({ searchParams }: { searchParams: Promise<{ alterar?: string }> }) {
  const { alterar } = await searchParams;
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) redirect("/login");
  const supabase = await createClient();
  const acesso = await acessoFerias(supabase, user.id, usuario.nivel_acesso);
  if (!acesso.liberado) redirect("/");
  if (!acesso.participa) redirect("/ferias");
  const hoje = hojeISO();
  const [{ data: solicitacoes }, { data: ajustes }] = await Promise.all([
    supabase.from("ferias_solicitacoes").select("*").eq("usuario_id", user.id),
    supabase.from("ferias_ajustes").select("*").eq("usuario_id", user.id),
  ]);
  const origem = alterar ? (solicitacoes ?? []).find((s) => s.id === alterar && podePedirAlteracao(s, hoje)) : null;
  if (alterar && !origem) redirect("/ferias");
  const saldos = saldosDe(acesso.cadastro, solicitacoes ?? [], ajustes ?? [], hoje, origem?.id);
  const temSaldo = saldos.some((s) => s.adquirido && s.disponivel > 0);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <VoltarLink href="/ferias" label="Minhas férias" />
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">{origem ? "Alterar férias" : "Solicitar férias"}</h1>
        <p className="mt-1 text-sm text-ink-muted">Escolha as datas. O gestor pode aprovar, ou sugerir outra data — vocês combinam por aqui.</p>
      </div>
      {temSaldo || origem ? (
        <FormSolicitar
          saldos={saldos}
          regime={regimeDe(acesso.cadastro)}
          diasPorPeriodo={acesso.cadastro?.dias_por_periodo ?? 30}
          hoje={hoje}
          origem={origem ? { id: origem.id, periodoInicio: origem.periodo_aquisitivo_inicio, dataInicio: origem.data_inicio, dias: origem.dias, abonoDias: origem.abono_dias, resumo: periodoBR(origem.data_inicio, origem.data_fim) } : null}
        />
      ) : (
        <div className={`${CARD_CLASS} px-6 py-10 text-center text-sm text-ink-muted`}>
          Você não tem saldo de férias disponível no momento. {saldos.some((s) => !s.adquirido) ? `O período atual se completa em ${saldos.filter((s) => !s.adquirido)[0].rotulo.split(" a ")[1]}.` : ""}
        </div>
      )}
    </div>
  );
}
