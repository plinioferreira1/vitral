"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigirUsuario, GESTORES } from "@/lib/usuario-atual";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET="financeiro-pdfs";
const MAXIMO=4*1024*1024;
type Resultado={ok:boolean; mensagem:string; destino?:string};
type Movimento={data:string;descricao:string;valorCentavos:number};
type Compra={data:string;estabelecimento:string;valorCentavos:number;parcelaAtual:number;parcelaTotal:number;finalCartao:string};

function validoISO(v:string) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
  const d=new Date(v+"T12:00:00Z");
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;
}
const normalizar=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
const falha=(mensagem:string):Resultado=>({ok:false,mensagem});
function assinatura(data:string,valor:number,descricao:string) {
  return [data,valor,normalizar(descricao)].join("|");
}

export async function importarDocumentoFinanceiroPDF(fd:FormData):Promise<Resultado> {
  const sessao=await exigirUsuario(GESTORES);
  if(!sessao)return falha("Sua sessão expirou ou você não tem autorização.");
  const supabase=await createClient();
  const admin=createAdminClient() as unknown as SupabaseClient;
  const tipo=String(fd.get("tipo")||"");
  const idAlvo=String(fd.get("alvo")||"");
  const arquivo=fd.get("arquivo");
  if(tipo!=="extrato"&&tipo!=="fatura")return falha("Tipo de arquivo inválido.");
  if(!(arquivo instanceof File)||!arquivo.size||arquivo.size>MAXIMO)return falha("Envie um PDF de até 4 MB.");
  if(!/\.pdf$/i.test(arquivo.name)&&arquivo.type!=="application/pdf")return falha("Envie somente PDFs.");
  const assinaturaArquivo=new TextDecoder().decode(await arquivo.slice(0,5).arrayBuffer());
  if(assinaturaArquivo!=="%PDF-")return falha("O arquivo selecionado não é um PDF válido.");
  if(!/^[0-9a-f-]{36}$/i.test(idAlvo))return falha("Selecione a conta ou o cartão correto.");

  let dados:Record<string,unknown>;
  try{dados=JSON.parse(String(fd.get("dados")||"")) as Record<string,unknown>;}catch{return falha("Não foi possível ler os dados revisados.");}
  if(!dados||typeof dados!=="object")return falha("Prévia vazia.");
  const linhas=dados.linhas;
  if(!Array.isArray(linhas)||!linhas.length||linhas.length>1000)return falha("A prévia deve ter de 1 a 1.000 linhas.");

  const {data:alvo}=tipo==="extrato"
    ? await supabase.from("financeiro_contas_bancarias").select("id").eq("id",idAlvo).eq("tenant_id",sessao.tenantId).eq("ativa",true).maybeSingle()
    : await supabase.from("financeiro_cartoes").select("id").eq("id",idAlvo).eq("tenant_id",sessao.tenantId).eq("ativo",true).maybeSingle();
  if(!alvo)return falha("Conta ou cartão não pertence à empresa ou está desativado.");

  const movimentos:Movimento[]=[];
  const compras:Compra[]=[];
  let competencia="",vencimento="",valorFatura=0;
  if(tipo==="extrato"){
    if(Number(dados.divergencias)!==0)return falha("O PDF possui divergências de saldo e não pode ser importado.");
    for(const raw of linhas) {
      const x=raw as Record<string,unknown>;
      const data=String(x?.data||""),descricao=String(x?.descricao||"").trim();
      const valor=Number(x?.valorCentavos);
      if(!validoISO(data)||!descricao||descricao.length>300||!Number.isSafeInteger(valor)||valor===0||Math.abs(valor)>100000000000)
        return falha("Uma movimentação apresenta data, descrição ou valor inválido.");
      movimentos.push({data,descricao,valorCentavos:valor});
    }
    const soma=movimentos.reduce((a,x)=>a+x.valorCentavos,0);
    if(!Number.isSafeInteger(Number(dados.somaOriginal))||Number(dados.somaOriginal)!==soma||Number(dados.quantidadeOriginal)!==movimentos.length)
      return falha("A soma ou a quantidade de movimentos foi alterada. Revise antes de importar.");
  }else{
    competencia=String(dados.competencia||"");
    vencimento=String(dados.vencimento||"");
    valorFatura=Number(dados.totalCentavos);
    if(!/^\d{4}-\d{2}$/.test(competencia)||!validoISO(vencimento)||!Number.isSafeInteger(valorFatura)||valorFatura<=0)
      return falha("Competência, vencimento ou total da fatura inválido.");
    for(const raw of linhas) {
      const x=raw as Record<string,unknown>;
      const data=String(x?.data||""),estabelecimento=String(x?.estabelecimento||"").trim();
      const valor=Number(x?.valorCentavos),a=Number(x?.parcelaAtual),n=Number(x?.parcelaTotal);
      const final=String(x?.finalCartao||"").replace(/\D/g,"");
      if(!validoISO(data)||!estabelecimento||estabelecimento.length>300||!Number.isSafeInteger(valor)||valor<=0||
         !Number.isSafeInteger(a)||!Number.isSafeInteger(n)||a<1||n<1||a>n||n>120||!/^\d{4}$/.test(final))
        return falha("Uma compra apresenta valor, data, cartão ou parcela inválidos.");
      compras.push({data,estabelecimento,valorCentavos:valor,parcelaAtual:a,parcelaTotal:n,finalCartao:final});
    }
    if(compras.reduce((a,x)=>a+x.valorCentavos,0)!==valorFatura||
       Number(dados.quantidadeOriginal)!==compras.length)
      return falha("O total ou a quantidade de compras não bate com a fatura.");
    const {data:existente}=await supabase.from("financeiro_faturas").select("id")
      .eq("tenant_id",sessao.tenantId).eq("cartao_id",idAlvo).eq("competencia",competencia+"-01").maybeSingle();
    if(existente)return falha("Já existe uma fatura deste cartão para a competência informada. Confira antes de importar novamente.");
  }

  const bytes=new Uint8Array(await arquivo.arrayBuffer());
  const hash=createHash("sha256").update(bytes).digest("hex");
  const {data:duplicado}=await admin.from("financeiro_documentos_pdf").select("id")
    .eq("tenant_id",sessao.tenantId).eq("tipo",tipo).eq("arquivo_sha256",hash).maybeSingle();
  if(duplicado)return falha("Este PDF já foi anexado anteriormente. A importação foi bloqueada para evitar duplicidade.");

  const documentoId=randomUUID();
  const caminho=sessao.tenantId+"/"+documentoId+".pdf";
  const {error:erroArquivo}=await admin.storage.from(BUCKET).upload(caminho,bytes,
    {contentType:"application/pdf",cacheControl:"private, max-age=0",upsert:false});
  if(erroArquivo)return falha("Não foi possível guardar o PDF no armazenamento privado.");

  const {error:erroDocumento}=await admin.from("financeiro_documentos_pdf").insert({
    id:documentoId,tenant_id:sessao.tenantId,tipo,arquivo_nome:arquivo.name.slice(0,240),
    arquivo_caminho:caminho,arquivo_sha256:hash,arquivo_tamanho:arquivo.size,
    conta_bancaria_id:tipo==="extrato"?idAlvo:null,cartao_id:tipo==="fatura"?idAlvo:null,
    status:"em_revisao",quantidade_linhas:linhas.length,criado_por:sessao.userId,
    valor_total_centavos:tipo==="fatura"?valorFatura:movimentos.reduce((n,m)=>n+m.valorCentavos,0),
    dados_extraidos:{tipo,linhas:tipo==="fatura"?compras:movimentos,
      competencia:tipo==="fatura"?competencia:null,vencimento:tipo==="fatura"?vencimento:null,
      conferido:true},
  });
  if(erroDocumento){
    await admin.storage.from(BUCKET).remove([caminho]);
    return falha(erroDocumento.code==="23505"?"Este PDF já foi anexado anteriormente.":"Falha ao registrar o documento.");
  }

  try {
    if(tipo==="extrato"){
      // Mesmo dia, valor e descrição: só considera nova a quantidade excedente.
      const datas=movimentos.map(m=>m.data).sort();
      const {data:existentes,error:erroBusca}=await supabase.from("financeiro_extrato_linhas")
        .select("data,valor,descricao").eq("tenant_id",sessao.tenantId)
        .eq("conta_bancaria_id",idAlvo).gte("data",datas[0]).lte("data",datas[datas.length-1]).limit(5000);
      if(erroBusca)throw new Error("Não foi possível conferir duplicidades.");
      const usados=new Map<string,number>();
      for(const item of existentes||[]){
        const chave=assinatura(item.data,Math.round(Number(item.valor)*100),item.descricao);
        usados.set(chave,(usados.get(chave)||0)+1);
      }
      const vistos=new Map<string,number>();
      const novas:Movimento[]=[];
      for(const item of movimentos){
        const chave=assinatura(item.data,item.valorCentavos,item.descricao);
        const n=(vistos.get(chave)||0)+1;vistos.set(chave,n);
        if(n>(usados.get(chave)||0))novas.push(item);
      }
      const {data:imp,error:erroImp}=await supabase.from("financeiro_extrato_importacoes")
        .insert({tenant_id:sessao.tenantId,conta_bancaria_id:idAlvo,origem:"pdf",
          arquivo_nome:arquivo.name.slice(0,200),periodo_inicio:datas[0],periodo_fim:datas[datas.length-1],
          saldo_final:Number(dados.saldoFinalCentavos)/100,saldo_data:datas[datas.length-1],
          linhas_novas:novas.length,linhas_repetidas:movimentos.length-novas.length,criado_por:sessao.userId})
        .select("id").single();
      if(erroImp||!imp)throw new Error("Falha ao criar a importação bancária.");
      const ocorrencias=new Map<string,number>();
      const linhasNovas=novas.map(item=>{
        const chave=assinatura(item.data,item.valorCentavos,item.descricao);
        const n=(ocorrencias.get(chave)||0)+1;ocorrencias.set(chave,n);
        // Chave determinística: evita reimportar mesmo PDF ou os mesmos itens.
        const hashLinha=createHash("sha256").update(chave+"|"+n).digest("hex");
        return {
          tenant_id:sessao.tenantId,conta_bancaria_id:idAlvo,importacao_id:imp.id,
          chave:"pdf:"+hashLinha,data:item.data,valor:item.valorCentavos/100,descricao:item.descricao,
        };
      });
      if(linhasNovas.length){
        const {error:erroLinhas}=await supabase.from("financeiro_extrato_linhas")
          .upsert(linhasNovas,{onConflict:"conta_bancaria_id,chave",ignoreDuplicates:true});
        if(erroLinhas)throw new Error("Falha ao registrar as linhas do extrato.");
      }
      await admin.from("financeiro_documentos_pdf").update({
        extrato_importacao_id:imp.id,status:"importado",quantidade_linhas:novas.length,
        observacoes:"Importação conferida; linhas pendentes de conciliação."
      }).eq("id",documentoId).eq("tenant_id",sessao.tenantId);
      revalidatePath("/financeiro/extratos");
      revalidatePath("/financeiro/importar-pdf");
      return {ok:true,mensagem:novas.length+" movimentações novas enviadas para conciliação; "+
        (movimentos.length-novas.length)+" possíveis duplicidades ignoradas. O PDF foi anexado.",
        destino:"/financeiro/extratos"};
    }
    const {data:fatura,error:erroFatura}=await supabase.from("financeiro_faturas")
      .insert({tenant_id:sessao.tenantId,cartao_id:idAlvo,competencia:competencia+"-01",vencimento})
      .select("id").single();
    if(erroFatura||!fatura)throw new Error("Falha ao criar a fatura.");
    const {error:erroItens}=await supabase.from("financeiro_fatura_itens").insert(compras.map(x=>({
      tenant_id:sessao.tenantId,fatura_id:fatura.id,data:x.data,estabelecimento:x.estabelecimento,
      descricao:"Cartão final "+x.finalCartao,valor:x.valorCentavos/100,
      parcela_atual:x.parcelaAtual,parcela_total:x.parcelaTotal
    })));
    if(erroItens){
      await supabase.from("financeiro_faturas").delete().eq("id",fatura.id).eq("tenant_id",sessao.tenantId);
      throw new Error("Não foi possível registrar todas as compras; a fatura foi revertida.");
    }
    await admin.from("financeiro_documentos_pdf").update({
      fatura_id:fatura.id,status:"importado",
      observacoes:"Compras conferidas e aguardando categorização."
    }).eq("id",documentoId).eq("tenant_id",sessao.tenantId);
    revalidatePath("/financeiro/cartao-corporativo");
    revalidatePath("/financeiro/importar-pdf");
    return {ok:true,mensagem:compras.length+" despesas adicionadas à fatura de "+
      competencia+". Original PDF armazenado; compras aguardam classificação.",
      destino:"/financeiro/cartao-corporativo"};
  }catch(erro){
    console.error("Importação PDF financeira:",erro instanceof Error?erro.message:"Erro desconhecido");
    await admin.from("financeiro_documentos_pdf").update({
      status:"erro",observacoes:erro instanceof Error?erro.message.slice(0,300):"Falha ao importar"
    }).eq("id",documentoId).eq("tenant_id",sessao.tenantId);
    revalidatePath("/financeiro/importar-pdf");
    return falha("O PDF foi guardado, mas a importação não pôde ser concluída. A equipe pode consultá-lo no histórico.");
  }
}
