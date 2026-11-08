"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { avisar } from "@/lib/aviso";
import { exigirUsuario, GESTORES } from "@/lib/usuario-atual";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET="financeiro-pdfs";
const LIMITE=3*1024*1024; // formulário dentro do limite das Server Actions do Vitral
const diaValido=(v:unknown)=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v));
const inteiro=(v:unknown)=>typeof v==="number"&&Number.isSafeInteger(v);
type Linha = {data:string;descricao?:string;estabelecimento?:string;valorCentavos:number;parcelaAtual?:number;parcelaTotal?:number;finalCartao?:string};
function lerPrevia(fd:FormData,tipo:"extrato"|"fatura") {
  const bruto=String(fd.get("dados")||"");
  if(bruto.length>180000)throw new Error("Prévia muito grande. Importe um período menor.");
  let parsed:unknown;
  try {parsed=JSON.parse(bruto);} catch {throw new Error("A prévia não é válida.");}
  if(!parsed||typeof parsed!=="object")throw new Error("Prévia inválida.");
  const dados=parsed as Record<string,unknown>;
  const linhas=dados.linhas;
  if(!Array.isArray(linhas)||!linhas.length||linhas.length>1600)throw new Error("Quantidade de lançamentos inválida.");
  const revisadas:Linha[]=linhas.map((l:unknown,i:number)=>{
    if(!l||typeof l!=="object")throw new Error("Linha "+(i+1)+" inválida.");
    const x=l as Record<string,unknown>;
    const descricao=String(tipo==="extrato"?x.descricao:x.estabelecimento || "").trim().slice(0,290);
    if(!diaValido(x.data)||!inteiro(x.valorCentavos)||x.valorCentavos===0||!descricao)
      throw new Error("Confira data, valor e descrição da linha "+(i+1)+".");
    if(tipo==="fatura"){
      if(x.valorCentavos<=0)throw new Error("Fatura com valor de compra inválido.");
      const atual=Number(x.parcelaAtual||1),total=Number(x.parcelaTotal||1);
      if(!Number.isInteger(atual)||!Number.isInteger(total)||atual<1||total>60||atual>total)throw new Error("Parcela inválida na linha "+(i+1)+".");
      return {data:x.data as string,estabelecimento:descricao,valorCentavos:x.valorCentavos as number,
        parcelaAtual:atual,parcelaTotal:total,finalCartao:String(x.finalCartao||"").slice(-4)};
    }
    return {data:x.data as string,descricao,valorCentavos:x.valorCentavos as number};
  });
  const soma=revisadas.reduce((n,x)=>n+x.valorCentavos,0);
  if(!Number.isSafeInteger(soma))throw new Error("Soma fora do limite.");
  const total=Number(dados.totalCentavos);
  if(tipo==="fatura"){
    if(!inteiro(dados.totalCentavos)||total<=0||soma!==total)
      throw new Error("A soma das compras deve ser igual ao total da fatura.");
    if(!diaValido(dados.vencimento))throw new Error("Vencimento da fatura não identificado.");
  }
  if(tipo==="extrato"&&dados.divergencias!==0)throw new Error("Extrato com divergência de saldos. Confira o documento.");
  return {linhas:revisadas,soma,total:tipo==="fatura"?total:soma,vencimento:tipo==="fatura"?dados.vencimento as string:null};
}

export async function salvarDocumentoPDF(fd:FormData){
  const sessao=await exigirUsuario(GESTORES);
  if(!sessao)return;
  try {
    const tipo=String(fd.get("tipo")||"");
    if(tipo!=="extrato"&&tipo!=="fatura")throw new Error("Tipo de documento inválido.");
    const arquivo=fd.get("arquivo");
    if(!(arquivo instanceof File)||!arquivo.size||arquivo.size>LIMITE||(!/\.pdf$/i.test(arquivo.name)&&arquivo.type!=="application/pdf"))
      throw new Error("Envie um arquivo PDF de até 3 MB.");
    const bytes=Buffer.from(await arquivo.arrayBuffer());
    if(bytes.subarray(0,5).toString("ascii")!=="%PDF-")throw new Error("O arquivo não parece ser PDF.");
    const revisao=lerPrevia(fd,tipo);
    const supabase=await createClient();
    const referencia=String(fd.get("referencia")||"");
    const tabela=tipo==="extrato"?"financeiro_contas_bancarias":"financeiro_cartoes";
    const {data:alvo}=await supabase.from(tabela).select("id").eq("id",referencia).eq("tenant_id",sessao.tenantId).maybeSingle();
    if(!alvo)throw new Error("Conta ou cartão não encontrado para sua empresa.");
    const sha=createHash("sha256").update(bytes).digest("hex");
    const admin=createAdminClient() as unknown as SupabaseClient;
    const {data:existe}=await admin.from("financeiro_documentos_pdf").select("id").eq("tenant_id",sessao.tenantId)
      .eq("tipo",tipo).eq("arquivo_sha256",sha).maybeSingle();
    if(existe)throw new Error("Este PDF já foi anexado anteriormente.");
    const caminho=sessao.tenantId+"/"+tipo+"/"+randomUUID()+".pdf";
    const {error:uploadErro}=await admin.storage.from(BUCKET).upload(caminho,bytes,{
      contentType:"application/pdf",cacheControl:"private",upsert:false
    });
    if(uploadErro)throw new Error("Não foi possível guardar o PDF no armazenamento privado.");
    const insert={
      tenant_id:sessao.tenantId,tipo,
      arquivo_nome:arquivo.name.slice(0,240),
      arquivo_caminho:caminho,arquivo_sha256:sha,arquivo_tamanho:arquivo.size,
      conta_bancaria_id:tipo==="extrato"?referencia:null,
      cartao_id:tipo==="fatura"?referencia:null,
      quantidade_linhas:revisao.linhas.length,
      valor_total_centavos:revisao.total,
      dados_extraidos:{tipo,linhas:revisao.linhas,vencimento:revisao.vencimento,observacao:"Prévia enviada para revisão; sem baixa ou lançamento automático"},
      status:"em_revisao",criado_por:sessao.userId
    };
    const {error}=await admin.from("financeiro_documentos_pdf").insert(insert);
    if(error){
      await admin.storage.from(BUCKET).remove([caminho]);
      throw new Error(error.code==="23505"?"Este documento já foi anexado.":"Não foi possível registrar o documento.");
    }
    revalidatePath("/financeiro/documentos-pdf");
    await avisar("sucesso",revisao.linhas.length+" linhas salvas para conferência. Nenhum pagamento foi lançado.");
  }catch(e){
    await avisar("erro",e instanceof Error?e.message:"Falha ao salvar o PDF.");
  }
}

export async function linkDocumentoPDF(fd:FormData) {
  const sessao=await exigirUsuario(GESTORES);
  if(!sessao)return;
  const id=String(fd.get("id")||"");
  const supabase=await createClient() as unknown as SupabaseClient;
  const {data:doc}=await supabase.from("financeiro_documentos_pdf").select("arquivo_caminho")
    .eq("id",id).eq("tenant_id",sessao.tenantId).maybeSingle();
  if(!doc)return;
  const admin=createAdminClient();
  const {data}=await admin.storage.from(BUCKET).createSignedUrl(doc.arquivo_caminho,90,{download:true});
  if(!data?.signedUrl)return;
  const {redirect}=await import("next/navigation");
  redirect(data.signedUrl);
}
