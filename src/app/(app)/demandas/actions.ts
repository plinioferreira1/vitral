"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { notificarPush } from "@/lib/demandas/push";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/usuario-atual";
import { avisar } from "@/lib/aviso";
import { validarLote } from "@/lib/demandas/validacao";
import { enviarEmailsNovasDemandas } from "@/lib/demandas/email-atribuicao";
import { gerarDemandasRecorrentes } from "@/lib/demandas/recorrencias";

const uuidValido = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const STATUS_DEMANDA = ["pendente", "em_andamento", "aguardando", "bloqueada", "concluida"] as const;

export async function criarDemanda(formData: FormData) {
  const sessao = await exigirUsuario(["diretor","gerente"]);
  if (!sessao) return;
  const titulo = String(formData.get("titulo") ?? "").trim().replace(/\s+/g, " ");
  const descricao = String(formData.get("descricao") ?? "").trim();
  const responsavelId = String(formData.get("responsavel_id") ?? "");
  const prazo = String(formData.get("prazo") ?? "").trim();
  const prioridade = String(formData.get("prioridade") ?? "normal");
  const processoId = String(formData.get("processo_id") ?? "").trim();
  if (titulo.length < 4 || titulo.length > 180 || descricao.length > 5000 ||
    !uuidValido(responsavelId) || (processoId && !uuidValido(processoId)) ||
    !["baixa","normal","alta","urgente"].includes(prioridade) ||
    (prazo && !/^\d{4}-\d{2}-\d{2}$/.test(prazo))) {
    await avisar("erro", "Confira título, responsável, prioridade e data da demanda.");
    return;
  }
  const supabase = await createClient();
  // Validar tenant e atividade do destinatário, mesmo que o cliente envie IDs adulterados.
  const { data: colaborador } = await supabase.from("usuarios")
    .select("id").eq("id", responsavelId).eq("tenant_id", sessao.tenantId).eq("ativo",true).maybeSingle();
  if (!colaborador) { await avisar("erro", "Escolha um colaborador ativo da sua equipe."); return; }
  if (processoId) {
    const { data: processo } = await supabase.from("processos")
      .select("id").eq("id",processoId).eq("tenant_id",sessao.tenantId).maybeSingle();
    if (!processo) { await avisar("erro", "Processo selecionado não pertence à sua empresa."); return; }
  }
  const { data, error } = await supabase.from("demandas").insert({
    tenant_id:sessao.tenantId, solicitante_id:sessao.userId,
    responsavel_id:responsavelId, titulo, descricao:descricao||null,
    prioridade, prazo:prazo||null, processo_id:processoId||null,
  }).select("id").single();
  if (error || !data) {
    await avisar("erro", "Não foi possível cadastrar a demanda. " + (error?.message ?? ""));
    return;
  }
  after(()=>notificarPush(sessao.tenantId,responsavelId,data.id));
  after(()=>enviarEmailsNovasDemandas([data.id]).then(()=>{}).catch(e=>console.error("Fila de e-mail de demanda",e)));
  revalidatePath("/demandas");
  revalidatePath("/demandas/" + data.id);
  await avisar("sucesso","Demanda distribuída e notificação interna criada.");
}


