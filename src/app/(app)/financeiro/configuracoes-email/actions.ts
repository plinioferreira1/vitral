"use server";

import { exigirUsuario, GESTORES } from "@/lib/usuario-atual";

import { checar } from "@/lib/aviso";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { enviarRelatorioFinanceiroDiario } from "@/lib/relatorio-financeiro-diario";

export async function adicionarDestinatario(formData: FormData) {
  const supabase = await createClient();
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return;
  const usuario = sessao.usuario;
  if (!usuario?.tenant_id) return;

  const email = String(formData.get("email") ?? "").trim();
  if (!email) return;

  await checar(supabase.from("financeiro_email_destinatarios").insert({
    tenant_id: usuario.tenant_id,
    email,
    nome: String(formData.get("nome") ?? "").trim() || null,
  }), "salvar");

  revalidatePath("/financeiro/configuracoes-email");
}

export async function alternarDestinatario(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const id = String(formData.get("id") ?? "");
  const ativoAtual = formData.get("ativo_atual") === "true";
  if (!id) return;
  const supabase = await createClient();
  await checar(supabase.from("financeiro_email_destinatarios").update({ ativo: !ativoAtual }).eq("id", id), "atualizar");
  revalidatePath("/financeiro/configuracoes-email");
}

export async function apagarDestinatario(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await checar(supabase.from("financeiro_email_destinatarios").delete().eq("id", id), "excluir");
  revalidatePath("/financeiro/configuracoes-email");
}

export async function testarEnvioAgora(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const tenantId = String(formData.get("tenant_id") ?? "");
  if (!tenantId) return;
  await enviarRelatorioFinanceiroDiario(tenantId);
  revalidatePath("/financeiro/configuracoes-email");
}
