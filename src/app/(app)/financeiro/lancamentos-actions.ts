"use server";

import { avisar, checar } from "@/lib/aviso";
import type { TablesInsert } from "@/lib/database.types";
import { moedaParaNumero } from "@/lib/moeda";
import { datasDaRecorrencia, mesesPorFrequencia } from "@/lib/recorrencia";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario, GESTORES } from "@/lib/usuario-atual";
import { valorDaLista } from "@/lib/validacao";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function retornoSeguro(formData: FormData, fallback: string): string {
  const retorno = String(formData.get("return_to") ?? "").trim();
  return retorno.startsWith("/financeiro") ? retorno : fallback;
}

/**
 * Cria um lançamento avulso, ou — se "recorrente" vier marcado —
 * cria a recorrência e já gera antecipadamente todas as
 * ocorrências previstas (sem executar nenhum pagamento).
 */
export async function criarLancamento(formData: FormData) {
  const supabase = await createClient();
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return;
  const { userId, tenantId } = sessao;

  const tipo = valorDaLista("financeiro_tipo_categoria", formData.get("tipo"), "despesa");
  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = moedaParaNumero(formData.get("valor"));
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
    const salvou = await checar(
      supabase.from("financeiro_lancamentos").insert({
        ...dadosComuns,
        valor,
        vencimento,
        competencia: campo("competencia") ?? vencimento,
      }),
      "salvar"
    );
    if (!salvou) return;
  } else {
    const frequencia = valorDaLista("financeiro_frequencia", formData.get("frequencia"), "mensal");
    const dataInicio = campo("data_inicio") ?? campo("vencimento");
    const dataFim = campo("data_fim");
    const numeroOcorrenciasRaw = campo("numero_ocorrencias");
    const numeroOcorrencias = numeroOcorrenciasRaw ? Number(numeroOcorrenciasRaw) : dataFim ? null : 12;
    if (!dataInicio || (!dataFim && !numeroOcorrencias)) return;

    const tipoVencimento = String(formData.get("tipo_vencimento") ?? "fixo");
    const diaUtilRaw = campo("dia_util");
    const diaUtil = diaUtilRaw ? Number(diaUtilRaw) : null;
    const mesesStep = mesesPorFrequencia(frequencia);
    const usaDiaUtil = tipoVencimento === "dia_util" && Boolean(diaUtil) && mesesStep !== null;

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

    if (error || !recorrencia) {
      console.error("Falha ao salvar recorrência:", error);
      await avisar("erro", "Não foi possível salvar a recorrência. Confira os dados e tente de novo.");
      return;
    }

    const ocorrencias: TablesInsert<"financeiro_lancamentos">[] = datasDaRecorrencia({
      dataInicio,
      frequencia,
      dataFim,
      numeroOcorrencias,
      diaUtil: usaDiaUtil ? diaUtil : null,
    }).map(({ vencimento, competencia }) => ({
      ...dadosComuns,
      valor,
      vencimento,
      competencia,
      recorrencia_id: recorrencia.id,
    }));

    if (ocorrencias.length > 0) {
      const salvouOcorrencias = await checar(
        supabase.from("financeiro_lancamentos").insert(ocorrencias),
        "salvar"
      );
      if (!salvouOcorrencias) return;
    }
  }

  const caminho = tipo === "receita" ? "/financeiro/contas-a-receber" : "/financeiro/contas-a-pagar";
  revalidatePath(caminho);
  revalidatePath("/financeiro");
  redirect(retornoSeguro(formData, caminho));
}

/**
 * Registra uma baixa (pagamento/recebimento total ou parcial) e
 * recalcula o status do lançamento.
 */
