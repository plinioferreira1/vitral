import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarFechamentoDemandas } from "@/lib/demandas/email-diario";

export const dynamic="force-dynamic";
export const maxDuration=60;

/** Enviado às 18h de Brasília pelo Vercel Cron; sem autorização pública. */
export async function GET(request:Request) {
  const segredo=process.env.CRON_SECRET;
  if(!segredo || request.headers.get("authorization")!==`Bearer ${segredo}`) {
    return NextResponse.json({erro:"Não autorizado"},{status:401});
  }
  const db=createAdminClient();
  const {data:tenants,error}=await db.from("tenants").select("id");
  if(error)return NextResponse.json({erro:"Falha ao consultar empresas"},{status:500});
  const resultados: {tenantId:string;sucesso:boolean;ignorado?:boolean;erro?:string}[]=[];
  for(const t of tenants??[]) {
    resultados.push({tenantId:t.id,...await enviarFechamentoDemandas(t.id)});
  }
  return NextResponse.json({ok:resultados.every(r=>r.sucesso),resultados},{
    status:resultados.every(r=>r.sucesso)?200:500,
  });
}
