import { NextResponse } from "next/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_req:Request,{params}:{params:Promise<{id:string;audioId:string}>}){
  const {id,audioId}=await params;
  const {user,usuario}=await getUsuarioAtual();
  if(!user||!usuario?.ativo||!usuario.tenant_id)return new Response("Não autorizado.",{status:401});
  const supabase=await createClient();
  const {data:audio}=await supabase.from("demandas_audios")
    .select("caminho,tenant_id,demanda_id").eq("id",audioId)
    .eq("demanda_id",id).eq("tenant_id",usuario.tenant_id).maybeSingle();
  if(!audio)return new Response("Áudio não encontrado ou sem acesso.",{status:404});
  if(!audio.caminho.startsWith(`${usuario.tenant_id}/${id}/`))return new Response("Arquivo inválido.",{status:404});
  const {data,error}=await createAdminClient().storage.from("demandas-audios").createSignedUrl(audio.caminho,60);
  if(error||!data?.signedUrl)return new Response("Áudio indisponível.",{status:503});
  const res=NextResponse.redirect(data.signedUrl);
  res.headers.set("Cache-Control","private, no-store");
  res.headers.set("Referrer-Policy","no-referrer");
  return res;
}
