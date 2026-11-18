import {NextResponse} from "next/server";
import {getUsuarioAtual} from "@/lib/usuario-atual";
import {createAdminClient} from "@/lib/supabase/admin";
import {endpointValido,VAPID_PUBLIC_KEY} from "@/lib/demandas/push";
export const runtime="nodejs";
const erro=(msg:string,code:number)=>NextResponse.json({erro:msg},{status:code});

export async function GET(){
  const {user,usuario}=await getUsuarioAtual();
  if(!user||!usuario?.ativo||!usuario.tenant_id)return erro("Sessão inválida",401);
  return NextResponse.json({publicKey:VAPID_PUBLIC_KEY||null},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(req:Request){
  const {user,usuario}=await getUsuarioAtual();
  if(!user||!usuario?.ativo||!usuario.tenant_id)return erro("Acesso negado",401);
  let body:unknown;
  try{body=await req.json();}catch{return erro("Assinatura inválida",400);}
  if(!body||typeof body!=="object")return erro("Assinatura inválida",400);
  const sub=body as {endpoint?:unknown;keys?:{p256dh?:unknown;auth?:unknown}};
  const endpoint=typeof sub.endpoint==="string"?sub.endpoint:"";
  const p256dh=typeof sub.keys?.p256dh==="string"?sub.keys.p256dh:"";
  const auth=typeof sub.keys?.auth==="string"?sub.keys.auth:"";
  if(!endpointValido(endpoint)||p256dh.length<40||p256dh.length>300||auth.length<12||auth.length>300){
    return erro("O serviço push deste navegador não é compatível ou retornou uma assinatura inválida.",400);
  }
  const db=createAdminClient();
  const {error}=await db.from("demandas_push_assinaturas").upsert({
    tenant_id:usuario.tenant_id,usuario_id:user.id,endpoint,p256dh,auth_secret:auth,
    atualizada_em:new Date().toISOString(),
  },{onConflict:"endpoint"});
  if(error)return erro("Não foi possível salvar a assinatura de notificações.",503);
  return NextResponse.json({ok:true});
}
export async function DELETE(req:Request){
  const {user,usuario}=await getUsuarioAtual();
  if(!user||!usuario?.ativo||!usuario.tenant_id)return erro("Acesso negado",401);
  const body=await req.json().catch(()=>({})) as {endpoint?:string};
  if(!body.endpoint||!endpointValido(body.endpoint))return erro("Assinatura inválida",400);
  const db=createAdminClient();
  const {error}=await db.from("demandas_push_assinaturas").delete()
    .eq("tenant_id",usuario.tenant_id).eq("usuario_id",user.id).eq("endpoint",body.endpoint);
  if(error)return erro("Não foi possível cancelar as notificações.",503);
  return NextResponse.json({ok:true});
}
