"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function apagarAutorizacoesSelecionadas(formData: FormData) {
  const ids = formData.getAll("ids") as string[];
  if (ids.length === 0) return;

  const supabase = await createClient();
  await supabase.from("autorizacoes_venda").delete().in("id", ids);

  revalidatePath("/autorizacoes");
}

export async function apagarAutorizacao(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("autorizacoes_venda").delete().eq("id", id);

  revalidatePath("/autorizacoes");
  redirect("/autorizacoes");
}
