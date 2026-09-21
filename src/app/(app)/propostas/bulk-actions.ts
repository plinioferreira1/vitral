"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function apagarCartasPropostaSelecionadas(formData: FormData) {
  const ids = formData.getAll("ids") as string[];
  if (ids.length === 0) return;

  const supabase = await createClient();
  await supabase.from("cartas_proposta").delete().in("id", ids);

  revalidatePath("/propostas");
}

export async function apagarCartaProposta(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("cartas_proposta").delete().eq("id", id);

  revalidatePath("/propostas");
  redirect("/propostas");
}
