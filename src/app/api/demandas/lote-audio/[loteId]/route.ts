import {NextResponse} from "next/server";
import {getUsuarioAtual} from "@/lib/usuario-atual";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";

export const runtime="nodejs";
const BUCKET="demandas-lotes-audios";
const uuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
export async function GET(_req:Request,{params}:{params:Promise<{loteId:string}>}){
  const {loteId}=await params;
  if(!uuid(loteId))return new NextResponse("Não encontrado",{status:404});
  const {user,usuario}=await getUsuarioAtual();
  if(!user||!usuario?.ativo||!usuario.tenant_id)return new NextResponse("Acesso negado",{status:401});
  const db=await createClient();
  // RLS garante que o colaborador recebeu uma demanda ativa do lote ou é gestor.
  const {data:audio,error}=await db.from("demandas_lote_audios")
    .select("caminho,mime_type").eq("lote_id",loteId).eq("tenant_id",usuario.tenant_id).maybeSingle();
  if(error||!audio)return new NextResponse("Não encontrado",{status:404,headers:{"Cache-Control":"no-store"}});
  const admin=createAdminClient();
  const {data:arquivo,error:erroDownload}=await admin.storage.from(BUCKET).download(audio.caminho);
  if(erroDownload||!arquivo)return new NextResponse("Áudio indisponível",{status:503});
  return new NextResponse(await arquivo.arrayBuffer(),{
    status:200,
    headers:{
      "Content-Type":audio.mime_type,"Cache-Control":"private, no-store",
      "X-Content-Type-Options":"nosniff","Content-Disposition":"inline"
    }
  });
}
