"use server";

import { exigirUsuario } from "@/lib/usuario-atual";

import { checar } from "@/lib/aviso";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function apagarCartasPropostaSelecionadas(formData: FormData) {
  if (!(await exigirUsuario())) return;
  const ids = formData.getAll("ids") as string[];
  if (ids.length === 0) return;

  const supabase = await createClient();
  await checar(supabase.from("cartas_proposta").delete().in("id", ids), "excluir");

  revalidatePath("/propostas");
}

export async function apagarCartaProposta(formData: FormData) {
  if (!(await exigirUsuario())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await checar(supabase.from("cartas_proposta").delete().eq("id", id), "excluir");

  revalidatePath("/propostas");
  redirect("/propostas");
}
