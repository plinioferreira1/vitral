"use server";
import { exigirUsuario, GESTORES } from "@/lib/usuario-atual";
import { createClient } from "@/lib/supabase/server";
import { checar, avisar } from "@/lib/aviso";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
export async function publicarAtualizacaoCorretor(form: FormData) {
 const sessao = await exigirUsuario(GESTORES); if (!sessao) return;
 const id=String(form.get("processo_id") ?? ""), mensagem=String(form.get("mensagem") ?? "").trim();
 if (!mensagem || mensagem.length>2000) { await avisar("erro","Escreva uma atualização com até 2.000 caracteres."); return; }
 const supabase=await createClient() as unknown as SupabaseClient;
 if (!(await checar(supabase.from("processo_atualizacoes_corretor").insert({ processo_id:id, autor_id:sessao.userId, mensagem }),"publicar a atualização"))) return;
 revalidatePath(`/processos/${id}`); revalidatePath(`/minhas-vendas/${id}`); revalidatePath("/minhas-vendas");
 await avisar("sucesso","Atualização publicada para o corretor desta venda.");
}
