import { NextResponse } from "next/server";
import { enviarResumoIndividualDemandas } from "@/lib/demandas/email-resumo-individual";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== "Bearer " + segredo)
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  try {
    const resultado = await enviarResumoIndividualDemandas();
    return NextResponse.json({ ok: resultado.falhas === 0, ...resultado }, { status: resultado.falhas ? 500 : 200 });
  } catch (e) {
    console.error("Resumo individual das demandas", e);
    return NextResponse.json({ erro: "Não foi possível gerar os resumos individuais" }, { status: 500 });
  }
}
