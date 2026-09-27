"use server";

import { checar } from "@/lib/aviso";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function alternarTarefaMensal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tarefaId = String(formData.get("tarefa_id") ?? "");
  const competencia = String(formData.get("competencia") ?? "");
  const concluidaAtual = formData.get("concluida_atual") === "true";
  const statusId = String(formData.get("status_id") ?? "") || null;

  if (concluidaAtual && statusId) {
    await checar(supabase
      .from("tarefas_mensais_status")
      .update({ concluida: false, concluida_por: null, concluida_em: null })
      .eq("id", statusId), "atualizar");
  } else if (statusId) {
    await checar(supabase
      .from("tarefas_mensais_status")
      .update({ concluida: true, concluida_por: user?.id ?? null, concluida_em: new Date().toISOString() })
      .eq("id", statusId), "atualizar");
  } else {
    await checar(supabase.from("tarefas_mensais_status").insert({
      tarefa_id: tarefaId,
      competencia,
      concluida: true,
      concluida_por: user?.id ?? null,
      concluida_em: new Date().toISOString(),
    }), "salvar");
  }

  revalidatePath("/locacao");
}
