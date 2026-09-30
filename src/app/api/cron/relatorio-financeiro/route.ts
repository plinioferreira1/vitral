import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarRelatorioFinanceiroDiario } from "@/lib/relatorio-financeiro-diario";
import { enviarResumoProcessosDiario } from "@/lib/relatorio-processos-diario";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  // Vercel Cron chama essa rota com esse header; se alguém tentar
  // chamar de fora sem o segredo certo, recusa.
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: tenants } = await supabase.from("tenants").select("id");

  // Dois e-mails diários por empresa: resumo financeiro e resumo dos
  // processos (este substitui as notificações por e-mail do Google Agenda).
  const resultados: { tenantId: string; tipo: string; sucesso: boolean; erro?: string }[] = [];
  for (const t of tenants ?? []) {
    const [financeiro, processos] = await Promise.all([
      enviarRelatorioFinanceiroDiario(t.id),
      enviarResumoProcessosDiario(t.id),
    ]);
    resultados.push({ tenantId: t.id, tipo: "financeiro", ...financeiro });
    resultados.push({ tenantId: t.id, tipo: "processos", ...processos });
  }

  return NextResponse.json({ ok: true, resultados });
}
