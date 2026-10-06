import type { createAdminClient } from "@/lib/supabase/admin";
import { notificacoesDaAcao, periodoBR, somarDias } from "./regras";

type Admin = ReturnType<typeof createAdminClient>;

/** Rotina diária: avisa o colaborador quando faltam até 7 dias para as férias (uma única vez por férias). */
export async function rotinaDiariaFerias(admin: Admin, hoje: string): Promise<{ avisos: number }> {
  const { data: proximas } = await admin
    .from("ferias_solicitacoes")
    .select("id, tenant_id, usuario_id, data_inicio, data_fim, dias")
    .eq("status", "aprovado")
    .neq("tipo", "cancelamento")
    .is("aviso_proximas_em", null)
    .gt("data_inicio", hoje)
    .lte("data_inicio", somarDias(hoje, 7));
  let avisos = 0;
  for (const s of proximas ?? []) {
    const [n] = notificacoesDaAcao("proximas", { colaborador: "", periodo: periodoBR(s.data_inicio, s.data_fim), dias: s.dias });
    const { error } = await admin.from("ferias_notificacoes").insert({ tenant_id: s.tenant_id, usuario_id: s.usuario_id, solicitacao_id: s.id, tipo: n.tipo, titulo: n.titulo, mensagem: n.mensagem });
    if (error) continue;
    await admin.from("ferias_solicitacoes").update({ aviso_proximas_em: new Date().toISOString() }).eq("id", s.id);
    avisos++;
  }
  return { avisos };
}