/** Distribuição em lote sempre revisada pelo gestor. Reenvio com o mesmo ID não duplica tarefas. */
export async function criarDemandasEmLote(formData: FormData) {
  const sessao = await exigirUsuario(["diretor","gerente"]);
  if (!sessao) return;
  const loteId = String(formData.get("lote_id") ?? "");
  const raw = String(formData.get("tarefas_json") ?? "");
  if (!uuidValido(loteId) || raw.length > 60000) {
    await avisar("erro","Lote inválido. Revise as tarefas e tente novamente."); return;
  }
  let propostas: unknown;
  try { propostas=JSON.parse(raw); } catch { await avisar("erro","Não foi possível interpretar as tarefas."); return; }
  if (!Array.isArray(propostas) || propostas.length<1 || propostas.length>10) {
    await avisar("erro","Revise de 1 a 10 demandas antes de distribuir."); return;
  }
  type Proposta = {titulo:string;descricao:string|null;responsavel_id:string;prazo:string|null;prioridade:string};
  const tarefas:Proposta[]=[];
  for (const proposta of propostas) {
    if (!proposta || typeof proposta!=="object" || Array.isArray(proposta)) {
      await avisar("erro","Dados da tarefa inválidos.");return;
    }
    const v=proposta as Record<string,unknown>;
    const titulo=typeof v.titulo==="string"?v.titulo.trim():"";
    const descricao=typeof v.descricao==="string"?v.descricao.trim():"";
    const responsavel=typeof v.responsavel_id==="string"?v.responsavel_id:"";
    const prazo=typeof v.prazo==="string"?v.prazo:"";
    const prioridade=typeof v.prioridade==="string"?v.prioridade:"normal";
    const erros = validarLote([{titulo,descricao:descricao||null,responsavel_id:responsavel,prazo:prazo||null,prioridade}]);
    if(erros.length){
      await avisar("erro", `Demanda ${tarefas.length+1}: ${erros[0].campos.join("; ")}.`);
      return;
    }
    tarefas.push({titulo,descricao:descricao||null,responsavel_id:responsavel,prazo:prazo||null,prioridade});
  }
  const supabase=await createClient();
  const ids=[...new Set(tarefas.map(t=>t.responsavel_id))];
  const {data:ativos,error:erroAtivos}=await supabase.from("usuarios").select("id")
    .eq("tenant_id",sessao.tenantId).eq("ativo",true).in("id",ids);
  if (erroAtivos || (ativos??[]).length!==ids.length) {
    await avisar("erro","Um ou mais destinatários não fazem parte da equipe ativa.");return;
  }
  const payload=tarefas.map((t,i)=>({
    tenant_id:sessao.tenantId,solicitante_id:sessao.userId,...t,
    lote_id:loteId,lote_item:i+1,
  }));
  const {data:criadas,error}=await supabase.from("demandas").insert(payload).select("id,responsavel_id");
  if (error) {
    if (error.code==="23505") {
      const {count}=await supabase.from("demandas").select("id",{count:"exact",head:true})
        .eq("tenant_id",sessao.tenantId).eq("lote_id",loteId);
      if (count===tarefas.length) {
        await avisar("sucesso","Esse lote já tinha sido distribuído; nenhuma tarefa foi duplicada.");
        return;
      }
    }
    await avisar("erro","Não foi possível distribuir o lote; nenhuma tarefa foi confirmada. "+error.message);
    return;
  }
  if(criadas?.length)after(()=>enviarEmailsNovasDemandas(criadas.map(t=>t.id)).then(()=>{}).catch(e=>console.error("Fila de e-mails de demanda",e)));
  for(const tarefa of criadas??[]){
    after(()=>notificarPush(sessao.tenantId,tarefa.responsavel_id,tarefa.id));
  }
  revalidatePath("/demandas");
  await avisar("sucesso",`${tarefas.length} ${tarefas.length===1?"demanda distribuída":"demandas distribuídas"} e avisos criados.`);
}


export async function criarRecorrenciaDemanda(formData:FormData){
 const sessao=await exigirUsuario(["diretor","gerente"]);
 if(!sessao)return;
 const titulo=String(formData.get("titulo")??"").trim();
 const descricao=String(formData.get("descricao")??"").trim();
 const responsavelId=String(formData.get("responsavel_id")??"");
 const periodicidade=String(formData.get("periodicidade")??"");
 const prioridade=String(formData.get("prioridade")??"normal");
 const data=String(formData.get("proxima_data")??"");
 if(titulo.length<4||titulo.length>180||descricao.length>5000||
   !uuidValido(responsavelId)||!["diaria","semanal","mensal"].includes(periodicidade)||
   !["baixa","normal","alta","urgente"].includes(prioridade)||
   !/^\d{4}-\d{2}-\d{2}$/.test(data)){
   await avisar("erro","Confira título, colaborador, periodicidade e data inicial.");return;
 }
 const db=await createClient();
 const {data:colaborador}=await db.from("usuarios").select("id")
   .eq("id",responsavelId).eq("tenant_id",sessao.tenantId).eq("ativo",true).maybeSingle();
 if(!colaborador){await avisar("erro","O responsável precisa estar ativo na empresa.");return;}
 const {error}=await db.from("demandas_recorrencias").insert({
   tenant_id:sessao.tenantId,solicitante_id:sessao.userId,responsavel_id:responsavelId,
   titulo,descricao:descricao||null,prioridade,periodicidade,proxima_data:data,
 });
 if(error){await avisar("erro","Não foi possível criar a rotina: "+error.message);return;}
 after(async()=>{
   try{await gerarDemandasRecorrentes();await enviarEmailsNovasDemandas();}
   catch(e){console.error("Falha ao processar demanda recorrente",e);}
 });
 revalidatePath("/demandas");
 await avisar("sucesso","Rotina criada. O VITRAL distribuirá as demandas conforme a periodicidade.");
}
export async function alternarRecorrenciaDemanda(formData:FormData){
 const sessao=await exigirUsuario(["diretor","gerente"]);
 if(!sessao)return;
 const id=String(formData.get("recorrencia_id")??"");
 const ativa=String(formData.get("ativa")??"")==="true";
 if(!uuidValido(id))return;
 const db=await createClient();
 const {data,error}=await db.from("demandas_recorrencias")
  .update({ativa,atualizada_em:new Date().toISOString()})
  .eq("id",id).eq("tenant_id",sessao.tenantId).select("id").maybeSingle();
 if(error||!data){await avisar("erro","Não foi possível alterar a recorrência.");return;}
 revalidatePath("/demandas");
 await avisar("sucesso",ativa?"Rotina reativada.":"Rotina pausada.");
}

