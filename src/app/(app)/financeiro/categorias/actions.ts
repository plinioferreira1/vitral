"use server";

import { exigirUsuario, GESTORES } from "@/lib/usuario-atual";

import { checar } from "@/lib/aviso";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { valorDaLista } from "@/lib/validacao";

/** Empresa de quem está logado — só diretor/gerente (senão, avisa e devolve null). */
async function tenantAtual() {
  return (await exigirUsuario(GESTORES))?.tenantId ?? null;
}

export async function criarCategoria(formData: FormData) {
  const supabase = await createClient();
  const tenantId = await tenantAtual();
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
  if (!(await exigirUsuario(GESTORES))) return;
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
  if (!(await exigirUsuario(GESTORES))) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await checar(supabase.from("financeiro_categorias").delete().eq("id", id), "excluir");
  revalidatePath("/financeiro/categorias");
}

export async function criarCentroCusto(formData: FormData) {
  const supabase = await createClient();
  const tenantId = await tenantAtual();
  if (!tenantId) return;

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  await checar(supabase.from("financeiro_centros_custo").insert({ tenant_id: tenantId, nome }), "salvar");
  revalidatePath("/financeiro/categorias");
}

export async function apagarCentroCusto(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await checar(supabase.from("financeiro_centros_custo").delete().eq("id", id), "excluir");
  revalidatePath("/financeiro/categorias");
}
