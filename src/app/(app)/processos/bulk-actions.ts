"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function apagarProcessosSelecionados(formData: FormData) {
  const ids = formData.getAll("ids") as string[];
  if (ids.length === 0) return;

  const supabase = await createClient();
  await supabase.from("processos").delete().in("id", ids);

  revalidatePath("/vendas");
  revalidatePath("/financiamentos");
}

export async function apagarProcesso(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data: processo } = await supabase
    .from("processos")
    .select("categoria")
    .eq("id", id)
    .single();

  await supabase.from("processos").delete().eq("id", id);

  revalidatePath("/vendas");
  revalidatePath("/financiamentos");
  redirect(processo?.categoria === "financiamento" ? "/financiamentos?aba=andamento" : "/vendas?aba=andamento");
}
