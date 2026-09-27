"use server";

import { checar } from "@/lib/aviso";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function apagarTermosSelecionados(formData: FormData) {
  const ids = formData.getAll("ids") as string[];
  if (ids.length === 0) return;

  const supabase = await createClient();
  await checar(supabase.from("termos_visita").delete().in("id", ids), "excluir");

  revalidatePath("/termos-visita");
}

export async function apagarTermoVisita(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await checar(supabase.from("termos_visita").delete().eq("id", id), "excluir");

  revalidatePath("/termos-visita");
  redirect("/termos-visita");
}
