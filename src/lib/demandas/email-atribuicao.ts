import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail } from "@/lib/email";

const SITE=process.env.NEXT_PUBLIC_SITE_URL||"https://vitral.sacraimoveis.com.br";
const escapar=(v:string)=>v.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
export async function enviarEmailsNovasDemandas(ids?:string[]):Promise<{enviados:number;falhas:number}>{
 const db=createAdminClient();
 // Recuperar envios cujo servidor caiu após reservar a fila.
 await db.from("demandas_email_pendentes").update({situacao:"erro"})
   .eq("situacao","enviando").lt("proxima_tentativa",new Date().toISOString());
 let consulta=db.from("demandas_email_pendentes")
  .select("id,tenant_id,demanda_id,destinatario_id,tentativas")
  .in("situacao",["pendente","erro"]).lte("proxima_tentativa",new Date().toISOString())
  .lt("tentativas",6).order("criada_em",{ascending:true}).limit(12);
 if(ids?.length)consulta=consulta.in("demanda_id",ids);
 const {data:fila,error}=await consulta;
 if(error)throw new Error("Não foi possível consultar fila de atribuições");
 let enviados=0,falhas=0;
 for(const item of fila??[]){
  const now=new Date().toISOString();
  const {data:reservado,error:erroReserva}=await db.from("demandas_email_pendentes")
   .update({situacao:"enviando",tentativas:item.tentativas+1,proxima_tentativa:new Date(Date.now()+10*60*1000).toISOString()})
   .eq("id",item.id).in("situacao",["pendente","erro"])
   .lte("proxima_tentativa",now).select("id").maybeSingle();
  if(erroReserva||!reservado)continue;
  try{
   const [u,d]=await Promise.all([
    db.from("usuarios").select("nome,email,ativo,tenant_id").eq("id",item.destinatario_id).single(),
    db.from("demandas").select("id,titulo,descricao,prazo,prioridade,responsavel_id,tenant_id").eq("id",item.demanda_id).single(),
   ]);
   if(u.error||d.error||!u.data||!d.data||!u.data.ativo||
      u.data.tenant_id!==item.tenant_id||d.data.tenant_id!==item.tenant_id||
      d.data.responsavel_id!==item.destinatario_id||!u.data.email)
     throw new Error("Destinatário ou tarefa indisponível");
   const link=SITE+"/demandas/"+d.data.id;
   const corpo='<div style="font-family:Arial,sans-serif;background:#f5f7f5;padding:24px"><div style="max-width:580px;margin:auto;background:white;border-radius:14px;padding:24px">'+
    '<p style="font-size:12px;letter-spacing:1px;color:#0e3e34">VITRAL · NOVA DEMANDA</p>'+
    '<h1 style="font-size:22px;color:#173d32">Uma atividade foi atribuída a você</h1>'+
    '<p>Olá, '+escapar(u.data.nome)+'!</p>'+
    '<h2 style="font-size:17px">'+escapar(d.data.titulo)+'</h2>'+
    '<p style="font-size:13px;color:#53645a">Prioridade: '+escapar(d.data.prioridade)+' · Prazo: '+(d.data.prazo?.split("-").reverse().join("/")??"a definir")+'</p>'+
    (d.data.descricao?'<p style="white-space:pre-wrap">'+escapar(d.data.descricao.slice(0,1000))+'</p>':"")+
    '<p style="margin-top:25px"><a style="display:inline-block;background:#0e3e34;color:white;padding:12px 20px;border-radius:8px;text-decoration:none" href="'+link+'">Abrir minha demanda no VITRAL</a></p>'+
    '<p style="font-size:12px;color:#66756b;margin-top:24px">Acompanhe e registre seu andamento diretamente na Central de Demandas.</p>'+
    '</div></div>';
   await enviarEmail({destinatarios:[u.data.email],assunto:"Nova demanda no VITRAL: "+d.data.titulo,html:corpo});
   const {error:erroConfirmacao}=await db.from("demandas_email_pendentes")
     .update({situacao:"enviado",enviada_em:new Date().toISOString(),ultimo_erro:null}).eq("id",item.id);
   if(erroConfirmacao)throw new Error("Falha ao confirmar envio de e-mail");
   enviados++;
  }catch(e){
   falhas++;
   const msg=e instanceof Error?e.message:"Falha de envio";
   const next=new Date(Date.now()+15*60*1000).toISOString();
   await db.from("demandas_email_pendentes")
     .update({situacao:"erro",ultimo_erro:msg.slice(0,180),proxima_tentativa:next}).eq("id",item.id);
   console.error("E-mail de demanda não enviado",item.id,msg);
  }
 }
 return {enviados,falhas};
}
