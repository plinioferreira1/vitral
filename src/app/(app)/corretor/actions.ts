"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function alternarEtapaOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const etapaId = String(formData.get("etapa_id") ?? "");
  const concluidaAtual = String(formData.get("concluida_atual") ?? "") === "true";
  const statusId = String(formData.get("status_id") ?? "");
  if (!etapaId) return;

  if (statusId) {
    await supabase
      .from("onboarding_status")
      .update({
        concluida: !concluidaAtual,
        concluida_em: !concluidaAtual ? new Date().toISOString() : null,
      })
      .eq("id", statusId);
  } else {
    await supabase.from("onboarding_status").insert({
      etapa_id: etapaId,
      usuario_id: user.id,
      concluida: true,
      concluida_em: new Date().toISOString(),
    });
  }

  revalidatePath("/corretor");
}
