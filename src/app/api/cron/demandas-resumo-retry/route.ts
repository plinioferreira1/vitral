import { NextResponse } from "next/server";
import { enviarResumoIndividualDemandas } from "@/lib/demandas/email-resumo-individual";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Segunda tentativa às 8h30, SOMENTE para envios marcados com erro.
 *  Os envios já confirmados ou em andamento não serão duplicados. */
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== "Bearer " + segredo)
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  try {
    const resultado = await enviarResumoIndividualDemandas();
    return NextResponse.json({ ok: resultado.falhas === 0, ...resultado },
      { status: resultado.falhas === 0 ? 200 : 500 });
  } catch (e) {
    console.error("Retentativa do resumo individual de demandas", e);
    return NextResponse.json({ erro: "Falha na retentativa do resumo individual" }, { status: 500 });
  }
}
