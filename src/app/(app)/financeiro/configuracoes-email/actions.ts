"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { enviarRelatorioFinanceiroDiario } from "@/lib/relatorio-financeiro-diario";

export async function adicionarDestinatario(formData: FormData) {
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

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return;

  await supabase.from("financeiro_email_destinatarios").insert({
    tenant_id: usuario.tenant_id,
    email,
    nome: String(formData.get("nome") ?? "").trim() || null,
  });

  revalidatePath("/financeiro/configuracoes-email");
}

export async function alternarDestinatario(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const ativoAtual = formData.get("ativo_atual") === "true";
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("financeiro_email_destinatarios").update({ ativo: !ativoAtual }).eq("id", id);
  revalidatePath("/financeiro/configuracoes-email");
}

export async function apagarDestinatario(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("financeiro_email_destinatarios").delete().eq("id", id);
  revalidatePath("/financeiro/configuracoes-email");
}

export async function testarEnvioAgora(formData: FormData) {
  const tenantId = String(formData.get("tenant_id") ?? "");
  if (!tenantId) return;
  await enviarRelatorioFinanceiroDiario(tenantId);
  revalidatePath("/financeiro/configuracoes-email");
}
