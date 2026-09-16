"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function adicionarTutorial(formData: FormData) {
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

  const categoria = String(formData.get("categoria") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "texto");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const conteudo = String(formData.get("conteudo") ?? "").trim() || null;
  const link = String(formData.get("link") ?? "").trim() || null;
  const ordem = Number(formData.get("ordem") ?? 0);

  if (!categoria || !titulo) return;

  await supabase.from("tutoriais").insert({
    tenant_id: usuario.tenant_id,
    categoria,
    tipo,
    titulo,
    descricao,
    conteudo,
    link,
    ordem,
  });

  revalidatePath("/tutoriais");
  revalidatePath("/corretor");
}

export async function editarTutorial(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const categoria = String(formData.get("categoria") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "texto");
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;
  const conteudo = String(formData.get("conteudo") ?? "").trim() || null;
  const link = String(formData.get("link") ?? "").trim() || null;
  const ordem = Number(formData.get("ordem") ?? 0);

  await supabase
    .from("tutoriais")
    .update({ categoria, tipo, titulo, descricao, conteudo, link, ordem })
    .eq("id", id);

  revalidatePath("/tutoriais");
  revalidatePath("/corretor");
}

export async function removerTutorial(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("tutoriais").delete().eq("id", id);

  revalidatePath("/tutoriais");
  revalidatePath("/corretor");
}
