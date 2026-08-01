"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CategoriaProcesso, TipoEtapaPadrao } from "@/lib/types";

export async function adicionarEtapaPadrao(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const nome = String(formData.get("nome") ?? "").trim();
  const categoria = (String(formData.get("categoria") ?? "venda")) as CategoriaProcesso;
  const tipo = (String(formData.get("tipo") ?? "sequencial")) as TipoEtapaPadrao;
  if (!nome) return;

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!usuario?.tenant_id) return;

  const { data: existentes } = await supabase
    .from("etapas_padrao")
    .select("ordem")
    .eq("tenant_id", usuario.tenant_id)
    .eq("categoria", categoria)
    .order("ordem", { ascending: false })
    .limit(1);

  const proximaOrdem = (existentes?.[0]?.ordem ?? 0) + 1;

  await supabase
    .from("etapas_padrao")
    .insert({ tenant_id: usuario.tenant_id, nome, ordem: proximaOrdem, categoria, tipo });

  revalidatePath("/etapas-padrao");
}

export async function removerEtapaPadrao(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  await supabase.from("etapas_padrao").delete().eq("id", id);
  revalidatePath("/etapas-padrao");
}

export async function editarEtapaPadrao(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "") as TipoEtapaPadrao;
  if (!nome) return;
  await supabase.from("etapas_padrao").update({ nome, tipo }).eq("id", id);
  revalidatePath("/etapas-padrao");
}

export async function moverEtapaPadrao(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const direcao = String(formData.get("direcao") ?? "");
  const categoria = String(formData.get("categoria") ?? "") as CategoriaProcesso;
  const tipo = String(formData.get("tipo") ?? "") as TipoEtapaPadrao;

  const { data: etapas } = await supabase
    .from("etapas_padrao")
    .select("id, ordem")
    .eq("categoria", categoria)
    .eq("tipo", tipo)
    .order("ordem", { ascending: true });

  if (!etapas) return;

  const indice = etapas.findIndex((e) => e.id === id);
  const indiceVizinho = direcao === "cima" ? indice - 1 : indice + 1;
  if (indice === -1 || indiceVizinho < 0 || indiceVizinho >= etapas.length) return;

  const atual = etapas[indice];
  const vizinho = etapas[indiceVizinho];

  // troca as ordens entre os dois (usa um valor temporário pra não
  // colidir com a constraint de ordem única, se houver)
  await supabase.from("etapas_padrao").update({ ordem: -1 }).eq("id", atual.id);
  await supabase.from("etapas_padrao").update({ ordem: atual.ordem }).eq("id", vizinho.id);
  await supabase.from("etapas_padrao").update({ ordem: vizinho.ordem }).eq("id", atual.id);

  revalidatePath("/etapas-padrao");
}
