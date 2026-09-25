"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function criarContaBancaria(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", user?.id ?? "")
    .single();
  if (!usuario?.tenant_id) return;

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  await supabase.from("financeiro_contas_bancarias").insert({
    tenant_id: usuario.tenant_id,
    nome,
    banco: String(formData.get("banco") ?? "").trim() || null,
    agencia: String(formData.get("agencia") ?? "").trim() || null,
    numero_conta: String(formData.get("numero_conta") ?? "").trim() || null,
    titular: String(formData.get("titular") ?? "").trim() || null,
    tipo: String(formData.get("tipo") ?? "corrente"),
    saldo_inicial: formData.get("saldo_inicial") ? Number(formData.get("saldo_inicial")) : 0,
    data_abertura: String(formData.get("data_abertura") ?? "").trim() || null,
  });

  revalidatePath("/financeiro/contas-bancarias");
  revalidatePath("/financeiro");
}

export async function arquivarContaBancaria(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("financeiro_contas_bancarias").update({ ativa: false }).eq("id", id);
  revalidatePath("/financeiro/contas-bancarias");
}
