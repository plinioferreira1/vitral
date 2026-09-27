"use server";

import { exigirUsuario, GESTORES } from "@/lib/usuario-atual";

import { checar } from "@/lib/aviso";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function adicionarEtapaOnboarding(formData: FormData) {
  const supabase = await createClient();
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return;
  const usuario = sessao.usuario;
  if (!usuario?.tenant_id) return;

  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const link = String(formData.get("link") ?? "").trim() || null;
  if (!nome) return;

  const { data: maxOrdem } = await supabase
    .from("onboarding_etapas")
    .select("ordem")
    .eq("tenant_id", usuario.tenant_id)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  await checar(supabase.from("onboarding_etapas").insert({
    tenant_id: usuario.tenant_id,
    nome,
    descricao,
    link,
    ordem: (maxOrdem?.ordem ?? 0) + 1,
  }), "salvar");

  revalidatePath("/onboarding-corretor");
  revalidatePath("/corretor");
}

export async function editarEtapaOnboarding(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const link = String(formData.get("link") ?? "").trim() || null;
  if (!id || !nome) return;

  await checar(supabase.from("onboarding_etapas").update({ nome, descricao, link }).eq("id", id), "atualizar");

  revalidatePath("/onboarding-corretor");
  revalidatePath("/corretor");
}

export async function removerEtapaOnboarding(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await checar(supabase.from("onboarding_etapas").delete().eq("id", id), "excluir");

  revalidatePath("/onboarding-corretor");
  revalidatePath("/corretor");
}
