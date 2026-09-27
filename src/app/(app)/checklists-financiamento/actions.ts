"use server";

import { exigirUsuario, GESTORES } from "@/lib/usuario-atual";

import { checar } from "@/lib/aviso";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/** Empresa de quem está logado — só diretor/gerente (senão, avisa e devolve null). */
async function tenantId() {
  return (await exigirUsuario(GESTORES))?.tenantId ?? null;
}

function revalidarTudo() {
  revalidatePath("/checklists-financiamento");
  revalidatePath("/financiamentos");
}

// ---------- Checklist ----------

export async function criarChecklist(formData: FormData) {
  const supabase = await createClient();
  const tid = await tenantId();
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

  await checar(supabase.from("checklists_modelo").insert({
    tenant_id: tid,
    categoria: "financiamento",
    nome,
    descricao,
    ordem: (maxOrdem?.ordem ?? 0) + 1,
  }), "salvar");

  revalidarTudo();
}

export async function editarChecklist(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  if (!id || !nome) return;

  await checar(supabase.from("checklists_modelo").update({ nome, descricao }).eq("id", id), "atualizar");
  revalidarTudo();
}

export async function removerChecklist(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await checar(supabase.from("checklists_modelo").delete().eq("id", id), "excluir");
  revalidarTudo();
}

// ---------- Grupo ----------

export async function criarGrupo(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
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

  await checar(supabase.from("checklist_grupos").insert({
    checklist_id: checklistId,
    nome,
    ordem: (maxOrdem?.ordem ?? 0) + 1,
  }), "salvar");

  revalidarTudo();
}

export async function editarGrupo(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const observacao = String(formData.get("observacao") ?? "").trim() || null;
  if (!id || !nome) return;

  await checar(supabase.from("checklist_grupos").update({ nome, observacao }).eq("id", id), "atualizar");
  revalidarTudo();
}

export async function removerGrupo(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await checar(supabase.from("checklist_grupos").delete().eq("id", id), "excluir");
  revalidarTudo();
}

// ---------- Item ----------

export async function criarItem(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
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

  await checar(supabase.from("checklist_grupo_itens").insert({
    grupo_id: grupoId,
    texto,
    ordem: (maxOrdem?.ordem ?? 0) + 1,
  }), "salvar");

  revalidarTudo();
}

export async function editarItem(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();
  if (!id || !texto) return;

  await checar(supabase.from("checklist_grupo_itens").update({ texto }).eq("id", id), "atualizar");
  revalidarTudo();
}

export async function removerItem(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await checar(supabase.from("checklist_grupo_itens").delete().eq("id", id), "excluir");
  revalidarTudo();
}
