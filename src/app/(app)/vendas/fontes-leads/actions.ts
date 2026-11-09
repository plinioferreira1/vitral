"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/usuario-atual";
import { avisar } from "@/lib/aviso";

export async function salvarFonteLead(formData: FormData) {
  const sessao = await exigirUsuario(["diretor", "gerente"]);
  if (!sessao) return;
  const id = String(formData.get("processo_id") || "");
  const fonte = String(formData.get("fonte_lead") || "").trim();
  const observacoes = String(formData.get("fonte_lead_observacoes") || "").trim();
  const data = String(formData.get("data_venda") || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) { await avisar("erro", "Processo inválido."); return; }
  if (fonte.length > 100 || observacoes.length > 500 || (data && !/^\\d{4}-\\d{2}-\\d{2}$/.test(data))) {
    await avisar("erro", "Confira os dados informados."); return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("processos")
    .update({ fonte_lead: fonte || null, fonte_lead_observacoes: observacoes || null, data_venda: data || null } as never)
    .eq("id", id).eq("tenant_id", sessao.tenantId).eq("categoria", "venda");
  if (error) { await avisar("erro", "Não foi possível salvar a fonte do lead: " + error.message); return; }
  revalidatePath("/vendas/fontes-leads");
  await avisar("sucesso", "Fonte do lead atualizada.");
}
