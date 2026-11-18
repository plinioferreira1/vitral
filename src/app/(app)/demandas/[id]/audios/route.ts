import { NextResponse, after } from "next/server";
import { notificarPush } from "@/lib/demandas/push";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const BUCKET="demandas-audios";
const LIMITE=4*1024*1024;
const TIPOS:Record<string,string>={
  "audio/webm":"webm","audio/ogg":"ogg","audio/mp4":"m4a","audio/mpeg":"mp3",
  "audio/wav":"wav","audio/x-wav":"wav","audio/x-m4a":"m4a","audio/aac":"aac",
};
const uuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
const resposta=(message:string,status:number)=>NextResponse.json({erro:message},{status});

/** Upload pelo servidor. Somente quem já consegue abrir a demanda poderá adicionar voz. */
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!uuid(id))return resposta("Demanda inválida.",400);
  const {user,usuario}=await getUsuarioAtual();
  if(!user||!usuario?.ativo||!usuario.tenant_id)return resposta("Acesso negado.",401);
  const supabase=await createClient();
  const {data:demanda,error:erroDemanda}=await supabase.from("demandas")
    .select("id,tenant_id,solicitante_id,responsavel_id").eq("id",id).eq("tenant_id",usuario.tenant_id).maybeSingle();
  if(erroDemanda||!demanda)return resposta("Demanda não encontrada ou sem permissão.",404);
  let arquivo:FormDataEntryValue|null=null;
  try{const form=await req.formData();arquivo=form.get("audio");}
  catch{return resposta("Não foi possível receber o arquivo.",400);}
  if(!(arquivo instanceof File))return resposta("Selecione ou grave um áudio.",400);
  const mime=arquivo.type.toLowerCase().split(";")[0].trim();
  const extensao=TIPOS[mime];
  if(!extensao)return resposta("Formato de áudio inválido. Use WebM, M4A, MP3, OGG ou WAV.",415);
  if(!arquivo.size||arquivo.size>LIMITE)return resposta("O áudio deve ter até 4 MB.",413);
  const idAudio=crypto.randomUUID();
  const caminho=`${usuario.tenant_id}/${id}/${idAudio}.${extensao}`;
  const admin=createAdminClient();
  const buffer=new Uint8Array(await arquivo.arrayBuffer());
  const {error:erroUpload}=await admin.storage.from(BUCKET).upload(caminho,buffer,{
    contentType:mime,upsert:false,cacheControl:"0",
  });
  if(erroUpload)return resposta("Não foi possível salvar o áudio. Tente novamente.",503);
  const {error:erroRegistro}=await admin.from("demandas_audios").insert({
    id:idAudio,tenant_id:usuario.tenant_id,demanda_id:id,autor_id:user.id,
    caminho,mime_type:mime,tamanho_bytes:arquivo.size,
    nome_original:arquivo.name?.slice(0,140)||null,
  });
  if(erroRegistro){
    await admin.storage.from(BUCKET).remove([caminho]);
    return resposta("Não foi possível registrar o áudio.",503);
  }
  const destino=demanda.solicitante_id===user.id?demanda.responsavel_id:demanda.solicitante_id;
  if(destino!==user.id)after(()=>notificarPush(usuario.tenant_id!,destino,id,"Novo áudio"));
  return NextResponse.json({ok:true,id:idAudio},{status:201,headers:{"Cache-Control":"no-store"}});
}
