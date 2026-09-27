"use server";

import { checar } from "@/lib/aviso";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TablesUpdate } from "@/lib/database.types";

export async function atualizarPerfil(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nome = String(formData.get("nome") ?? "").trim();
  const cargo = String(formData.get("cargo") ?? "").trim();
  const fotoBase64 = String(formData.get("foto_base64") ?? "");

  const updates: TablesUpdate<"usuarios"> = {
    nome,
    cargo: cargo || null,
  };

  if (fotoBase64 && fotoBase64.startsWith("data:image")) {
    const [, base64Data] = fotoBase64.split(",");
    const buffer = Buffer.from(base64Data, "base64");
    const caminho = `${user.id}/foto.jpg`;

    const { error: erroUpload } = await supabase.storage
      .from("avatars")
      .upload(caminho, buffer, { upsert: true, contentType: "image/jpeg" });

    if (erroUpload) {
      redirect(`/perfil?erro=${encodeURIComponent(erroUpload.message)}`);
    }

    const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(caminho);
    updates.foto_url = `${publicUrlData.publicUrl}?t=${Date.now()}`;
  }

  await checar(supabase.from("usuarios").update(updates).eq("id", user.id), "atualizar");

  revalidatePath("/perfil");
  revalidatePath("/", "layout");
  redirect("/perfil?salvo=1");
}
