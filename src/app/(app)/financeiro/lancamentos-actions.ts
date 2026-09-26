"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { addWeeks, addMonths } from "date-fns";

async function contexto(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", user?.id ?? "")
    .single();
  return { userId: user?.id ?? null, tenantId: usuario?.tenant_id ?? null };
}

function proximaData(data: Date, frequencia: string): Date {
  switch (frequencia) {
    case "semanal":
      return addWeeks(data, 1);
    case "trimestral":
      return addMonths(data, 3);
    case "semestral":
      return addMonths(data, 6);
    case "anual":
      return addMonths(data, 12);
    default:
      return addMonths(data, 1);
  }
}

const MAX_OCORRENCIAS = 60;

/**
 * Cria um lançamento avulso, ou — se "recorrente" vier marcado —
 * cria a recorrência e já gera antecipadamente todas as
 * ocorrências previstas (sem executar nenhum pagamento).
 */
export async function criarLancamento(formData: FormData) {
  const supabase = await createClient();
  const { userId, tenantId } = await contexto(supabase);
  if (!tenantId) return;

  const tipo = String(formData.get("tipo") ?? "despesa");
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = Number(formData.get("valor") ?? 0);
  if (!descricao || !valor) return;

  const campo = (nome: string) => String(formData.get(nome) ?? "").trim() || null;
  const dadosComuns = {
    tenant_id: tenantId,
    tipo,
    descricao,
    pessoa_id: campo("pessoa_id"),
    categoria_id: campo("categoria_id"),
    centro_custo_id: campo("centro_custo_id"),
    unidade_id: campo("unidade_id"),
    conta_bancaria_id: campo("conta_bancaria_id"),
    forma_pagamento: campo("forma_pagamento"),
    numero_documento: campo("numero_documento"),
    observacoes: campo("observacoes"),
    criado_por: userId,
  };

  const recorrente = formData.get("recorrente") === "on";

  if (!recorrente) {
    const vencimento = campo("vencimento");
    if (!vencimento) return;
    await supabase.from("financeiro_lancamentos").insert({
      ...dadosComuns,
      valor,
      vencimento,
      competencia: campo("competencia") ?? vencimento,
    });
  } else {
    const frequencia = String(formData.get("frequencia") ?? "mensal");
    const dataInicio = campo("data_inicio");
    const dataFim = campo("data_fim");
    const numeroOcorrenciasRaw = campo("numero_ocorrencias");
    const numeroOcorrencias = numeroOcorrenciasRaw ? Number(numeroOcorrenciasRaw) : null;
    if (!dataInicio || (!dataFim && !numeroOcorrencias)) return;

    const { data: recorrencia, error } = await supabase
      .from("financeiro_recorrencias")
      .insert({
        tenant_id: tenantId,
        descricao,
        tipo,
        valor,
        frequencia,
        data_inicio: dataInicio,
        data_fim: dataFim,
        numero_ocorrencias: numeroOcorrencias,
        pessoa_id: dadosComuns.pessoa_id,
        categoria_id: dadosComuns.categoria_id,
        centro_custo_id: dadosComuns.centro_custo_id,
        unidade_id: dadosComuns.unidade_id,
        conta_bancaria_id: dadosComuns.conta_bancaria_id,
        criado_por: userId,
      })
      .select("id")
      .single();

    if (error || !recorrencia) return;

    const limiteData = dataFim ? new Date(`${dataFim}T00:00:00`) : null;
    let dataAtual = new Date(`${dataInicio}T00:00:00`);
    const ocorrencias: Record<string, unknown>[] = [];

    for (let i = 0; i < MAX_OCORRENCIAS; i++) {
      if (limiteData && dataAtual > limiteData) break;
      if (numeroOcorrencias && i >= numeroOcorrencias) break;

      ocorrencias.push({
        ...dadosComuns,
        valor,
        vencimento: dataAtual.toISOString().slice(0, 10),
        competencia: dataAtual.toISOString().slice(0, 10),
        recorrencia_id: recorrencia.id,
      });

      dataAtual = proximaData(dataAtual, frequencia);
    }

    if (ocorrencias.length > 0) {
      await supabase.from("financeiro_lancamentos").insert(ocorrencias);
    }
  }

  const caminho = tipo === "receita" ? "/financeiro/contas-a-receber" : "/financeiro/contas-a-pagar";
  revalidatePath(caminho);
  revalidatePath("/financeiro");
}

