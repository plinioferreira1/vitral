"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function atualizarPerfil(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nome = String(formData.get("nome") ?? "").trim();
  const cargo = String(formData.get("cargo") ?? "").trim();
  const foto = formData.get("foto") as File | null;

  const updates: Record<string, string | null> = {
    nome,
    cargo: cargo || null,
  };

  if (foto && foto.size > 0) {
    const extensao = foto.name.split(".").pop() || "jpg";
    const caminho = `${user.id}/foto.${extensao}`;

    const { error: erroUpload } = await supabase.storage
      .from("avatars")
      .upload(caminho, foto, { upsert: true, contentType: foto.type });

    if (erroUpload) {
      redirect(`/perfil?erro=${encodeURIComponent(erroUpload.message)}`);
    }

    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(caminho);
    // adiciona timestamp pra invalidar cache do navegador quando a foto é trocada
    updates.foto_url = `${publicUrlData.publicUrl}?t=${Date.now()}`;
  }

  await supabase.from("usuarios").update(updates).eq("id", user.id);

  revalidatePath("/perfil");
  revalidatePath("/", "layout");
}
