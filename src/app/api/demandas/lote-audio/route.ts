import {NextResponse} from "next/server";
import {getUsuarioAtual} from "@/lib/usuario-atual";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";

export const runtime="nodejs";
export const maxDuration=60;
const BUCKET="demandas-lotes-audios";
const MAX=8*1024*1024;
const TIPOS:Record<string,string>={
  "audio/webm":"webm","audio/ogg":"ogg","audio/mp4":"m4a","audio/mpeg":"mp3",
  "audio/wav":"wav","audio/x-wav":"wav","audio/x-m4a":"m4a","audio/aac":"aac"
};
const uuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
const erro=(mensagem:string,status:number)=>NextResponse.json({erro:mensagem},{status,headers:{"Cache-Control":"no-store"}});

/** Arquiva o áudio original de um lote, antes da confirmação da distribuição. */
export async function POST(req:Request){
  const {user,usuario}=await getUsuarioAtual();
  if(!user||!usuario?.ativo||!usuario.tenant_id)return erro("Sessão expirada.",401);
  if(!["diretor","gerente"].includes(usuario.nivel_acesso))return erro("Apenas gestores podem anexar áudios de distribuição.",403);

  let dados:FormData;
  try{dados=await req.formData();}catch{return erro("Arquivo inválido.",400);}
  const loteId=String(dados.get("lote_id")??"");
  const audio=dados.get("audio");
  if(!uuid(loteId))return erro("Identificador do lote inválido.",400);
  if(!(audio instanceof File))return erro("Selecione um áudio.",400);
  const mime=audio.type.toLowerCase().split(";")[0].trim();
  const ext=TIPOS[mime];
  if(!ext)return erro("Formato não suportado. Use M4A, MP3, OGG ou WebM.",415);
  if(!audio.size||audio.size>MAX)return erro("O áudio original deve ter até 8 MB.",413);

  const db=await createClient();
  const {data:existente}=await db.from("demandas_lote_audios")
    .select("lote_id,autor_id").eq("lote_id",loteId).eq("tenant_id",usuario.tenant_id).maybeSingle();
  if(existente){
    if(existente.autor_id!==user.id)return erro("Este lote já possui áudio de outro gestor.",409);
    return NextResponse.json({ok:true,jaExistia:true},{headers:{"Cache-Control":"no-store"}});
  }
  const admin=createAdminClient();
  // Impede que outro gestor acrescente arquivos a um lote já distribuído por alguém.
  const {data:distribuidas,error:erroDistribuidas}=await admin.from("demandas")
    .select("solicitante_id,tenant_id").eq("lote_id",loteId).limit(11);
  if(erroDistribuidas)return erro("Não foi possível validar o lote.",503);
  if(distribuidas?.length && distribuidas.some(d=>d.tenant_id!==usuario.tenant_id||d.solicitante_id!==user.id))
    return erro("Este lote pertence a outra distribuição.",403);

  const caminho=`${usuario.tenant_id}/${loteId}/original.${ext}`;
  const {error:erroUpload}=await admin.storage.from(BUCKET).upload(caminho,new Uint8Array(await audio.arrayBuffer()),
    {contentType:mime,upsert:false,cacheControl:"0"});
  if(erroUpload)return erro("Não foi possível armazenar o áudio. Tente novamente.",503);

  const {error:erroDb}=await admin.from("demandas_lote_audios").insert({
    lote_id:loteId,tenant_id:usuario.tenant_id,autor_id:user.id,caminho,
    mime_type:mime,tamanho_bytes:audio.size,nome_original:audio.name.slice(0,140)
  });
  if(erroDb){
    await admin.storage.from(BUCKET).remove([caminho]);
    return erro("Não foi possível registrar o áudio.",503);
  }
  return NextResponse.json({ok:true},{status:201,headers:{"Cache-Control":"no-store"}});
}
