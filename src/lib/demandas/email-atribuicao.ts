import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail } from "@/lib/email";
import { layoutEmailSacra, botaoEmailSacra, escaparHtmlEmail, EMAIL_SACRA } from "@/lib/email-layout-sacra";

const SITE=process.env.NEXT_PUBLIC_SITE_URL||"https://vitral.sacraimoveis.com.br";
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
    db.from("demandas").select("id,titulo,descricao,prazo,prioridade,responsavel_id,tenant_id").eq("id",item.demanda_id).is("excluida_em",null).single(),
   ]);
   if(u.error||d.error||!u.data||!d.data||!u.data.ativo||
      u.data.tenant_id!==item.tenant_id||d.data.tenant_id!==item.tenant_id||
      d.data.responsavel_id!==item.destinatario_id||!u.data.email)
     throw new Error("Destinatário ou tarefa indisponível");
   const link=SITE+"/demandas/"+d.data.id;
   const prioridade=d.data.prioridade.toLowerCase();
   const corPrioridade=prioridade==="urgente"?"#A52828":prioridade==="alta"?"#A96215":EMAIL_SACRA.vinho;
   const prazo=d.data.prazo?.split("-").reverse().join("/")??"a definir";
   const corpo=layoutEmailSacra("Central de Demandas","Nova demanda atribuída",
    '<p style="margin:0 0 16px;">Olá, <strong>'+escaparHtmlEmail(u.data.nome)+'</strong>! Uma atividade foi atribuída a você.</p>'+
    '<div style="background:#FAF8F5;border:1px solid '+EMAIL_SACRA.borda+';border-radius:10px;padding:18px;margin:0 0 22px;">'+
    '<div style="font-size:17px;font-weight:700;color:'+EMAIL_SACRA.texto+';">'+escaparHtmlEmail(d.data.titulo)+'</div>'+
    '<p style="font-size:13px;margin:10px 0;color:'+corPrioridade+';font-weight:700;">Prioridade: '+escaparHtmlEmail(d.data.prioridade)+' · Prazo: '+escaparHtmlEmail(prazo)+'</p>'+
    (d.data.descricao?'<p style="margin:12px 0 0;white-space:pre-wrap;">'+escaparHtmlEmail(d.data.descricao.slice(0,1000))+'</p>':"")+
    '</div>'+botaoEmailSacra("Abrir minha demanda no VITRAL",link)+
    '<p style="font-size:12px;color:'+EMAIL_SACRA.secundario+';margin:20px 0 0;">Acompanhe e registre seu andamento na Central de Demandas.</p>');
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
