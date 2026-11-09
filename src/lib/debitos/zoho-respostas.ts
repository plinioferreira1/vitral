/**
 * Consulta read-only ao Zoho Mail da locação.
 * Requer OAuth explícito da conta locacao@sacraimoveis.com.br.
 * Nenhuma credencial SMTP/Zoho de envio é reutilizada para leitura.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type EmailZoho = {
  messageId: string; folderId: string; fromAddress: string;
  subject: string; summary: string; receivedTime: string;
  hasAttachment?: string | number | boolean;
};
type Solicitacao = {
  id:string; tenant_id:string; administradora_id:string|null;
  destinatario:string; codigo_resposta:string|null; enviado_em:string;
};
const EMAIL_LOCACAO = "locacao@sacraimoveis.com.br";
const DATACENTERS: Record<string,{accounts:string;mail:string}> = {
  com:{accounts:"https://accounts.zoho.com",mail:"https://mail.zoho.com"},
  eu:{accounts:"https://accounts.zoho.eu",mail:"https://mail.zoho.eu"},
  in:{accounts:"https://accounts.zoho.in",mail:"https://mail.zoho.in"},
  com_au:{accounts:"https://accounts.zoho.com.au",mail:"https://mail.zoho.com.au"},
};
export function zohoLocacaoConfigurado():boolean {
  return Boolean(process.env.ZOHO_LOCACAO_CLIENT_ID &&
    process.env.ZOHO_LOCACAO_CLIENT_SECRET && process.env.ZOHO_LOCACAO_REFRESH_TOKEN &&
    process.env.ZOHO_LOCACAO_ACCOUNT_ID);
}
function enderecoEmail(v:string):string {
  const partes=v.toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/);
  return partes?.[0]||"";
}
function textoLimpo(v:unknown,max=500):string {
  return String(v??"").replace(/<[^>]*>/g," ").replace(/&(?:nbsp|amp|quot|lt|gt);/gi," ")
    .replace(/[\x00-\x1F\x7F]/g," ").replace(/\s+/g," ").trim().slice(0,max);
}
async function jsonZoho<T>(url:string,token:string):Promise<T> {
  const res=await fetch(url,{
    headers:{Authorization:"Zoho-oauthtoken "+token,Accept:"application/json"},
    cache:"no-store",signal:AbortSignal.timeout(12000),
  });
  if(!res.ok)throw new Error("Zoho Mail retornou erro HTTP "+res.status);
  const obj=await res.json() as {status?:{code?:number};data?:T};
  if(obj.status?.code && obj.status.code!==200)throw new Error("Zoho Mail: retorno "+obj.status.code);
  if(!obj.data)throw new Error("Zoho Mail não retornou dados válidos.");
  return obj.data;
}
async function buscarMensagens():Promise<EmailZoho[]> {
  if(!zohoLocacaoConfigurado())return [];
  const dc=DATACENTERS[process.env.ZOHO_LOCACAO_DC||"com"]??DATACENTERS.com;
  const cred=new URLSearchParams({
    refresh_token:process.env.ZOHO_LOCACAO_REFRESH_TOKEN!,
    client_id:process.env.ZOHO_LOCACAO_CLIENT_ID!,
    client_secret:process.env.ZOHO_LOCACAO_CLIENT_SECRET!,
    grant_type:"refresh_token",
  });
  const tokenRes=await fetch(dc.accounts+"/oauth/v2/token",{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:cred,cache:"no-store",signal:AbortSignal.timeout(12000)
  });
  if(!tokenRes.ok)throw new Error("Falha na autorização do Zoho Mail ("+tokenRes.status+").");
  const tokenObj=await tokenRes.json() as {access_token?:string;error?:string};
  if(!tokenObj.access_token)throw new Error("Zoho Mail precisa de uma nova autorização OAuth.");
  const base=dc.mail+"/api/accounts/"+encodeURIComponent(process.env.ZOHO_LOCACAO_ACCOUNT_ID!);
  let pastaId=process.env.ZOHO_LOCACAO_FOLDER_ID;
  if(!pastaId){
    const pastas=await jsonZoho<{folderId:string;folderType:string;folderName:string}[]>(base+"/folders",tokenObj.access_token);
    pastaId=pastas.find(p=>p.folderType?.toLowerCase()==="inbox"||p.folderName?.toLowerCase()==="inbox")?.folderId;
  }
  if(!pastaId)throw new Error("A caixa de entrada do Zoho Mail não foi encontrada.");
  const url=base+"/messages/view?folderId="+encodeURIComponent(pastaId)+"&limit=100&start=1&status=all";
  return await jsonZoho<EmailZoho[]>(url,tokenObj.access_token);
}
export async function sincronizarRespostasZoho(db:SupabaseClient):Promise<{status:string;novas:number;analisadas:number}> {
  if(!zohoLocacaoConfigurado())return {status:"aguardando_autorizacao",novas:0,analisadas:0};
  const mensagens=await buscarMensagens();
  const corte=Date.now()-60*24*3600000;
  const {data,error}=await db.from("debitos_solicitacoes")
    .select("id,tenant_id,administradora_id,destinatario,codigo_resposta,enviado_em")
    .gte("enviado_em",new Date(corte).toISOString()).neq("status","falha").limit(1000);
  if(error)throw new Error("Não foi possível consultar as solicitações da locação.");
  const solicitacoes=(data??[]) as Solicitacao[];
  const codigos=new Map(solicitacoes.filter(s=>s.codigo_resposta).map(s=>[s.codigo_resposta!.toLowerCase(),s]));
  const {data:adms,error:erroAdms}=await db.from("condominio_administradoras")
    .select("id,tenant_id,email_solicitacao").limit(1000);
  if(erroAdms)throw new Error("Não foi possível carregar os contatos das administradoras.");
  const contatos=new Map<string,{tenant_id:string;id:string}[]>();
  for(const a of adms??[]){
    const email=enderecoEmail(a.email_solicitacao||"");
    if(!email)continue;
    contatos.set(email,[...(contatos.get(email)||[]),{tenant_id:a.tenant_id,id:a.id}]);
  }
  let novas=0,analisadas=0;
  for(const m of mensagens){
    const ts=Number(m.receivedTime);
    if(!Number.isFinite(ts)||ts<corte||ts>Date.now()+3600000)continue;
    const remetente=enderecoEmail(m.fromAddress);
    if(!remetente||remetente===EMAIL_LOCACAO)continue;
    const assunto=textoLimpo(m.subject,400);
    const token=assunto.match(/\[VITRAL:([a-f0-9]{16})\]/i)?.[1]?.toLowerCase();
    const porCodigo=token?codigos.get(token):undefined;
    // A etiqueta tem prioridade, mas o remetente deve corresponder ao destinatário da solicitação
    // ou a um e-mail cadastrado na mesma administradora.
    const candidatos=solicitacoes.filter(s=>enderecoEmail(s.destinatario)===remetente &&
      ts>=new Date(s.enviado_em).getTime()-3600000);
    let solicitacao=porCodigo&&candidatos.some(c=>c.id===porCodigo.id)?porCodigo:undefined;
    if(!solicitacao && !token && candidatos.length===1)solicitacao=candidatos[0];
    const administradoras=contatos.get(remetente)||[];
    const porAdm=solicitacao?.administradora_id?administradoras.find(a=>a.id===solicitacao!.administradora_id):undefined;
    const adm=porAdm||(administradoras.length===1?administradoras[0]:undefined);
    const tenantId=solicitacao?.tenant_id||adm?.tenant_id;
    if(!tenantId)continue; // Não copiar mensagens pessoais ou não relacionadas à locação.
    analisadas++;
    const registro={
      tenant_id:tenantId,mensagem_id:String(m.messageId),
      solicitacao_id:solicitacao?.id??null,
      administradora_id:solicitacao?.administradora_id??adm?.id??null,
      remetente,assunto,resumo:textoLimpo(m.summary),
      recebido_em:new Date(ts).toISOString(),
      tem_anexo:String(m.hasAttachment)==="1"||m.hasAttachment===true,
    };
    const {data:gravado,error:erro}=await db.from("debitos_respostas_email")
      .upsert(registro,{onConflict:"tenant_id,mensagem_id",ignoreDuplicates:true})
      .select("id");
    if(erro)throw new Error("Falha ao registrar a resposta de uma administradora.");
    novas+=gravado?.length??0;
  }
  return {status:"sincronizado",novas,analisadas};
}
