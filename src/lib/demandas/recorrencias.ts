import { createAdminClient } from "@/lib/supabase/admin";

const hojeBrasilia=()=>{
 const partes=new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const n=(t:string)=>Number(partes.find(p=>p.type===t)?.value??0);
 return new Date(Date.UTC(n("year"),n("month")-1,n("day"))).toISOString().slice(0,10);
};
export function proximoVencimento(data:string,periodicidade:string):string{
 const [ano,mes,dia]=data.split("-").map(Number);
 if(!ano||!mes||!dia)throw new Error("Data inválida");
 const p=periodicidade==="diaria"?1:periodicidade==="semanal"?7:0;
 if(p)return new Date(Date.UTC(ano,mes-1,dia+p)).toISOString().slice(0,10);
 if(periodicidade!=="mensal")throw new Error("Periodicidade inválida");
 const ultimoDia=new Date(Date.UTC(ano,mes+1,0)).getUTCDate();
 return new Date(Date.UTC(ano,mes,Math.min(dia,ultimoDia))).toISOString().slice(0,10);
}
/** Rodar por agendamento. Repetições sobrevivem a retries sem duplicar tarefas. */
export async function gerarDemandasRecorrentes():Promise<{geradas:number;falhas:number}>{
 const db=createAdminClient();
 const hoje=hojeBrasilia();
 const {data:rotinas,error}=await db.from("demandas_recorrencias")
  .select("id,tenant_id,solicitante_id,responsavel_id,titulo,descricao,prioridade,periodicidade,proxima_data")
  .eq("ativa",true).lte("proxima_data",hoje).order("proxima_data",{ascending:true}).limit(100);
 if(error)throw new Error("Falha ao consultar demandas recorrentes");
 let geradas=0,falhas=0;
 for(const rotina of rotinas??[]){
  try{
   let data=rotina.proxima_data;
   // No máximo 14 ocorrências por execução por rotina; não criar backlog ilimitado.
   for(let i=0;i<14&&data<=hoje;i++){
    const {error:insertError}=await db.from("demandas").insert({
      tenant_id:rotina.tenant_id,solicitante_id:rotina.solicitante_id,
      responsavel_id:rotina.responsavel_id,titulo:rotina.titulo,descricao:rotina.descricao,
      prioridade:rotina.prioridade,prazo:data,recorrencia_id:rotina.id,recorrencia_data:data,
    });
    if(insertError&&insertError.code!=="23505")throw new Error("Não foi possível gerar recorrência");
    if(!insertError)geradas++;
    data=proximoVencimento(data,rotina.periodicidade);
   }
   const {error:erroUpdate}=await db.from("demandas_recorrencias").update({proxima_data:data,atualizada_em:new Date().toISOString()})
    .eq("id",rotina.id).eq("tenant_id",rotina.tenant_id).eq("proxima_data",rotina.proxima_data);
   if(erroUpdate)throw new Error("Não foi possível avançar a próxima execução");
  }catch(e){falhas++;console.error("Falha de recorrência",rotina.id,e instanceof Error?e.message:"erro");}
 }
 return {geradas,falhas};
}
