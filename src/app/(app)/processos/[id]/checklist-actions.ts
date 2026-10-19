"use server";

import { revalidatePath } from "next/cache";
import { avisar, checar } from "@/lib/aviso";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/usuario-atual";

const campo = (f: FormData, nome: string) => String(f.get(nome) ?? "").trim();

/** Marca ou desmarca um item do checklist de modelo neste processo. Idempotente (não alterna às cegas). */
export async function marcarItemChecklist(formData: FormData) {
  const sessao = await exigirUsuario();
  if (!sessao) return;
  const processoId = campo(formData, "processo_id");
  const itemId = campo(formData, "item_id");
  const marcar = campo(formData, "marcar") === "1";

  const supabase = await createClient();
  const [{ data: processo }, { data: item }, { data: podeEditar }] = await Promise.all([
    supabase.from("processos").select("id").eq("id", processoId).eq("tenant_id", sessao.tenantId).maybeSingle(),
    // O modelo só é visível dentro da própria empresa (RLS dos modelos).
    supabase.from("checklist_grupo_itens").select("id, texto").eq("id", itemId).maybeSingle(),
    supabase.rpc("usuario_pode_editar"),
  ]);
  if (!processo || !item) return void (await avisar("erro", "Item ou processo não encontrado. Atualize a página."));
  if (!podeEditar) return void (await avisar("erro", "Você não tem permissão para alterar este processo."));

  const admin = createAdminClient();
  const ok = marcar
    ? await checar(admin.from("processo_checklist_marcas").upsert(
        { processo_id: processoId, item_id: itemId, tenant_id: sessao.tenantId, marcado_por: sessao.userId, marcado_em: new Date().toISOString() },
        { onConflict: "processo_id,item_id", ignoreDuplicates: true },
      ), "marcar o item")
    : await checar(admin.from("processo_checklist_marcas").delete().eq("processo_id", processoId).eq("item_id", itemId), "desmarcar o item");
  if (!ok) return;
  revalidatePath(`/processos/${processoId}`);
}