export async function atualizarStatusDemanda(formData: FormData) {
  const sessao = await exigirUsuario();
  if (!sessao) return;
  const id = String(formData.get("demanda_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!uuidValido(id) || !STATUS_DEMANDA.includes(status as typeof STATUS_DEMANDA[number])) {
    await avisar("erro","Situação inválida."); return;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("demandas")
    .update({status}).eq("id",id).eq("tenant_id",sessao.tenantId).select("id,solicitante_id").maybeSingle();
  if (error || !data) { await avisar("erro","Não foi possível atualizar. Confira suas permissões."); return; }
  if(data.solicitante_id!==sessao.userId)after(()=>notificarPush(sessao.tenantId,data.solicitante_id,id,"Demanda atualizada"));
  revalidatePath("/demandas");
  revalidatePath("/demandas/" + id);
  await avisar("sucesso","Andamento atualizado e registrado no histórico.");
}

export async function comentarDemanda(formData: FormData) {
  const sessao = await exigirUsuario();
  if (!sessao) return;
  const id = String(formData.get("demanda_id") ?? "");
  const comentario = String(formData.get("comentario") ?? "").trim();
  if (!uuidValido(id) || comentario.length < 1 || comentario.length > 2000) {
    await avisar("erro","Escreva uma atualização de até 2.000 caracteres."); return;
  }
  const supabase = await createClient();
  const { data: demanda } = await supabase.from("demandas")
    .select("id,solicitante_id,responsavel_id").eq("id",id).eq("tenant_id",sessao.tenantId).maybeSingle();
  if (!demanda) { await avisar("erro","Demanda não encontrada ou sem permissão."); return; }
  const { error } = await supabase.from("demandas_atualizacoes").insert({
    tenant_id:sessao.tenantId, demanda_id:id, autor_id:sessao.userId,
    tipo:"comentario", comentario,
  });
  if (error) { await avisar("erro","Não foi possível enviar sua atualização."); return; }
  const destino=demanda.solicitante_id===sessao.userId?demanda.responsavel_id:demanda.solicitante_id;
  if(destino!==sessao.userId)after(()=>notificarPush(sessao.tenantId,destino,id,"Nova atualização"));
  revalidatePath("/demandas");
  revalidatePath("/demandas/" + id);
  await avisar("sucesso","Comentário registrado. O gestor ou responsável será notificado.");
}

export async function marcarNotificacaoDemandaLida(formData: FormData) {
  const sessao = await exigirUsuario();
  if (!sessao) return;
  const id = String(formData.get("notificacao_id") ?? "");
  if (!uuidValido(id)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("demandas_notificacoes")
    .update({lida_em:new Date().toISOString()})
    .eq("id",id).eq("tenant_id",sessao.tenantId).eq("destinatario_id",sessao.userId);
  if (error) { await avisar("erro","Não foi possível marcar o aviso como lido."); return; }
  revalidatePath("/demandas");
}
