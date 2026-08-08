"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function apagarContratosSelecionados(formData: FormData) {
  const ids = formData.getAll("ids") as string[];
  if (ids.length === 0) return;

  const supabase = await createClient();
  await supabase.from("contratos_locacao").delete().in("id", ids);

  revalidatePath("/locacao");
}

export async function apagarContrato(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("contratos_locacao").delete().eq("id", id);

  revalidatePath("/locacao");
  redirect("/locacao?aba=contratos");
}
