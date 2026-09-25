"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
  const tipo = String(formData.get("tipo") ?? "despesa");
  if (!nome) return;

  await supabase.from("financeiro_categorias").insert({ tenant_id: tenantId, nome, tipo });
  revalidatePath("/financeiro/categorias");
}

export async function apagarCategoria(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("financeiro_categorias").delete().eq("id", id);
  revalidatePath("/financeiro/categorias");
}

export async function criarCentroCusto(formData: FormData) {
  const supabase = await createClient();
  const tenantId = await tenantAtual(supabase);
  if (!tenantId) return;

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  await supabase.from("financeiro_centros_custo").insert({ tenant_id: tenantId, nome });
  revalidatePath("/financeiro/categorias");
}

export async function apagarCentroCusto(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("financeiro_centros_custo").delete().eq("id", id);
  revalidatePath("/financeiro/categorias");
}
