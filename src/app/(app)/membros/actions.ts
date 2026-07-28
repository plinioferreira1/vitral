"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { CategoriaProcesso } from "@/lib/types";

export async function adicionarMembro(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const perfil = String(formData.get("perfil") ?? "corretor");
  const categorias = formData.getAll("categorias") as CategoriaProcesso[];

  const { error } = await supabase.rpc("add_member", {
    p_email: email,
    p_perfil: perfil,
    p_categorias: categorias,
  });

  if (error) {
    redirect(`/membros?erro=${encodeURIComponent(error.message)}`);
  }

  redirect("/membros");
}

export async function atualizarCategoriasMembro(formData: FormData) {
  const supabase = await createClient();
  const usuarioId = String(formData.get("usuario_id") ?? "");
  const categorias = formData.getAll("categorias") as CategoriaProcesso[];

  const { error } = await supabase.rpc("atualizar_categorias_membro", {
    p_usuario_id: usuarioId,
    p_categorias: categorias,
  });

  if (error) {
    redirect(`/membros?erro=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/membros");
}
