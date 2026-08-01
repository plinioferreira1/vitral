"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function criarContratoLocacao(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!usuario?.tenant_id) redirect("/onboarding");

  const imovelId = String(formData.get("imovel_id") ?? "") || null;
  const locadorId = String(formData.get("locador_id") ?? "") || null;
  const locatarioId = String(formData.get("locatario_id") ?? "") || null;
  const emiteNf = formData.get("emite_nf") === "on";

  let numero = `Contrato ${Date.now().toString().slice(-6)}`;
  if (imovelId) {
    const { data: imovel } = await supabase.from("imoveis").select("endereco").eq("id", imovelId).single();
    if (imovel?.endereco) numero = imovel.endereco;
  }

  const { data: contrato, error } = await supabase
    .from("contratos_locacao")
    .insert({
      tenant_id: usuario.tenant_id,
      numero,
      imovel_id: imovelId,
      locador_id: locadorId,
      locatario_id: locatarioId,
      emite_nf: emiteNf,
      responsavel_id: user.id,
      ativo: true,
    })
    .select("id")
    .single();

  if (error || !contrato) {
    redirect(`/locacao/novo?erro=${encodeURIComponent(error?.message ?? "Erro ao criar contrato.")}`);
    return;
  }

  redirect(`/locacao/${contrato.id}`);
}
