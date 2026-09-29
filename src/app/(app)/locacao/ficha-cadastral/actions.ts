"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/usuario-atual";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function criarFichaLocacao(formData: FormData) {
  const sessao = await exigirUsuario();
  if (!sessao?.usuario.tenant_id) return;
  const nome = String(formData.get("proponente_nome") ?? "").trim();
  const email = String(formData.get("proponente_email") ?? "").trim().toLowerCase();
  const imovel = String(formData.get("imovel_referencia") ?? "").trim();
  const validade = Math.min(90, Math.max(1, Number(formData.get("validade_dias") ?? 30)));
  if (!nome || !email || !imovel) return;
  const supabase = await createClient() as unknown as SupabaseClient;
  const { data, error } = await supabase.from("fichas_cadastrais_locacao").insert({
    tenant_id: sessao.usuario.tenant_id, proponente_nome: nome, proponente_email: email,
    imovel_referencia: imovel, criado_por: sessao.user.id,
    expira_em: new Date(Date.now() + validade * 86400000).toISOString(),
    dados: { nome_completo: nome, email, imovel_interesse: imovel },
  }).select("id").single();
  if (error || !data) return;
  revalidatePath("/locacao/ficha-cadastral");
  redirect(`/locacao/ficha-cadastral/${data.id}`);
}

export async function cancelarFichaLocacao(formData: FormData) {
  const sessao = await exigirUsuario();
  if (!sessao?.usuario.tenant_id) return;
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient() as unknown as SupabaseClient;
  await supabase.from("fichas_cadastrais_locacao").update({ status: "cancelada", atualizado_em: new Date().toISOString() }).eq("id", id).eq("tenant_id", sessao.usuario.tenant_id);
  revalidatePath("/locacao/ficha-cadastral");
  revalidatePath(`/locacao/ficha-cadastral/${id}`);
}
