"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function tenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", user?.id ?? "")
    .single();
  return usuario?.tenant_id ?? null;
}

function revalidarTudo() {
  revalidatePath("/checklists-financiamento");
  revalidatePath("/financiamentos");
}

// ---------- Checklist ----------

export async function criarChecklist(formData: FormData) {
  const supabase = await createClient();
  const tid = await tenantId(supabase);
  if (!tid) return;

  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  if (!nome) return;

  const { data: maxOrdem } = await supabase
    .from("checklists_modelo")
    .select("ordem")
    .eq("tenant_id", tid)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("checklists_modelo").insert({
    tenant_id: tid,
    categoria: "financiamento",
    nome,
    descricao,
    ordem: (maxOrdem?.ordem ?? 0) + 1,
  });

  revalidarTudo();
}

export async function editarChecklist(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  if (!id || !nome) return;

  await supabase.from("checklists_modelo").update({ nome, descricao }).eq("id", id);
  revalidarTudo();
}

export async function removerChecklist(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("checklists_modelo").delete().eq("id", id);
  revalidarTudo();
}

// ---------- Grupo ----------

export async function criarGrupo(formData: FormData) {
  const supabase = await createClient();
  const checklistId = String(formData.get("checklist_id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!checklistId || !nome) return;

  const { data: maxOrdem } = await supabase
    .from("checklist_grupos")
    .select("ordem")
    .eq("checklist_id", checklistId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("checklist_grupos").insert({
    checklist_id: checklistId,
    nome,
    ordem: (maxOrdem?.ordem ?? 0) + 1,
  });

  revalidarTudo();
}

export async function editarGrupo(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const observacao = String(formData.get("observacao") ?? "").trim() || null;
  if (!id || !nome) return;

  await supabase.from("checklist_grupos").update({ nome, observacao }).eq("id", id);
  revalidarTudo();
}

export async function removerGrupo(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("checklist_grupos").delete().eq("id", id);
  revalidarTudo();
}

// ---------- Item ----------

export async function criarItem(formData: FormData) {
  const supabase = await createClient();
  const grupoId = String(formData.get("grupo_id") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();
  if (!grupoId || !texto) return;

  const { data: maxOrdem } = await supabase
    .from("checklist_grupo_itens")
    .select("ordem")
    .eq("grupo_id", grupoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("checklist_grupo_itens").insert({
    grupo_id: grupoId,
    texto,
    ordem: (maxOrdem?.ordem ?? 0) + 1,
  });

  revalidarTudo();
}

export async function editarItem(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();
  if (!id || !texto) return;

  await supabase.from("checklist_grupo_itens").update({ texto }).eq("id", id);
  revalidarTudo();
}

export async function removerItem(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("checklist_grupo_itens").delete().eq("id", id);
  revalidarTudo();
}