/**
 * Registra uma baixa (pagamento/recebimento total ou parcial) e
 * recalcula o status do lançamento.
 */
export async function registrarBaixa(formData: FormData) {
  const supabase = await createClient();
  const { userId, tenantId } = await contexto(supabase);
  if (!tenantId) return;

  const lancamentoId = String(formData.get("lancamento_id") ?? "");
  const valor = Number(formData.get("valor") ?? 0);
  const data = String(formData.get("data") ?? "").trim();
  if (!lancamentoId || !valor || !data) return;

  await supabase.from("financeiro_baixas").insert({
    tenant_id: tenantId,
    lancamento_id: lancamentoId,
    valor,
    data,
    conta_bancaria_id: String(formData.get("conta_bancaria_id") ?? "").trim() || null,
    forma_pagamento: String(formData.get("forma_pagamento") ?? "").trim() || null,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
    criado_por: userId,
  });

  const { data: lancamento } = await supabase
    .from("financeiro_lancamentos")
    .select("valor")
    .eq("id", lancamentoId)
    .single();
  const { data: baixas } = await supabase
    .from("financeiro_baixas")
    .select("valor")
    .eq("lancamento_id", lancamentoId);

  const totalBaixado = (baixas ?? []).reduce((soma, b) => soma + Number(b.valor), 0);
  const novoStatus =
    totalBaixado >= Number(lancamento?.valor ?? 0) ? "pago" : totalBaixado > 0 ? "pago_parcial" : "pendente";

  await supabase.from("financeiro_lancamentos").update({ status: novoStatus }).eq("id", lancamentoId);

  revalidatePath("/financeiro/contas-a-pagar");
  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/financeiro");
}

/**
 * Edita os dados cadastrais de um lançamento (descrição, vencimento,
 * valor, categoria etc). Bloqueado para lançamentos já pagos ou
 * cancelados — aí a correção deve ser feita por estorno, não por
 * edição direta, pra preservar o histórico financeiro.
 * Se o lançamento faz parte de uma recorrência, a edição vale só
 * para essa ocorrência; as demais não são alteradas.
 */
export async function editarLancamento(formData: FormData) {
  const supabase = await createClient();
  const { tenantId } = await contexto(supabase);
  if (!tenantId) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data: atual } = await supabase
    .from("financeiro_lancamentos")
    .select("status, tipo")
    .eq("id", id)
    .single();
  if (!atual || atual.status === "pago" || atual.status === "cancelado") return;

  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = Number(formData.get("valor") ?? 0);
  const vencimento = String(formData.get("vencimento") ?? "").trim();
  if (!descricao || !valor || !vencimento) return;

  const campo = (nome: string) => String(formData.get(nome) ?? "").trim() || null;

  await supabase
    .from("financeiro_lancamentos")
    .update({
      descricao,
      valor,
      vencimento,
      competencia: campo("competencia") ?? vencimento,
      pessoa_id: campo("pessoa_id"),
      categoria_id: campo("categoria_id"),
      centro_custo_id: campo("centro_custo_id"),
      unidade_id: campo("unidade_id"),
      conta_bancaria_id: campo("conta_bancaria_id"),
      forma_pagamento: campo("forma_pagamento"),
      numero_documento: campo("numero_documento"),
      observacoes: campo("observacoes"),
    })
    .eq("id", id);

  const caminho = atual.tipo === "receita" ? "/financeiro/contas-a-receber" : "/financeiro/contas-a-pagar";
  revalidatePath(caminho);
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/agenda");
}

export async function cancelarLancamento(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("financeiro_lancamentos").update({ status: "cancelado" }).eq("id", id);
  revalidatePath("/financeiro/contas-a-pagar");
  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/financeiro");
}
