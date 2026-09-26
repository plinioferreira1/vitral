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

/** Quantos meses uma frequência avança — null quando não é "por mês" (ex: semanal). */
function mesesPorFrequencia(frequencia: string): number | null {
  switch (frequencia) {
    case "mensal":
      return 1;
    case "trimestral":
      return 3;
    case "semestral":
      return 6;
    case "anual":
      return 12;
    default:
      return null;
  }
}

/**
 * N-ésimo dia útil (seg a sex, sem considerar feriados) de um mês.
 * Se o mês não tiver dias úteis suficientes, cai no último dia útil dele.
 */
function nEsimoDiaUtil(ano: number, mesIndex0: number, n: number): Date {
  let contador = 0;
  let ultimoUtil = new Date(ano, mesIndex0, 1);
  const dia = new Date(ano, mesIndex0, 1);
  while (dia.getMonth() === mesIndex0) {
    const semana = dia.getDay();
    if (semana !== 0 && semana !== 6) {
      contador++;
      ultimoUtil = new Date(dia);
      if (contador === n) return new Date(dia);
    }
    dia.setDate(dia.getDate() + 1);
  }
  return ultimoUtil;
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

    const tipoVencimento = String(formData.get("tipo_vencimento") ?? "fixo");
    const diaUtilRaw = campo("dia_util");
    const diaUtil = diaUtilRaw ? Number(diaUtilRaw) : null;
    const mesesStep = mesesPorFrequencia(frequencia);
    const usaDiaUtil = tipoVencimento === "dia_util" && diaUtil && mesesStep !== null;

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
        tipo_vencimento: usaDiaUtil ? "dia_util" : "fixo",
        dia_util: usaDiaUtil ? diaUtil : null,
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
    const ocorrencias: Record<string, unknown>[] = [];

    if (usaDiaUtil && diaUtil && mesesStep) {
      const base = new Date(`${dataInicio}T00:00:00`);
      for (let i = 0; i < MAX_OCORRENCIAS; i++) {
        if (numeroOcorrencias && i >= numeroOcorrencias) break;
        const alvo = addMonths(base, i * mesesStep);
        const vencimento = nEsimoDiaUtil(alvo.getFullYear(), alvo.getMonth(), diaUtil);
        if (limiteData && vencimento > limiteData) break;

        ocorrencias.push({
          ...dadosComuns,
          valor,
          vencimento: vencimento.toISOString().slice(0, 10),
          competencia: new Date(alvo.getFullYear(), alvo.getMonth(), 1).toISOString().slice(0, 10),
          recorrencia_id: recorrencia.id,
        });
      }
    } else {
      let dataAtual = new Date(`${dataInicio}T00:00:00`);
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
 *
 * Se o lançamento faz parte de uma recorrência, o campo "escopo"
 * decide o alcance da edição:
 * - "um" (padrão): só esse lançamento.
 * - "todos_futuros": esse lançamento e todas as ocorrências futuras
 *   ainda em aberto (pendente/pago_parcial) da mesma recorrência, além
 *   da recorrência-base (pra manter as próximas gerações consistentes).
 *   Nesse modo o vencimento de cada ocorrência não é alterado — só os
 *   dados cadastrais (descrição, valor, categoria etc).
 */
export async function editarLancamento(formData: FormData) {
  const supabase = await createClient();
  const { tenantId } = await contexto(supabase);
  if (!tenantId) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data: atual } = await supabase
    .from("financeiro_lancamentos")
    .select("status, tipo, vencimento, recorrencia_id")
    .eq("id", id)
    .single();
  if (!atual || atual.status === "pago" || atual.status === "cancelado") return;

  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = Number(formData.get("valor") ?? 0);
  const vencimento = String(formData.get("vencimento") ?? "").trim();
  if (!descricao || !valor || !vencimento) return;

  const campo = (nome: string) => String(formData.get(nome) ?? "").trim() || null;
  const escopo = String(formData.get("escopo") ?? "um");

  const dadosCadastrais = {
    descricao,
    valor,
    pessoa_id: campo("pessoa_id"),
    categoria_id: campo("categoria_id"),
    centro_custo_id: campo("centro_custo_id"),
    unidade_id: campo("unidade_id"),
    conta_bancaria_id: campo("conta_bancaria_id"),
    forma_pagamento: campo("forma_pagamento"),
    numero_documento: campo("numero_documento"),
    observacoes: campo("observacoes"),
  };

  if (escopo === "todos_futuros" && atual.recorrencia_id) {
    await supabase
      .from("financeiro_lancamentos")
      .update(dadosCadastrais)
      .eq("recorrencia_id", atual.recorrencia_id)
      .in("status", ["pendente", "pago_parcial"])
      .gte("vencimento", atual.vencimento);

    await supabase
      .from("financeiro_recorrencias")
      .update({
        descricao: dadosCadastrais.descricao,
        valor: dadosCadastrais.valor,
        pessoa_id: dadosCadastrais.pessoa_id,
        categoria_id: dadosCadastrais.categoria_id,
        centro_custo_id: dadosCadastrais.centro_custo_id,
        unidade_id: dadosCadastrais.unidade_id,
        conta_bancaria_id: dadosCadastrais.conta_bancaria_id,
      })
      .eq("id", atual.recorrencia_id);
  } else {
    await supabase
      .from("financeiro_lancamentos")
      .update({
        ...dadosCadastrais,
        vencimento,
        competencia: campo("competencia") ?? vencimento,
      })
      .eq("id", id);
  }

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

/**
 * Apaga em lote lançamentos selecionados por checkbox. Só apaga de
 * fato quem está "pendente" (nada foi pago ainda) — quem já tem
 * pagamento/recebimento registrado (pago ou pago_parcial) não é
 * excluído por aqui, pra não perder histórico financeiro real; use
 * "cancelar" nesses casos.
 */
export async function apagarLancamentos(formData: FormData) {
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) return;

  const supabase = await createClient();
  await supabase.from("financeiro_lancamentos").delete().in("id", ids).eq("status", "pendente");

  revalidatePath("/financeiro/contas-a-pagar");
  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/agenda");
}
