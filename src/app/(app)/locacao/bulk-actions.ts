"use server";

import { exigirUsuario } from "@/lib/usuario-atual";

import { checar } from "@/lib/aviso";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function apagarContratosSelecionados(formData: FormData) {
  if (!(await exigirUsuario())) return;
  const ids = formData.getAll("ids") as string[];
  if (ids.length === 0) return;

  const supabase = await createClient();
  await checar(supabase.from("contratos_locacao").delete().in("id", ids), "excluir");

  revalidatePath("/locacao");
}

export async function apagarContrato(formData: FormData) {
  if (!(await exigirUsuario())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await checar(supabase.from("contratos_locacao").delete().eq("id", id), "excluir");

  revalidatePath("/locacao");
  redirect("/locacao?aba=contratos");
}
