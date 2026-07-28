"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CategoriaProcesso } from "@/lib/types";

export async function adicionarEtapaPadrao(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = (String(formData.get("categoria") ?? "venda")) as CategoriaProcesso;
  if (!nome) return;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!usuario?.tenant_id) return;

  const { data: existentes } = await supabase
    .from("etapas_padrao")
    .select("ordem")
    .eq("tenant_id", usuario.tenant_id)
    .eq("categoria", categoria)
    .order("ordem", { ascending: false })
    .limit(1);

  const proximaOrdem = (existentes?.[0]?.ordem ?? 0) + 1;

  await supabase
    .from("etapas_padrao")
    .insert({ tenant_id: usuario.tenant_id, nome, ordem: proximaOrdem, categoria });

  revalidatePath("/etapas-padrao");
}

export async function removerEtapaPadrao(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  await supabase.from("etapas_padrao").delete().eq("id", id);
  revalidatePath("/etapas-padrao");
}
