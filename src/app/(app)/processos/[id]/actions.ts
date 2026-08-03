"use server";

import { createClient } from "@/lib/supabase/server";
import { recalcularDataDependente } from "@/lib/motor-processos";
import { revalidatePath } from "next/cache";
import { parseISO } from "date-fns";
import { hojeISO } from "@/lib/data-br";

export async function concluirEtapa(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const etapaId = String(formData.get("etapa_id") ?? "");
  const processoId = String(formData.get("processo_id") ?? "");
  const dataRealizada =
    String(formData.get("data_realizada") ?? "") || hojeISO();

  const { data: etapa } = await supabase
    .from("etapas")
    .select("id, nome")
    .eq("id", etapaId)
    .single();

  await supabase
    .from("etapas")
    .update({ status: "concluida", data_realizada: dataRealizada })
    .eq("id", etapaId);

  await supabase.from("historico").insert({
    processo_id: processoId,
    etapa_id: etapaId,
    usuario_id: user.id,
    acao: "concluiu a etapa",
    detalhe: { etapa: etapa?.nome, data_realizada: dataRealizada },
  });

  // Recalcula em cascata as etapas que dependem desta, usando a regra
  // do modelo de origem (dias_offset a partir da data_realizada real,
  // não da prevista) — é o que evita "esconder" atraso propagado.
  const { data: dependentes } = await supabase
    .from("etapas")
    .select("id, modelo_etapa_id")
    .eq("etapa_dependencia_id", etapaId)
    .eq("status", "pendente");

  if (dependentes && dependentes.length > 0) {
    for (const dep of dependentes) {
      if (!dep.modelo_etapa_id) continue;
      const { data: modeloEtapa } = await supabase
        .from("modelos_etapa")
        .select("dias_offset, tipo_regra_data")
        .eq("id", dep.modelo_etapa_id)
        .single();

      if (modeloEtapa?.tipo_regra_data === "relativa_etapa_anterior") {
        const novaData = recalcularDataDependente(
          parseISO(dataRealizada),
          modeloEtapa.dias_offset
        );
        await supabase.from("etapas").update({ data_prevista: novaData }).eq("id", dep.id);
      }
    }
  }

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/");
  revalidatePath("/calendario");

  // Se essa era a última etapa pendente do processo (contando
  // sequenciais e especiais — uma especial ativa e pendente, tipo
  // "Em Processo Judicial", bloqueia a conclusão), o processo passa
  // pra "concluído" sozinho.
  const { data: processoAtual } = await supabase
    .from("processos")
    .select("status")
    .eq("id", processoId)
    .single();

  if (processoAtual && processoAtual.status !== "concluido") {
    const { data: todasEtapas } = await supabase
      .from("etapas")
      .select("status")
      .eq("processo_id", processoId);

    const todasConcluidas =
      (todasEtapas?.length ?? 0) > 0 && todasEtapas!.every((e) => e.status === "concluida");

    if (todasConcluidas) {
      await supabase.from("processos").update({ status: "concluido" }).eq("id", processoId);
      revalidatePath(`/processos/${processoId}`);
      revalidatePath("/processos");
    }
  }
}

export async function reabrirEtapa(formData: FormData) {
  const supabase = await createClient();
  const etapaId = String(formData.get("etapa_id") ?? "");
  const processoId = String(formData.get("processo_id") ?? "");

  await supabase
    .from("etapas")
    .update({ status: "pendente", data_realizada: null })
    .eq("id", etapaId);

  // Se o processo já tinha sido dado como concluído, reabrir uma
  // etapa desfaz isso — volta a aparecer na lista principal.
  const { data: processoAtual } = await supabase
    .from("processos")
    .select("status")
    .eq("id", processoId)
    .single();

  if (processoAtual?.status === "concluido") {
    await supabase.from("processos").update({ status: "ativo" }).eq("id", processoId);
    revalidatePath("/processos");
  }

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/");
  revalidatePath("/calendario");
}

export async function alterarDataPrevista(formData: FormData) {
  const supabase = await createClient();
  const etapaId = String(formData.get("etapa_id") ?? "");
  const processoId = String(formData.get("processo_id") ?? "");
  const novaData = String(formData.get("data_prevista") ?? "");

  await supabase.from("etapas").update({ data_prevista: novaData || null }).eq("id", etapaId);

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/");
  revalidatePath("/calendario");
}

export async function alternarChecklistItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const itemId = String(formData.get("item_id") ?? "");
  const processoId = String(formData.get("processo_id") ?? "");
  const concluidoAtual = formData.get("concluido_atual") === "true";

  await supabase
    .from("checklist_itens")
    .update({
      concluido: !concluidoAtual,
      concluido_por: !concluidoAtual ? (user?.id ?? null) : null,
      concluido_em: !concluidoAtual ? new Date().toISOString() : null,
    })
    .eq("id", itemId);

  revalidatePath(`/processos/${processoId}`);
}

export async function alternarEtapaPadrao(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const processoId = String(formData.get("processo_id") ?? "");
  const nome = String(formData.get("nome") ?? "");
  const ordemCatalogo = Number(formData.get("ordem") ?? "0");
  const aplicada = formData.get("aplicada") === "true";
  const etapaId = String(formData.get("etapa_id") ?? "") || null;

  if (aplicada && etapaId) {
    // já existe -> remove (destrava a etapa desse processo)
    await supabase.from("etapas").delete().eq("id", etapaId);
  } else if (!aplicada) {
    await supabase.from("etapas").insert({
      processo_id: processoId,
      nome,
      responsavel_id: user?.id ?? null,
      status: "pendente",
      ordem: ordemCatalogo,
    });
  }

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/");
  revalidatePath("/calendario");
}

export async function salvarComissao(formData: FormData) {
  const supabase = await createClient();
  const processoId = String(formData.get("processo_id") ?? "");
  const comissaoId = String(formData.get("comissao_id") ?? "") || null;
  const beneficiarioId = String(formData.get("beneficiario_id") ?? "") || null;
  const valorPrevisto = String(formData.get("valor_previsto") ?? "");
  const status = String(formData.get("status") ?? "0% pago");
  const dataPrevista = String(formData.get("data_prevista") ?? "") || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  const pago100 = status === "100% pago";

  const campos = {
    beneficiario_id: beneficiarioId,
    valor_previsto: valorPrevisto ? Number(valorPrevisto) : null,
    status,
    data_prevista: dataPrevista,
    observacoes,
    ...(pago100
      ? { valor_recebido: valorPrevisto ? Number(valorPrevisto) : null, data_recebida: hojeISO() }
      : { valor_recebido: null, data_recebida: null }),
  };

  if (comissaoId) {
    await supabase.from("comissoes").update(campos).eq("id", comissaoId);
  } else {
    await supabase.from("comissoes").insert({ processo_id: processoId, ...campos });
  }

  revalidatePath(`/processos/${processoId}`);
}

export async function adicionarComentario(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const processoId = String(formData.get("processo_id") ?? "");
  const etapaId = String(formData.get("etapa_id") ?? "") || null;
  const texto = String(formData.get("texto") ?? "").trim();

  if (!texto) return;

  await supabase.from("comentarios").insert({
    processo_id: processoId,
    etapa_id: etapaId,
    usuario_id: user.id,
    texto,
  });

  revalidatePath(`/processos/${processoId}`);
}
