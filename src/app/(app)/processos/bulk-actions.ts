"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hojeISO } from "@/lib/data-br";

/**
 * Move um processo pra outra etapa arrastando no quadro (kanban).
 * etapaNomeAlvo === null significa a coluna "Sem etapa em aberto"
 * (marca tudo como concluído). Etapas antes da etapa alvo (na ordem
 * daquele processo) viram concluídas; a etapa alvo em diante volta
 * pra pendente (reabre, se tiver sido concluída antes — arrastar
 * pra trás também funciona). Etapas especiais não entram nessa
 * cascata, só as sequenciais.
 */
export async function moverProcessoParaEtapa(processoId: string, etapaNomeAlvo: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: processo } = await supabase
    .from("processos")
    .select("categoria, tenant_id, status")
    .eq("id", processoId)
    .single();
  if (!processo) return;

  const { data: especiaisRaw } = await supabase
    .from("etapas_padrao")
    .select("nome")
    .eq("tenant_id", processo.tenant_id)
    .eq("categoria", processo.categoria)
    .eq("tipo", "especial");
  const nomesEspeciais = new Set((especiaisRaw ?? []).map((e) => e.nome));

  const { data: todasEtapas } = await supabase
    .from("etapas")
    .select("id, nome, status, ordem, data_realizada")
    .eq("processo_id", processoId)
    .order("ordem", { ascending: true });
  if (!todasEtapas) return;

  const sequenciais = todasEtapas.filter((e) => !nomesEspeciais.has(e.nome));
  const ordemAlvo = etapaNomeAlvo
    ? (sequenciais.find((e) => e.nome === etapaNomeAlvo)?.ordem ?? null)
    : null;

  for (const etapa of sequenciais) {
    const deveConcluir = ordemAlvo === null || etapa.ordem < ordemAlvo;
    const novoStatus = deveConcluir ? "concluida" : "pendente";
    if (etapa.status === novoStatus) continue;

    await supabase
      .from("etapas")
      .update({
        status: novoStatus,
        data_realizada: novoStatus === "concluida" ? (etapa.data_realizada ?? hojeISO()) : null,
      })
      .eq("id", etapa.id);
  }

  const { data: etapasAtualizadas } = await supabase
    .from("etapas")
    .select("status")
    .eq("processo_id", processoId);
  const todasConcluidas =
    (etapasAtualizadas?.length ?? 0) > 0 && etapasAtualizadas!.every((e) => e.status === "concluida");

  if (todasConcluidas && processo.status !== "concluido") {
    await supabase.from("processos").update({ status: "concluido" }).eq("id", processoId);
  } else if (!todasConcluidas && processo.status === "concluido") {
    await supabase.from("processos").update({ status: "ativo" }).eq("id", processoId);
  }

  revalidatePath("/vendas");
  revalidatePath("/financiamentos");
  revalidatePath(`/processos/${processoId}`);
}

export async function apagarProcessosSelecionados(formData: FormData) {
  const ids = formData.getAll("ids") as string[];
  if (ids.length === 0) return;

  const supabase = await createClient();
  await supabase.from("processos").delete().in("id", ids);

  revalidatePath("/vendas");
  revalidatePath("/financiamentos");
}

export async function apagarProcesso(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data: processo } = await supabase
    .from("processos")
    .select("categoria")
    .eq("id", id)
    .single();

  await supabase.from("processos").delete().eq("id", id);

  revalidatePath("/vendas");
  revalidatePath("/financiamentos");
  redirect(processo?.categoria === "financiamento" ? "/financiamentos?aba=andamento" : "/vendas?aba=andamento");
}
