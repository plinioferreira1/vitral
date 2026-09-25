import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarRelatorioFinanceiroDiario } from "@/lib/relatorio-financeiro-diario";

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

  const resultados: { tenantId: string; sucesso: boolean; erro?: string }[] = [];
  for (const t of tenants ?? []) {
    const resultado = await enviarRelatorioFinanceiroDiario(t.id);
    resultados.push({ tenantId: t.id, ...resultado });
  }

  return NextResponse.json({ ok: true, resultados });
}
