import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sincronizarRespostasZoho } from "@/lib/debitos/zoho-respostas";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic="force-dynamic";
export const maxDuration=60;

export async function GET(request:Request){
  const secreto=process.env.CRON_SECRET;
  if(!secreto)return NextResponse.json({erro:"Agendamento não configurado"},{status:503});
  if(request.headers.get("authorization")!==`Bearer ${secreto}`)
    return NextResponse.json({erro:"Não autorizado"},{status:401});
  try {
    const db=createAdminClient() as unknown as SupabaseClient;
    const resultado=await sincronizarRespostasZoho(db);
    return NextResponse.json({ok:true,...resultado});
  }catch(e){
    console.error("Falha na sincronização Zoho:",e instanceof Error?e.message:"Erro desconhecido");
    return NextResponse.json({ok:false,erro:"Falha na sincronização Zoho"},{status:502});
  }
}