export async function registrarBaixa(formData: FormData) {
  const supabase = await createClient();
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return;
  const { userId, tenantId } = sessao;

  const lancamentoId = String(formData.get("lancamento_id") ?? "");
  const valor = moedaParaNumero(formData.get("valor"));
  const data = String(formData.get("data") ?? "").trim();
  if (!lancamentoId || !valor || !data) return;
  const gerarRecibo = formData.get("gerar_recibo") === "on";

  const dadosBaixa: TablesInsert<"financeiro_baixas"> = {
    tenant_id: tenantId,
    lancamento_id: lancamentoId,
    valor,
    data,
    conta_bancaria_id: String(formData.get("conta_bancaria_id") ?? "").trim() || null,
    forma_pagamento: String(formData.get("forma_pagamento") ?? "").trim() || null,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
    criado_por: userId,
  };

  if (gerarRecibo) {
    dadosBaixa.gerar_recibo = true;
    dadosBaixa.recibo_emitido_para = String(formData.get("recibo_emitido_para") ?? "").trim() || null;
    dadosBaixa.recibo_documento = String(formData.get("recibo_documento") ?? "").trim() || null;
  }

  const { data: baixa, error: erroBaixa } = await supabase
    .from("financeiro_baixas")
    .insert(dadosBaixa)
    .select("id")
    .single();

  if (erroBaixa) {
    console.error("Falha ao salvar baixa:", erroBaixa);
    await avisar("erro", "Não foi possível salvar a baixa. Confira os dados e tente de novo.");
    return;
  }

  const { data: lancamento } = await supabase
    .from("financeiro_lancamentos")
    .select("valor, tipo")
    .eq("id", lancamentoId)
    .single();
  const { data: baixas } = await supabase
    .from("financeiro_baixas")
    .select("valor")
    .eq("lancamento_id", lancamentoId);

  const totalBaixado = (baixas ?? []).reduce((soma, b) => soma + Number(b.valor), 0);
  const novoStatus =
    totalBaixado >= Number(lancamento?.valor ?? 0) ? "pago" : totalBaixado > 0 ? "pago_parcial" : "pendente";

  const atualizou = await checar(
    supabase.from("financeiro_lancamentos").update({ status: novoStatus }).eq("id", lancamentoId),
    "atualizar"
  );
  if (!atualizou) return;

  const caminho = lancamento?.tipo === "receita" ? "/financeiro/contas-a-receber" : "/financeiro/contas-a-pagar";
  revalidatePath("/financeiro/contas-a-pagar");
  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/financeiro");
  if (gerarRecibo && baixa?.id) {
    redirect(`/financeiro/baixas/${baixa.id}/recibo`);
  }
  redirect(retornoSeguro(formData, caminho));
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
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data: atual } = await supabase
    .from("financeiro_lancamentos")
    .select("status, tipo, vencimento, recorrencia_id")
    .eq("id", id)
    .single();
  if (!atual || atual.status === "pago" || atual.status === "cancelado") return;

  const descricao = String(formData.get("descricao") ?? "").trim();
  const valor = moedaParaNumero(formData.get("valor"));
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
    const atualizouLancamentos = await checar(
      supabase
        .from("financeiro_lancamentos")
        .update(dadosCadastrais)
        .eq("recorrencia_id", atual.recorrencia_id)
        .in("status", ["pendente", "pago_parcial"])
        .gte("vencimento", atual.vencimento),
      "atualizar"
    );

    const atualizouRecorrencia = await checar(
      supabase
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
        .eq("id", atual.recorrencia_id),
      "atualizar"
    );

    if (!atualizouLancamentos || !atualizouRecorrencia) return;
  } else {
    const atualizou = await checar(
      supabase
        .from("financeiro_lancamentos")
        .update({
          ...dadosCadastrais,
          vencimento,
          competencia: campo("competencia") ?? vencimento,
        })
        .eq("id", id),
      "atualizar"
    );
    if (!atualizou) return;
  }

  const caminho = atual.tipo === "receita" ? "/financeiro/contas-a-receber" : "/financeiro/contas-a-pagar";
  revalidatePath(caminho);
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/agenda");
  redirect(retornoSeguro(formData, caminho));
}

/** Define (ou troca) só a categoria/centro de resultado de um lançamento já
 * lançado — usado na revisão rápida de "sem categoria", sem abrir o formulário
 * de edição completo. */
export async function categorizarLancamento(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const id = String(formData.get("id") ?? "");
  const categoriaId = String(formData.get("categoria_id") ?? "").trim();
  if (!id || !categoriaId) return;

  const supabase = await createClient();
  const centroCustoId = String(formData.get("centro_custo_id") ?? "").trim() || null;

  const { data: atual } = await supabase.from("financeiro_lancamentos").select("tipo").eq("id", id).single();
  if (!atual) return;

  await checar(
    supabase
      .from("financeiro_lancamentos")
      .update({ categoria_id: categoriaId, centro_custo_id: centroCustoId })
      .eq("id", id),
    "atualizar"
  );

  const caminho = atual.tipo === "receita" ? "/financeiro/contas-a-receber" : "/financeiro/contas-a-pagar";
  revalidatePath(caminho);
  revalidatePath("/financeiro");
}

export async function cancelarLancamento(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await checar(supabase.from("financeiro_lancamentos").update({ status: "cancelado" }).eq("id", id), "atualizar");
  revalidatePath("/financeiro/contas-a-pagar");
  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/agenda");
}

export async function reativarLancamento(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data: lancamento } = await supabase
    .from("financeiro_lancamentos")
    .select("valor, tipo")
    .eq("id", id)
    .single();
  if (!lancamento) return;

  const { data: baixas } = await supabase.from("financeiro_baixas").select("valor").eq("lancamento_id", id);
  const totalBaixado = (baixas ?? []).reduce((soma, b) => soma + Number(b.valor), 0);
  const novoStatus =
    totalBaixado >= Number(lancamento.valor) ? "pago" : totalBaixado > 0 ? "pago_parcial" : "pendente";

  await checar(supabase.from("financeiro_lancamentos").update({ status: novoStatus }).eq("id", id), "atualizar");

  const caminho = lancamento.tipo === "receita" ? "/financeiro/contas-a-receber" : "/financeiro/contas-a-pagar";
  revalidatePath(caminho);
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/agenda");
}

/**
 * Apaga em lote lançamentos selecionados por checkbox. Só apaga de
 * fato quem está "pendente" (nada foi pago ainda) — quem já tem
 * pagamento/recebimento registrado (pago ou pago_parcial) não é
 * excluído por aqui, pra não perder histórico financeiro real; use
 * "cancelar" nesses casos.
 */
export async function apagarLancamentos(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) return;

  const supabase = await createClient();
  await checar(supabase.from("financeiro_lancamentos").delete().in("id", ids).eq("status", "pendente"), "excluir");

  revalidatePath("/financeiro/contas-a-pagar");
  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/agenda");
}
