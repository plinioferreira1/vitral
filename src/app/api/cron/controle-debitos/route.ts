import { NextResponse } from "next/server";
import { hojeISO } from "@/lib/data-br";
import { rotinaDiariaDebitos } from "@/lib/debitos/rotina";
import { rotinaDiariaFerias } from "@/lib/ferias/rotina";
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
  const admin = createAdminClient();
  const resultados = await rotinaDiariaDebitos(admin, hojeISO());
  // aproveita a mesma execução diária: aviso de "férias próximas"
  let ferias: { avisos: number } | { erro: string };
  try {
    ferias = await rotinaDiariaFerias(admin, hojeISO());
  } catch (erro) {
    ferias = { erro: erro instanceof Error ? erro.message : String(erro) };
  }
  return NextResponse.json({ ok: true, resultados, ferias });
}
