import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail } from "@/lib/email";
import { layoutEmailSacra, EMAIL_SACRA, botaoEmailSacra } from "@/lib/email-layout-sacra";

const SITE=process.env.NEXT_PUBLIC_SITE_URL || "https://vitral.sacraimoveis.com.br";
const escapar=(v:unknown)=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const diaSP=(data=new Date())=>{
  const partes=new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(data);
  const p=(t:string)=>partes.find(x=>x.type===t)?.value??"";
  return [p("year"),p("month"),p("day")].join("-");
};
const inicioFim=(dia:string)=>{
  const inicio=new Date(dia+"T03:00:00.000Z");
  return {inicio:inicio.toISOString(),fim:new Date(inicio.getTime()+86400000).toISOString()};
};
const dataPt=(dia:string)=>dia.split("-").reverse().join("/");
type ResultadoEmail={sucesso:boolean;ignorado?:boolean;erro?:string};

/** Resumo baseado nas ações efetivamente registradas; não deduz produtividade por IA. */
export async function enviarFechamentoDemandas(tenantId:string):Promise<ResultadoEmail>{
  const db=createAdminClient();
  const dia=diaSP();
  try{
    const {data:tarefas,error:erroTarefas}=await db.from("demandas")
      .select("id,titulo,status,prazo,responsavel_id,solicitante_id,criada_em,concluida_em")
      .eq("tenant_id",tenantId).is("excluida_em",null).order("criada_em",{ascending:false}).limit(1000);
    if(erroTarefas) throw new Error("Falha ao consultar demandas.");
    if((tarefas??[]).length===0)return {sucesso:true,ignorado:true};
    if((tarefas??[]).length===1000)throw new Error("Relatório excedeu o limite de 1.000 demandas; revise a paginação.");
    const intervalo=inicioFim(dia);
    const [{data:eventos,error:erroEventos},{data:pessoas,error:erroPessoas},{data:inscritos,error:erroInscritos}]=await Promise.all([
      db.from("demandas_atualizacoes").select("demanda_id,tipo,autor_id,status_novo,criada_em")
        .eq("tenant_id",tenantId).gte("criada_em",intervalo.inicio).lt("criada_em",intervalo.fim)
        .order("criada_em",{ascending:false}).limit(1000),
      db.from("usuarios").select("id,nome,email,nivel_acesso,ativo").eq("tenant_id",tenantId),
      db.from("financeiro_email_destinatarios").select("email").eq("tenant_id",tenantId).eq("ativo",true),
    ]);
    if(erroEventos||erroPessoas||erroInscritos)throw new Error("Não foi possível consultar responsáveis, atualizações e destinatários.");
    if((eventos??[]).length===1000)throw new Error("Mais de 1.000 atualizações no dia; relatório incompleto.");
    const gestores=(pessoas??[]).filter(u=>u.ativo&&["diretor","gerente"].includes(u.nivel_acesso));
    const gestoresEmails=new Set(gestores.map(u=>u.email.toLocaleLowerCase("pt-BR")));
    const destinos=[...new Set((inscritos??[]).map(r=>r.email.trim()).filter(e=>gestoresEmails.has(e.toLocaleLowerCase("pt-BR"))))];
    if(!destinos.length)return {sucesso:false,erro:"Nenhum gestor configurado como destinatário do resumo diário."};
    const usuarios=new Map((pessoas??[]).map(u=>[u.id,u.nome]));
    const demandas=tarefas??[];
    const doDia=demandas.filter(t=>t.criada_em>=intervalo.inicio&&t.criada_em<intervalo.fim);
    const concluidasNoDia=[...new Set((eventos??[]).filter(e=>e.tipo==="status"&&e.status_novo==="concluida").map(e=>e.demanda_id))];
    const bloqueadas=demandas.filter(t=>t.status==="bloqueada");
    const atrasadas=demandas.filter(t=>t.status!=="concluida"&&t.prazo&&t.prazo<dia);
    const semAtualizacao=demandas.filter(t=>t.status!=="concluida"&&!eventos?.some(e=>e.demanda_id===t.id));
    const nomesPorId=new Map(demandas.map(t=>[t.id,t.titulo]));
    const resumoLinha=(t:{id:string;titulo:string;responsavel_id:string})=>
      `<li style="margin:0 0 7px"><a href="${SITE}/demandas/${t.id}" style="color:#731515;font-weight:600;text-decoration:none">${escapar(t.titulo)}</a> <span style="color:#746D68">— ${escapar(usuarios.get(t.responsavel_id)??"Equipe")}</span></li>`;
    const secao=(titulo:string,items:string[],vazio:string)=>
      `<section style="margin-top:20px;padding:16px;background:#ffffff;border:1px solid #E8E2DB;border-radius:12px"><h2 style="font-size:16px;margin:0 0 12px;color:#731515">${titulo}</h2>${items.length?`<ul style="margin:0;padding-left:19px;font-size:13px;line-height:21px">${items.slice(0,15).join("")}</ul>`:`<p style="font-size:13px;color:#746D68">${vazio}</p>`}</section>`;
    const statusPorId=new Map(demandas.map(t=>[t.id,t]));
    const historico=(eventos??[]).slice(0,30).map(e=>{
      const t=statusPorId.get(e.demanda_id);
      if(!t)return "";
      const tipo=e.tipo==="criacao"?"Criada":e.tipo==="comentario"?"Comentada":e.status_novo==="concluida"?"Concluída":"Andamento atualizado";
      return `<li style="margin:0 0 6px"><strong>${tipo}</strong>: <a href="${SITE}/demandas/${e.demanda_id}" style="color:#731515">${escapar(nomesPorId.get(e.demanda_id)??"Demanda")}</a> <span style="color:#746D68">(${escapar(usuarios.get(e.autor_id??"")??"Sistema")})</span></li>`;
    }).filter(Boolean);
    const html=layoutEmailSacra("Central de Demandas","Fechamento diário",`
      <div style="background:#FAF8F5;border:1px solid ${EMAIL_SACRA.borda};border-radius:10px;padding:16px;font-size:14px;line-height:25px;">
        <strong>${doDia.length}</strong> novas · <strong>${concluidasNoDia.length}</strong> concluídas ·
        <strong>${(eventos??[]).length}</strong> atualizações · <strong>${bloqueadas.length}</strong> bloqueadas ·
        <strong>${atrasadas.length}</strong> atrasadas
      </div>
      ${secao("O que foi concluído",concluidasNoDia.map(id=>statusPorId.get(id)).filter((t):t is typeof demandas[number]=>!!t).map(resumoLinha),"Nenhuma conclusão registrada hoje.")}
      ${secao("Novas solicitações",doDia.map(resumoLinha),"Nenhuma demanda criada hoje.")}
      ${secao("Bloqueadas ou atrasadas",[...new Map([...bloqueadas,...atrasadas].map(t=>[t.id,t])).values()].map(resumoLinha),"Nenhuma demanda bloqueada ou vencida.")}
      ${secao("Atualizações do dia",historico,"Nenhuma atualização registrada.")}
      ${semAtualizacao.length?`<p style="margin-top:16px;font-size:13px;color:#746D68"><strong>${semAtualizacao.length}</strong> demandas em aberto não tiveram atualizações neste dia.</p>`:""}
      <p style="margin-top:20px;font-size:12px;color:#746D68">Relatório baseado nos registros do sistema; atividades não registradas não são presumidas.</p>
      ${botaoEmailSacra("Abrir relatório completo",SITE+"/demandas/resumo?dia="+dia)}
    `,dataPt(dia)+" · Sacra Netimóveis",760);

    // Reserva envio de forma atômica; se cron repetir não envia o mesmo relatório duas vezes.
    const {error:erroReserva}=await db.from("demandas_email_envios").insert({tenant_id:tenantId,dia,situacao:"pendente"});
    if(erroReserva){
      if(erroReserva.code==="23505")return {sucesso:true,ignorado:true};
      throw new Error("Não foi possível reservar o envio diário.");
    }
    try{
      await enviarEmail({destinatarios:destinos,assunto:`Fechamento de demandas — ${dataPt(dia)}`,html});
      const {error:erroRegistro}=await db.from("demandas_email_envios").update({situacao:"enviado",enviado_em:new Date().toISOString(),erro:null})
        .eq("tenant_id",tenantId).eq("dia",dia);
      if(erroRegistro)throw new Error("Mensagem enviada, mas não foi possível confirmar no histórico de envio.");
      return {sucesso:true};
    }catch(error){
      const msg=error instanceof Error?error.message:"Falha no SMTP";
      await db.from("demandas_email_envios").update({situacao:"erro",erro:msg.slice(0,500)}).eq("tenant_id",tenantId).eq("dia",dia);
      return {sucesso:false,erro:msg};
    }
  }catch(error){
    return {sucesso:false,erro:error instanceof Error?error.message:"Falha ao gerar o relatório"};
  }
}
