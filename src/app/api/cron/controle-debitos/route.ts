import { NextResponse } from "next/server";
import { hojeISO } from "@/lib/data-br";
import { rotinaDiariaDebitos } from "@/lib/debitos/rotina";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Automação diária do Controle de Débitos (Locação): gera as
 * conferências da competência do mês (sem duplicar) e, se a diretoria
 * tiver ligado o envio automático, manda as solicitações por e-mail às
 * administradoras. Roda todo dia; cada parte só age a partir do dia
 * configurado e nunca repete o que já fez.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }
  const resultados = await rotinaDiariaDebitos(createAdminClient(), hojeISO());
  return NextResponse.json({ ok: true, resultados });
}
