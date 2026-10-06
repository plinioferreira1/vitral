"use server";

import { revalidatePath } from "next/cache";
import { addDays, format, parseISO } from "date-fns";
import { hojeISO } from "@/lib/data-br";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { marcarNotificacoesFeriasLidas } from "../ferias/actions";

export async function limparTodasNotificacoes(): Promise<void> {
  const supabase = await createClient();
  const { user } = await getUsuarioAtual();
  if (!user) return;
  await marcarNotificacoesFeriasLidas();

  const hoje = hojeISO();
  const limite = format(addDays(parseISO(hoje), 7), "yyyy-MM-dd");
  const { data: etapas } = await supabase
    .from("etapas")
    .select("id, data_prevista, processos!inner(status)")
    .in("status", ["pendente", "em_andamento"])
    .lte("data_prevista", limite)
    .not("processos.status", "in", "(concluido,cancelado,arquivado)");

  if (!etapas?.length) {
    revalidatePath("/");
    return;
  }

  const dispensadas = etapas
    .filter((etapa) => etapa.data_prevista)
    .map((etapa) => ({
      usuario_id: user.id,
      etapa_id: etapa.id,
      data_prevista: etapa.data_prevista!,
    }));

  if (dispensadas.length > 0) {
    const { error } = await supabase
      .from("notificacoes_dispensadas")
      .upsert(dispensadas, { onConflict: "usuario_id,etapa_id,data_prevista" });
    if (error) throw new Error("Não foi possível limpar as notificações.");
  }

  revalidatePath("/");
}
