"use server";

import { exigirUsuario } from "@/lib/usuario-atual";

import { checar } from "@/lib/aviso";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function alternarEtapaOnboarding(formData: FormData) {
  const supabase = await createClient();
  const sessao = await exigirUsuario();
  if (!sessao) return;
  const { user } = sessao;

  const etapaId = String(formData.get("etapa_id") ?? "");
  const concluidaAtual = String(formData.get("concluida_atual") ?? "") === "true";
  const statusId = String(formData.get("status_id") ?? "");
  if (!etapaId) return;

  if (statusId) {
    await checar(supabase
      .from("onboarding_status")
      .update({
        concluida: !concluidaAtual,
        concluida_em: !concluidaAtual ? new Date().toISOString() : null,
      })
      .eq("id", statusId), "atualizar");
  } else {
    await checar(supabase.from("onboarding_status").insert({
      etapa_id: etapaId,
      usuario_id: user.id,
      concluida: true,
      concluida_em: new Date().toISOString(),
    }), "salvar");
  }

  revalidatePath("/corretor");
}
