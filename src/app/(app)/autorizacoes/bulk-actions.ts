"use server";

import { checar } from "@/lib/aviso";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function apagarAutorizacoesSelecionadas(formData: FormData) {
  const ids = formData.getAll("ids") as string[];
  if (ids.length === 0) return;

  const supabase = await createClient();
  await checar(supabase.from("autorizacoes_venda").delete().in("id", ids), "excluir");

  revalidatePath("/autorizacoes");
}

export async function apagarAutorizacao(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await checar(supabase.from("autorizacoes_venda").delete().eq("id", id), "excluir");

  revalidatePath("/autorizacoes");
  redirect("/autorizacoes");
}
