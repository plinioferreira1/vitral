"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/usuario-atual";
import { avisar, checar } from "@/lib/aviso";
import { ROTULO_TIPO, tipoLocatario } from "@/lib/ficha-locacao/campos";
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

/**
 * Abre a ficha de mais uma pessoa da mesma proposta (corresponsável ou
 * fiador). Cada pessoa preenche e assina a própria ficha, por um link só dela.
 */
export async function adicionarPessoaFicha(formData: FormData) {
  const sessao = await exigirUsuario();
  if (!sessao?.usuario.tenant_id) return;
  const principalId = String(formData.get("ficha_principal_id") ?? "");
  const nome = String(formData.get("proponente_nome") ?? "").trim().slice(0, 200);
  const email = String(formData.get("proponente_email") ?? "").trim().toLowerCase().slice(0, 254);
  const telefone = String(formData.get("proponente_telefone") ?? "").trim().slice(0, 30);
  const tipo = tipoLocatario(formData.get("tipo_locatario"), "fiador");
  if (!nome || tipo === "titular") { await avisar("erro", "Informe o nome e se a pessoa é corresponsável ou fiador."); return; }
  const supabase = await createClient() as unknown as SupabaseClient;
  const { data: principal } = await supabase.from("fichas_cadastrais_locacao").select("id, imovel_referencia, expira_em, status, tipo_locatario").eq("id", principalId).eq("tenant_id", sessao.usuario.tenant_id).maybeSingle();
  if (!principal || principal.tipo_locatario !== "titular" || principal.status === "cancelada") { await avisar("erro", "A ficha do titular não está disponível."); return; }
  // O link novo vale pelo menos 15 dias, mesmo que o do titular esteja perto de vencer.
  const expira = new Date(Math.max(new Date(principal.expira_em).getTime(), Date.now() + 15 * 86400000)).toISOString();
  const dados: Record<string, string> = { nome_completo: nome };
  if (email) dados.email = email;
  if (telefone) dados.telefone = telefone;
  const ok = await checar(supabase.from("fichas_cadastrais_locacao").insert({
    tenant_id: sessao.usuario.tenant_id, proponente_nome: nome, proponente_email: email || null,
    imovel_referencia: principal.imovel_referencia, criado_por: sessao.user.id, expira_em: expira,
    tipo_locatario: tipo, ficha_principal_id: principal.id, dados,
  }), "criar a ficha");
  if (!ok) return;
  await avisar("sucesso", `Ficha de ${ROTULO_TIPO[tipo].toLowerCase()} criada. Copie o link e envie para ${nome}.`);
  revalidatePath("/locacao/ficha-cadastral");
  revalidatePath(`/locacao/ficha-cadastral/${principal.id}`);
}
