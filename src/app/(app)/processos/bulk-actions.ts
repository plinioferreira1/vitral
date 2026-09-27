"use server";

import { checar } from "@/lib/aviso";

import { after } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hojeISO } from "@/lib/data-br";
import { reconciliarAgendaProcesso, removerEventosDeEtapas, reconciliarAlertaContratoFinal, removerAlertasContratoDeProcessos } from "@/lib/google-agenda";

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

  const [{ data: processo }, { data: todasEtapas }] = await Promise.all([
    supabase.from("processos").select("status").eq("id", processoId).single(),
    supabase
      .from("etapas")
      .select("id, nome, status, ordem, data_realizada, especial")
      .eq("processo_id", processoId)
      .order("ordem", { ascending: true }),
  ]);
  if (!processo || !todasEtapas) return;

  const sequenciais = todasEtapas.filter((e) => !e.especial);
  const ordemAlvo = etapaNomeAlvo
    ? (sequenciais.find((e) => e.nome === etapaNomeAlvo)?.ordem ?? null)
    : null;

  // Calcula o novo status de cada etapa e grava todas as mudanças em
  // paralelo (antes era uma gravação de cada vez, arrastando o kanban).
  const novoStatusPorId = new Map<string, string>();
  const atualizacoes = sequenciais.flatMap((etapa) => {
    const deveConcluir = ordemAlvo === null || etapa.ordem < ordemAlvo;
    const novoStatus = deveConcluir ? "concluida" : "pendente";
    novoStatusPorId.set(etapa.id, novoStatus);
    if (etapa.status === novoStatus) return [];
    return [
      checar(
        supabase
          .from("etapas")
          .update({
            status: novoStatus,
            data_realizada: novoStatus === "concluida" ? (etapa.data_realizada ?? hojeISO()) : null,
          })
          .eq("id", etapa.id),
        "mover o processo"
      ),
    ];
  });
  await Promise.all(atualizacoes);

  // Status final já é conhecido aqui — não precisa reler do banco.
  const statusFinais = todasEtapas.map((e) => novoStatusPorId.get(e.id) ?? e.status);
  const todasConcluidas = statusFinais.length > 0 && statusFinais.every((st) => st === "concluida");

  if (todasConcluidas && processo.status !== "concluido") {
    await checar(supabase.from("processos").update({ status: "concluido" }).eq("id", processoId), "atualizar");
  } else if (!todasConcluidas && processo.status === "concluido") {
    await checar(supabase.from("processos").update({ status: "ativo" }).eq("id", processoId), "atualizar");
  }

  after(() => reconciliarAgendaProcesso(supabase, processoId));
  after(() => reconciliarAlertaContratoFinal(supabase, processoId));

  revalidatePath("/vendas");
  revalidatePath("/financiamentos");
  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/");
}

export async function apagarProcessosSelecionados(formData: FormData) {
  const ids = formData.getAll("ids") as string[];
  if (ids.length === 0) return;

  const supabase = await createClient();
  const { data: etapas } = await supabase.from("etapas").select("id").in("processo_id", ids);
  await removerEventosDeEtapas(
    supabase,
    (etapas ?? []).map((e) => e.id)
  );
  await removerAlertasContratoDeProcessos(supabase, ids);

  await checar(supabase.from("processos").delete().in("id", ids), "excluir");

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

  const { data: etapas } = await supabase.from("etapas").select("id").eq("processo_id", id);
  await removerEventosDeEtapas(
    supabase,
    (etapas ?? []).map((e) => e.id)
  );
  await removerAlertasContratoDeProcessos(supabase, [id]);

  await checar(supabase.from("processos").delete().eq("id", id), "excluir");

  revalidatePath("/vendas");
  revalidatePath("/financiamentos");
  redirect(processo?.categoria === "financiamento" ? "/financiamentos?aba=andamento" : "/vendas?aba=andamento");
}
