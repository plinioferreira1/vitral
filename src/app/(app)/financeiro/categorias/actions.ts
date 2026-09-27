"use server";

import { checar } from "@/lib/aviso";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { valorDaLista } from "@/lib/validacao";

async function tenantAtual(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", user?.id ?? "")
    .single();
  return usuario?.tenant_id ?? null;
}

export async function criarCategoria(formData: FormData) {
  const supabase = await createClient();
  const tenantId = await tenantAtual(supabase);
  if (!tenantId) return;

  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = valorDaLista("financeiro_tipo_categoria", formData.get("tipo"), "despesa");
  const grupo = String(formData.get("grupo") ?? "").trim() || null;
  const centroCustoPadraoId = String(formData.get("centro_custo_padrao_id") ?? "").trim() || null;
  if (!nome) return;

  await checar(supabase
    .from("financeiro_categorias")
    .insert({ tenant_id: tenantId, nome, tipo, grupo, centro_custo_padrao_id: centroCustoPadraoId }), "salvar");
  revalidatePath("/financeiro/categorias");
}

export async function editarCategoria(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const nome = String(formData.get("nome") ?? "").trim();
  const grupo = String(formData.get("grupo") ?? "").trim() || null;
  const centroCustoPadraoId = String(formData.get("centro_custo_padrao_id") ?? "").trim() || null;
  if (!nome) return;

  const supabase = await createClient();
  await checar(supabase
    .from("financeiro_categorias")
    .update({ nome, grupo, centro_custo_padrao_id: centroCustoPadraoId })
    .eq("id", id), "atualizar");
  revalidatePath("/financeiro/categorias");
}

export async function apagarCategoria(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await checar(supabase.from("financeiro_categorias").delete().eq("id", id), "excluir");
  revalidatePath("/financeiro/categorias");
}

export async function criarCentroCusto(formData: FormData) {
  const supabase = await createClient();
  const tenantId = await tenantAtual(supabase);
  if (!tenantId) return;

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  await checar(supabase.from("financeiro_centros_custo").insert({ tenant_id: tenantId, nome }), "salvar");
  revalidatePath("/financeiro/categorias");
}

export async function apagarCentroCusto(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await checar(supabase.from("financeiro_centros_custo").delete().eq("id", id), "excluir");
  revalidatePath("/financeiro/categorias");
}
