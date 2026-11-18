import { NextResponse } from "next/server";
import { gerarDemandasRecorrentes } from "@/lib/demandas/recorrencias";
import { enviarEmailsNovasDemandas } from "@/lib/demandas/email-atribuicao";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const maxDuration=60;

export async function GET(req:Request){
 const segredo=process.env.CRON_SECRET;
 if(!segredo||req.headers.get("authorization")!=="Bearer "+segredo)
  return NextResponse.json({erro:"Não autorizado"},{status:401});
 try{
  const recorrencias=await gerarDemandasRecorrentes();
  const emails=await enviarEmailsNovasDemandas();
  return NextResponse.json({ok:recorrencias.falhas===0&&emails.falhas===0,recorrencias,emails},
   {status:recorrencias.falhas===0&&emails.falhas===0?200:500});
 }catch(e){
  console.error("Cron demandas",e instanceof Error?e.message:"erro");
  return NextResponse.json({erro:"Não foi possível processar a fila de demandas"},{status:500});
 }
}
