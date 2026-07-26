"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function criarOrganizacao(formData: FormData) {
  const nomeEmpresa = String(formData.get("nome_empresa") ?? "").trim();
  const supabase = await createClient();

  const { error } = await supabase.rpc("bootstrap_tenant", {
    p_nome_empresa: nomeEmpresa,
  });

  if (error) {
    redirect(`/onboarding?erro=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}
