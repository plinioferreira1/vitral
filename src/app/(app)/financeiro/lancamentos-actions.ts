"use server";

import { avisar, checar } from "@/lib/aviso";
import type { TablesInsert } from "@/lib/database.types";
import { formatarCpfCnpj, formatarTelefone } from "@/lib/mascaras";
import { moedaParaNumero } from "@/lib/moeda";
import { hojeISO } from "@/lib/data-br";
import { escopoExclusaoValido, idsParaExcluir, type EscopoExclusao } from "@/lib/exclusao-lancamentos";
import { datasDaRecorrencia, mesesPorFrequencia, type Frequencia } from "@/lib/recorrencia";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario, GESTORES } from "@/lib/usuario-atual";
import { valorDaLista } from "@/lib/validacao";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function retornoSeguro(formData: FormData, fallback: string): string {
  const retorno = String(formData.get("return_to") ?? "").trim();
  return retorno.startsWith("/financeiro") ? retorno : fallback;
}

function categoriaFornecedorOuNull(valor: unknown): string | null {
  const texto = String(valor ?? "").trim();
  return texto === "funcionario" || texto === "corretor" || texto === "prestador_servico" ? texto : null;
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
  let pessoaId = campo("pessoa_id");
  let criouPessoaInline = false;

  const novoFornecedorNome = String(formData.get("novo_fornecedor_nome") ?? "").trim();
  if (tipo === "despesa" && novoFornecedorNome) {
    const { data: novoFornecedor, error: erroFornecedor } = await supabase
      .from("financeiro_pessoas")
      .insert({
        tenant_id: tenantId,
        nome: novoFornecedorNome,
        papel: "fornecedor",
        categoria_fornecedor: categoriaFornecedorOuNull(formData.get("novo_fornecedor_categoria")),
        cpf_cnpj: formatarCpfCnpj(formData.get("novo_fornecedor_cpf_cnpj")) || null,
        telefone: formatarTelefone(formData.get("novo_fornecedor_telefone")) || null,
        email: campo("novo_fornecedor_email"),
      })
      .select("id")
      .single();

    if (erroFornecedor || !novoFornecedor) {
      console.error("Falha ao salvar fornecedor inline:", erroFornecedor);
      await avisar("erro", "Não foi possível cadastrar o fornecedor. Confira os dados e tente de novo.");
      return;
    }

    pessoaId = novoFornecedor.id;
    criouPessoaInline = true;
  }

  const dadosComuns = {
    tenant_id: tenantId,
    tipo,
    descricao,
    pessoa_id: pessoaId,
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
  if (criouPessoaInline) revalidatePath("/financeiro/pessoas");
  redirect(retornoSeguro(formData, caminho));
}

/**
 * Recalcula o status do lançamento a partir das baixas que existem:
 * tudo pago → "pago"; parte → "pago_parcial"; nada → "pendente".
 * Lançamento cancelado não é mexido. Devolve o tipo, ou null se falhar.
 */
async function recalcularStatusLancamento(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lancamentoId: string
): Promise<{ tipo: string } | null> {
  const [{ data: lancamento }, { data: baixas }] = await Promise.all([
    supabase.from("financeiro_lancamentos").select("valor, tipo, status").eq("id", lancamentoId).single(),
    supabase.from("financeiro_baixas").select("valor").eq("lancamento_id", lancamentoId),
  ]);
  if (!lancamento) return null;
  if (lancamento.status === "cancelado") return { tipo: lancamento.tipo };

  const totalBaixado = (baixas ?? []).reduce((soma, b) => soma + Number(b.valor), 0);
  const novoStatus =
    totalBaixado >= Number(lancamento.valor) - 0.005 ? "pago" : totalBaixado > 0 ? "pago_parcial" : "pendente";

  const atualizou = await checar(
    supabase.from("financeiro_lancamentos").update({ status: novoStatus }).eq("id", lancamentoId),
    "atualizar"
  );
  return atualizou ? { tipo: lancamento.tipo } : null;
}

/**
 * Desfaz um pagamento/recebimento registrado por engano: apaga a baixa
 * (o dinheiro volta para o saldo da conta) e recalcula o status do
 * lançamento, que volta a ficar em aberto ou parcial.
 */
export async function estornarBaixa(formData: FormData) {
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return;
  const baixaId = String(formData.get("baixa_id") ?? "");
  if (!baixaId) return;

  const supabase = await createClient();
  const { data: baixa } = await supabase
    .from("financeiro_baixas")
    .select("lancamento_id")
    .eq("id", baixaId)
    .single();
  if (!baixa) {
    await avisar("erro", "Pagamento não encontrado — talvez já tenha sido estornado.");
    return;
  }

  const apagou = await checar(supabase.from("financeiro_baixas").delete().eq("id", baixaId), "estornar o pagamento");
  if (!apagou) return;

  await recalcularStatusLancamento(supabase, baixa.lancamento_id);
  await avisar("sucesso", "Pagamento estornado. O lançamento voltou a ficar em aberto.");

  revalidatePath("/financeiro/contas-a-pagar");
  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/financeiro/contas-bancarias");
  revalidatePath("/financeiro");
  revalidatePath(`/financeiro/lancamentos/${baixa.lancamento_id}/baixar`);
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

  const lancamento = await recalcularStatusLancamento(supabase, lancamentoId);
  if (!lancamento) return;

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
 * Abre a conferência de baixa em lote com os lançamentos marcados.
 * Nenhum dado financeiro é alterado nesta etapa.
 */
export async function prepararBaixaEmLote(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const ids = [...new Set(formData.getAll("ids").map(String).filter(Boolean))].slice(0, 100);
  if (ids.length === 0) {
    await avisar("erro", "Selecione pelo menos um lançamento.");
    return;
  }

  const retorno = retornoSeguro(formData, "/financeiro/contas-a-pagar#lista");
  const params = new URLSearchParams({ ids: ids.join(","), retorno });
  redirect(`/financeiro/lancamentos/baixar-lote?${params.toString()}`);
}

/**
 * Registra, em uma única operação de interface, o saldo integral em aberto
 * de cada lançamento selecionado. Lançamentos quitados ou cancelados são
 * ignorados para preservar o histórico já existente.
 */
export async function registrarBaixaEmLote(formData: FormData) {
  const supabase = await createClient();
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return;
  const { userId, tenantId } = sessao;

  const ids = [...new Set(formData.getAll("ids").map(String).filter(Boolean))].slice(0, 100);
  const data = String(formData.get("data") ?? "").trim();
  const contaInformada = String(formData.get("conta_bancaria_id") ?? "").trim() || null;
  const formaInformada = String(formData.get("forma_pagamento") ?? "").trim() || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;
  const retorno = retornoSeguro(formData, "/financeiro/contas-a-pagar#lista");
  if (ids.length === 0 || !data) {
    await avisar("erro", "Selecione lançamentos e informe a data da baixa.");
    return;
  }

  const [{ data: lancamentos, error: erroLancamentos }, { data: baixas, error: erroBaixas }] = await Promise.all([
    supabase
      .from("financeiro_lancamentos")
      .select("id, valor, status, conta_bancaria_id, forma_pagamento")
      .eq("tenant_id", tenantId)
      .in("id", ids)
      .in("status", ["pendente", "pago_parcial"]),
    supabase.from("financeiro_baixas").select("lancamento_id, valor").eq("tenant_id", tenantId).in("lancamento_id", ids),
  ]);

  if (erroLancamentos || erroBaixas) {
    console.error("Falha ao preparar baixa em lote:", erroLancamentos ?? erroBaixas);
    await avisar("erro", "Não foi possível conferir os lançamentos selecionados.");
    return;
  }

  const baixadoPorLancamento = new Map<string, number>();
  for (const baixa of baixas ?? []) {
    baixadoPorLancamento.set(
      baixa.lancamento_id,
      (baixadoPorLancamento.get(baixa.lancamento_id) ?? 0) + Number(baixa.valor)
    );
  }

  const novasBaixas: TablesInsert<"financeiro_baixas">[] = (lancamentos ?? [])
    .map((lancamento) => ({
      lancamento,
      saldo: Math.max(0, Number(lancamento.valor) - (baixadoPorLancamento.get(lancamento.id) ?? 0)),
    }))
    .filter(({ saldo }) => saldo > 0.005)
    .map(({ lancamento, saldo }) => ({
      tenant_id: tenantId,
      lancamento_id: lancamento.id,
      valor: Number(saldo.toFixed(2)),
      data,
      conta_bancaria_id: contaInformada ?? lancamento.conta_bancaria_id,
      forma_pagamento: formaInformada ?? lancamento.forma_pagamento,
      observacoes,
      criado_por: userId,
    }));

  if (novasBaixas.length === 0) {
    await avisar("erro", "Nenhum dos lançamentos selecionados possui saldo em aberto.");
    redirect(retorno);
  }

  const { error: erroInsercao } = await supabase.from("financeiro_baixas").insert(novasBaixas);
  if (erroInsercao) {
    console.error("Falha ao registrar baixas em lote:", erroInsercao);
    await avisar("erro", "Não foi possível registrar as baixas. Nenhum lançamento foi alterado.");
    return;
  }

  const idsBaixados = novasBaixas.map((baixa) => baixa.lancamento_id);
  const { error: erroStatus } = await supabase
    .from("financeiro_lancamentos")
    .update({ status: "pago" })
    .eq("tenant_id", tenantId)
    .in("id", idsBaixados);

  if (erroStatus) {
    console.error("Baixas salvas, mas houve falha ao atualizar os status:", erroStatus);
    await avisar("erro", "As baixas foram salvas, mas alguns status precisam ser recalculados.");
  }

  revalidatePath("/financeiro/contas-a-pagar");
  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/financeiro/contas-bancarias");
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/agenda");
  redirect(retorno);
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
 *   Nesse modo o novo vencimento vira a âncora da sequência futura.
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
    const [{ data: recorrencia, error: erroRecorrencia }, { data: futuras, error: erroFuturas }] = await Promise.all([
      supabase
        .from("financeiro_recorrencias")
        .select("frequencia")
        .eq("id", atual.recorrencia_id)
        .single(),
      supabase
        .from("financeiro_lancamentos")
        .select("id")
        .eq("recorrencia_id", atual.recorrencia_id)
        .in("status", ["pendente", "pago_parcial"])
        .gte("vencimento", atual.vencimento)
        .order("vencimento"),
    ]);

    if (erroRecorrencia || erroFuturas || !recorrencia || !futuras) {
      console.error("Falha ao carregar recorrência para edição em lote:", erroRecorrencia ?? erroFuturas);
      await avisar("erro", "Não foi possível carregar as recorrências futuras. Tente novamente.");
      return;
    }

    const frequencia = valorDaLista("financeiro_frequencia", recorrencia.frequencia, "mensal") as Frequencia;
    const novasDatas = datasDaRecorrencia({
      dataInicio: vencimento,
      frequencia,
      numeroOcorrencias: futuras.length,
    });
    const competenciaInformada = campo("competencia");

    const atualizacoes = await Promise.all(
      futuras.map((futura, index) =>
        supabase
          .from("financeiro_lancamentos")
          .update({
            ...dadosCadastrais,
            vencimento: novasDatas[index]?.vencimento ?? vencimento,
            competencia:
              index === 0
                ? competenciaInformada ?? novasDatas[index]?.competencia ?? vencimento
                : novasDatas[index]?.competencia ?? vencimento,
          })
          .eq("id", futura.id)
      )
    );

    const erroAtualizacao = atualizacoes.find((resultado) => resultado.error)?.error;
    if (erroAtualizacao) {
      console.error("Falha ao atualizar ocorrências futuras:", erroAtualizacao);
      await avisar("erro", "Não foi possível atualizar as recorrências futuras. Tente novamente.");
      return;
    }

    const atualizouRecorrencia = await checar(
      supabase
        .from("financeiro_recorrencias")
        .update({
          descricao: dadosCadastrais.descricao,
          valor: dadosCadastrais.valor,
          data_inicio: vencimento,
          tipo_vencimento: "fixo",
          dia_util: null,
          pessoa_id: dadosCadastrais.pessoa_id,
          categoria_id: dadosCadastrais.categoria_id,
          centro_custo_id: dadosCadastrais.centro_custo_id,
          unidade_id: dadosCadastrais.unidade_id,
          conta_bancaria_id: dadosCadastrais.conta_bancaria_id,
        })
        .eq("id", atual.recorrencia_id),
      "atualizar"
    );

    if (!atualizouRecorrencia) return;
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

/**
 * Exclui um lançamento pelo menu de ações. Se ele faz parte de uma série
 * (recorrência/parcelamento), "escopo" diz o que mais vai junto — ver
 * idsParaExcluir. Apagar um lançamento apaga também as baixas dele.
 * Quando a exclusão alcança a série, a recorrência é encerrada (ou
 * apagada, se não sobrar nenhum lançamento).
 */
export async function excluirLancamento(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data: atual } = await supabase
    .from("financeiro_lancamentos")
    .select("id, recorrencia_id")
    .eq("id", id)
    .single();
  if (!atual) {
    await avisar("erro", "Lançamento não encontrado.");
    return;
  }

  const escopo: EscopoExclusao = atual.recorrencia_id
    ? escopoExclusaoValido(formData.get("escopo"))
    : "um";

  let ids = [id];
  if (escopo !== "um" && atual.recorrencia_id) {
    const { data: serie, error } = await supabase
      .from("financeiro_lancamentos")
      .select("id, vencimento, status, financeiro_baixas ( id )")
      .eq("recorrencia_id", atual.recorrencia_id);
    if (error || !serie) {
      await avisar("erro", "Não foi possível carregar os lançamentos da série. Nada foi excluído.");
      return;
    }
    ids = idsParaExcluir(
      id,
      serie.map((l) => ({
        id: l.id,
        vencimento: l.vencimento,
        status: l.status,
        temBaixa: (l.financeiro_baixas ?? []).length > 0,
      })),
      escopo,
      hojeISO()
    );
  }

  const apagou = await checar(supabase.from("financeiro_lancamentos").delete().in("id", ids), "excluir");

  if (apagou) {
    if (escopo !== "um" && atual.recorrencia_id) {
      const { count } = await supabase
        .from("financeiro_lancamentos")
        .select("id", { count: "exact", head: true })
        .eq("recorrencia_id", atual.recorrencia_id);
      if (count === 0) {
        await supabase.from("financeiro_recorrencias").delete().eq("id", atual.recorrencia_id);
      } else {
        await supabase.from("financeiro_recorrencias").update({ ativa: false }).eq("id", atual.recorrencia_id);
      }
    }
    await avisar("sucesso", ids.length === 1 ? "Lançamento excluído." : `${ids.length} lançamentos excluídos.`);
  }

  revalidatePath("/financeiro/contas-a-pagar");
  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/agenda");
}
