"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function adicionarMembro(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const perfil = String(formData.get("perfil") ?? "corretor");

  const { error } = await supabase.rpc("add_member", {
    p_email: email,
    p_perfil: perfil,
  });

  if (error) {
    redirect(`/membros?erro=${encodeURIComponent(error.message)}`);
  }

  redirect("/membros");
}
