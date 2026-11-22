"use server";
import { revalidatePath } from "next/cache";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { createClient } from "@/lib/supabase/server";
export async function marcarEtapaAprendizagem(form:FormData){
 const {user,usuario}=await getUsuarioAtual();
 if(!user||!usuario?.ativo||!usuario.tenant_id)return;
 const id=String(form.get("etapa_id")??"");
 if(!/^[0-9a-f-]{36}$/i.test(id))return;
 const db=await createClient();
 const {data:etapa}=await db.from("onboarding_etapas").select("id")
  .eq("id",id).eq("tenant_id",usuario.tenant_id).maybeSingle();
 if(!etapa)return;
 const concluir=String(form.get("concluir"))==="1";
 const {error}=await db.from("onboarding_status").upsert({
   etapa_id:etapa.id,usuario_id:user.id,concluida:concluir,
   concluida_em:concluir?new Date().toISOString():null
 },{onConflict:"etapa_id,usuario_id"});
 if(error)throw new Error("Não foi possível salvar seu progresso.");
 revalidatePath("/aprendizagem");
}
