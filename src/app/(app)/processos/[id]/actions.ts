"use server";

import { exigirUsuario } from "@/lib/usuario-atual";

import { checar, avisar } from "@/lib/aviso";

import { after } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { recalcularDataDependente } from "@/lib/motor-processos";
import { revalidatePath } from "next/cache";
import { parseISO } from "date-fns";
import { hojeISO } from "@/lib/data-br";
import { reconciliarAgendaProcesso, removerEventosDeEtapas, reconciliarAlertaContratoFinal } from "@/lib/google-agenda";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TablesUpdate } from "@/lib/database.types";

async function resolverOuCriar(
  supabase: SupabaseClient,
  tabela: string,
  campoNome: string,
  tenantId: string,
  valorDigitado: string
): Promise<string | null> {
  const nome = valorDigitado.trim();
  if (!nome) return null;

  const { data: existente } = await supabase
    .from(tabela)
    .select("id")
    .eq("tenant_id", tenantId)
    .ilike(campoNome, nome)
    .limit(1)
    .maybeSingle();

  if (existente) return existente.id;

  const { data: criado } = await supabase
    .from(tabela)
    .insert({ tenant_id: tenantId, [campoNome]: nome })
    .select("id")
    .single();

  return criado?.id ?? null;
}

export async function salvarOrdemEtapas(processoId: string, etapaIdsEmOrdem: string[]) {
  if (!(await exigirUsuario())) return;
  const supabase = await createClient();
  if (!processoId || etapaIdsEmOrdem.length === 0) return;

  await Promise.all(
    etapaIdsEmOrdem.map((etapaId, indice) =>
      supabase
        .from("etapas")
        .update({ ordem: indice + 1 })
        .eq("id", etapaId)
        .eq("processo_id", processoId)
    )
  );

  revalidatePath(`/processos/${processoId}`);
}

export async function concluirEtapa(formData: FormData) {
  const supabase = await createClient();
  const sessao = await exigirUsuario();
  if (!sessao) return;
  const { user } = sessao;

  const etapaId = String(formData.get("etapa_id") ?? "");
  const processoId = String(formData.get("processo_id") ?? "");
  const dataRealizada =
    String(formData.get("data_realizada") ?? "") || hojeISO();

  // 1ª rodada (em paralelo): nome da etapa, conclusão dela, etapas que
  // dependem desta e status atual do processo.
  const [{ data: etapa }, , { data: dependentes }, { data: processoAtual }] = await Promise.all([
    supabase.from("etapas").select("id, nome").eq("id", etapaId).single(),
    checar(
      supabase
        .from("etapas")
        .update({ status: "concluida", data_realizada: dataRealizada })
        .eq("id", etapaId),
      "concluir a etapa"
    ),
    supabase
      .from("etapas")
      .select("id, modelo_etapa_id")
      .eq("etapa_dependencia_id", etapaId)
      .eq("status", "pendente"),
    supabase.from("processos").select("status").eq("id", processoId).single(),
  ]);

  // Recalcula em cascata as etapas que dependem desta, usando a regra
  // do modelo de origem (dias_offset a partir da data_realizada real,
  // não da prevista) — é o que evita "esconder" atraso propagado.
  const deps = (dependentes ?? []).filter((d) => d.modelo_etapa_id);
  const modeloIds = [...new Set(deps.map((d) => d.modelo_etapa_id as string))];
  const verificarConclusao = !!processoAtual && processoAtual.status !== "concluido";

  // 2ª rodada (em paralelo): histórico, regras dos modelos (numa única
  // consulta, não uma por etapa) e o status de todas as etapas.
  const [, { data: modelos }, { data: todasEtapas }] = await Promise.all([
    checar(
      supabase.from("historico").insert({
        processo_id: processoId,
        etapa_id: etapaId,
        usuario_id: user.id,
        acao: "concluiu a etapa",
        detalhe: { etapa: etapa?.nome, data_realizada: dataRealizada },
      }),
      "registrar o histórico"
    ),
    modeloIds.length > 0
      ? supabase.from("modelos_etapa").select("id, dias_offset, tipo_regra_data").in("id", modeloIds)
      : Promise.resolve({ data: [] as { id: string; dias_offset: number; tipo_regra_data: string }[] }),
    verificarConclusao
      ? supabase.from("etapas").select("status").eq("processo_id", processoId)
      : Promise.resolve({ data: null as { status: string }[] | null }),
  ]);

  const modeloPorId = new Map((modelos ?? []).map((m) => [m.id, m]));
  await Promise.all(
    deps.map((dep) => {
      const modeloEtapa = modeloPorId.get(dep.modelo_etapa_id as string);
      if (modeloEtapa?.tipo_regra_data !== "relativa_etapa_anterior") return null;
      const novaData = recalcularDataDependente(parseISO(dataRealizada), modeloEtapa.dias_offset);
      return checar(
        supabase.from("etapas").update({ data_prevista: novaData }).eq("id", dep.id),
        "recalcular as etapas seguintes"
      );
    })
  );

  // Sincroniza o Google Agenda depois de responder — a tela não espera.
  after(() => reconciliarAgendaProcesso(supabase, processoId));

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/");
  revalidatePath("/calendario");

  // Se essa era a última etapa pendente do processo (contando
  // sequenciais e especiais — uma especial ativa e pendente, tipo
  // "Em Processo Judicial", bloqueia a conclusão), o processo passa
  // pra "concluído" sozinho.
  if (verificarConclusao) {
    const todasConcluidas =
      (todasEtapas?.length ?? 0) > 0 && todasEtapas!.every((e) => e.status === "concluida");

    if (todasConcluidas) {
      await checar(supabase.from("processos").update({ status: "concluido" }).eq("id", processoId), "atualizar");
      after(() => reconciliarAlertaContratoFinal(supabase, processoId));
      revalidatePath(`/processos/${processoId}`);
      revalidatePath("/vendas");
  revalidatePath("/painel-sacra");
      revalidatePath("/financiamentos");
    }
  }
}

export async function reabrirEtapa(formData: FormData) {
  if (!(await exigirUsuario())) return;
  const supabase = await createClient();
  const etapaId = String(formData.get("etapa_id") ?? "");
  const processoId = String(formData.get("processo_id") ?? "");

  await checar(supabase
    .from("etapas")
    .update({ status: "pendente", data_realizada: null })
    .eq("id", etapaId), "atualizar");

  // Se o processo já tinha sido dado como concluído, reabrir uma
  // etapa desfaz isso — volta a aparecer na lista principal.
  const { data: processoAtual } = await supabase
    .from("processos")
    .select("status")
    .eq("id", processoId)
    .single();

  if (processoAtual?.status === "concluido") {
    await checar(supabase.from("processos").update({ status: "ativo" }).eq("id", processoId), "atualizar");
    after(() => reconciliarAlertaContratoFinal(supabase, processoId));
    revalidatePath("/vendas");
  revalidatePath("/painel-sacra");
      revalidatePath("/financiamentos");
  }

  after(() => reconciliarAgendaProcesso(supabase, processoId));

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/");
  revalidatePath("/calendario");
}

export async function salvarDatasContrato(formData: FormData) {
  if (!(await exigirUsuario())) return;
  const supabase = await createClient();
  const processoId = String(formData.get("processo_id") ?? "");
  const dataAssinatura = String(formData.get("data_assinatura") ?? "");
  const dataFinalContrato = String(formData.get("data_final_contrato") ?? "");

  await checar(supabase
    .from("processos")
    .update({
      data_assinatura: dataAssinatura || null,
      data_final_contrato: dataFinalContrato || null,
    })
    .eq("id", processoId), "atualizar");

  after(() => reconciliarAlertaContratoFinal(supabase, processoId));

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/vendas");
  revalidatePath("/painel-sacra");
  revalidatePath("/financiamentos");
}

export async function alterarDataPrevista(formData: FormData) {
  if (!(await exigirUsuario())) return;
  const supabase = await createClient();
  const etapaId = String(formData.get("etapa_id") ?? "");
  const processoId = String(formData.get("processo_id") ?? "");
  const novaData = String(formData.get("data_prevista") ?? "");

  await checar(supabase.from("etapas").update({ data_prevista: novaData || null }).eq("id", etapaId), "atualizar");

  after(() => reconciliarAgendaProcesso(supabase, processoId));

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/");
  revalidatePath("/calendario");
}

export async function salvarNumeroRegistro(formData: FormData) {
  if (!(await exigirUsuario())) return;
  const supabase = await createClient();
  const etapaId = String(formData.get("etapa_id") ?? "");
  const processoId = String(formData.get("processo_id") ?? "");
  const numeroRegistro = String(formData.get("numero_registro") ?? "").trim() || null;

  await checar(supabase.from("etapas").update({ numero_registro: numeroRegistro }).eq("id", etapaId), "atualizar");

  revalidatePath(`/processos/${processoId}`);
}

export async function salvarEnderecoImovel(formData: FormData) {
  if (!(await exigirUsuario())) return;
  const supabase = await createClient();
  const imovelId = String(formData.get("imovel_id") ?? "");
  const processoId = String(formData.get("processo_id") ?? "");
  const endereco = String(formData.get("endereco") ?? "").trim();

  if (!imovelId || !endereco) return;

  await checar(supabase.from("imoveis").update({ endereco }).eq("id", imovelId), "atualizar");

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/vendas");
  revalidatePath("/painel-sacra");
  revalidatePath("/financiamentos");
  revalidatePath("/");
}

export async function salvarCodigoSanProcesso(formData: FormData) {
  if (!(await exigirUsuario())) return;
  const supabase = await createClient();
  const processoId = String(formData.get("processo_id") ?? "");
  const codigoSan = String(formData.get("codigo_san") ?? "").trim() || null;

  if (!processoId) return;

  await checar(supabase.from("processos").update({ codigo_san: codigoSan }).eq("id", processoId), "atualizar");

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/vendas");
  revalidatePath("/painel-sacra");
  revalidatePath("/financiamentos");
}

export async function salvarNumeroPropostaContratoProcesso(formData: FormData) {
  const sessao = await exigirUsuario();
  if (!sessao) return;
  const processoId = String(formData.get("processo_id") ?? "");
  const numero = String(formData.get("numero_proposta_contrato") ?? "").trim();
  if (!processoId) return;
  if (numero.length > 120) {
    await avisar("erro", "O número da proposta/contrato deve ter até 120 caracteres.");
    return;
  }
  const supabase = await createClient();
  const salvo = await checar(supabase.from("processos").update({ numero_proposta_contrato: numero || null }).eq("id", processoId).eq("tenant_id", sessao.tenantId).eq("categoria", "financiamento").select("id").single(), "atualizar o número da proposta/contrato");
  if (!salvo) return;
  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/financiamentos");
}

export async function salvarDadosProcesso(formData: FormData) {
  if (!(await exigirUsuario())) return;
  const supabase = await createClient();
  const processoId = String(formData.get("processo_id") ?? "");
  if (!processoId) return;

  const { data: existente } = await supabase
    .from("processos")
    .select("tenant_id, categoria, comprador_id, vendedor_id, imovel_id")
    .eq("id", processoId)
    .single();

  if (!existente) return;
  const tenantId = existente.tenant_id as string;
  const ehFinanciamento = existente.categoria === "financiamento";

  const campo = (nome: string) => String(formData.get(nome) ?? "").trim() || null;

  // Comprador
  const compradorNome = campo("comprador_nome");
  if (compradorNome && existente.comprador_id) {
    await checar(supabase
      .from("clientes")
      .update({ nome: compradorNome, telefone: campo("comprador_telefone") })
      .eq("id", existente.comprador_id), "atualizar");
  }

  // Vendedor (só faz sentido em venda)
  const vendedorNome = campo("vendedor_nome");
  if (!ehFinanciamento && vendedorNome && existente.vendedor_id) {
    await checar(supabase
      .from("clientes")
      .update({ nome: vendedorNome, telefone: campo("vendedor_telefone") })
      .eq("id", existente.vendedor_id), "atualizar");
  }

  // Imóvel
  const enderecoImovel = campo("imovel_endereco");
  if (enderecoImovel && existente.imovel_id) {
    await checar(supabase.from("imoveis").update({ endereco: enderecoImovel }).eq("id", existente.imovel_id), "atualizar");
  }

  // Banco / Corretor / Indicação — resolve por nome (cria se não existir)
  const bancoId = await resolverOuCriar(supabase, "bancos", "nome", tenantId, campo("banco_nome") ?? "");
  const corretorId = await resolverOuCriar(supabase, "corretores", "nome", tenantId, campo("corretor_nome") ?? "");
  const indicacaoId = ehFinanciamento
    ? await resolverOuCriar(supabase, "corretores", "nome", tenantId, campo("indicacao_nome") ?? "")
    : null;

  // Responsável — resolve por nome contra os usuários do tenant
  let responsavelId: string | null = null;
  const responsavelNome = campo("responsavel_nome");
  if (responsavelNome) {
    const { data: usuarioEncontrado } = await supabase
      .from("usuarios")
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike("nome", responsavelNome)
      .limit(1)
      .maybeSingle();
    responsavelId = usuarioEncontrado?.id ?? null;
  }

  const dadosProcesso: TablesUpdate<"processos"> = {
    codigo_san: campo("codigo_san"),
    valor_total: formData.get("valor_total") ? Number(formData.get("valor_total")) : null,
    data_assinatura: campo("data_assinatura"),
    data_final_contrato: campo("data_final_contrato"),
  };
  if (existente.categoria === "venda" && formData.has("captador_nome")) {
    dadosProcesso.participacao_vgv_revisada = true;
    dadosProcesso.captador_id = await resolverOuCriar(supabase, "corretores", "nome", tenantId, campo("captador_nome") ?? "");
  }
  if (bancoId) dadosProcesso.banco_id = bancoId;
  if (corretorId) dadosProcesso.corretor_id = corretorId;
  if (responsavelId) dadosProcesso.responsavel_id = responsavelId;
  if (ehFinanciamento) {
    if (formData.has("numero_proposta_contrato")) dadosProcesso.numero_proposta_contrato = campo("numero_proposta_contrato");
    if (indicacaoId) dadosProcesso.indicacao_id = indicacaoId;
    dadosProcesso.valor_financiado = formData.get("valor_financiado")
      ? Number(formData.get("valor_financiado"))
      : null;
    dadosProcesso.origem = campo("origem");
  }

  await checar(supabase.from("processos").update(dadosProcesso).eq("id", processoId), "atualizar");

  after(() => reconciliarAgendaProcesso(supabase, processoId));
  after(() => reconciliarAlertaContratoFinal(supabase, processoId));

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/vendas");
  revalidatePath("/painel-sacra");
  revalidatePath("/financiamentos");
  revalidatePath("/");
}

export async function alternarChecklistItem(formData: FormData) {
  const supabase = await createClient();
  const sessao = await exigirUsuario();
  if (!sessao) return;
  const { user } = sessao;

  const itemId = String(formData.get("item_id") ?? "");
  const processoId = String(formData.get("processo_id") ?? "");
  const concluidoAtual = formData.get("concluido_atual") === "true";

  await checar(supabase
    .from("checklist_itens")
    .update({
      concluido: !concluidoAtual,
      concluido_por: !concluidoAtual ? (user?.id ?? null) : null,
      concluido_em: !concluidoAtual ? new Date().toISOString() : null,
    })
    .eq("id", itemId), "atualizar");

  revalidatePath(`/processos/${processoId}`);
}

export async function alternarEtapaPadrao(formData: FormData) {
  const supabase = await createClient();
  const sessao = await exigirUsuario();
  if (!sessao) return;
  const { user } = sessao;

  const processoId = String(formData.get("processo_id") ?? "");
  const nome = String(formData.get("nome") ?? "");
  const ordemCatalogo = Number(formData.get("ordem") ?? "0");
  const aplicada = formData.get("aplicada") === "true";
  const etapaId = String(formData.get("etapa_id") ?? "") || null;

  if (aplicada && etapaId) {
    // já existe -> remove (destrava a etapa desse processo)
    await removerEventosDeEtapas(supabase, [etapaId]);
    await checar(supabase.from("etapas").delete().eq("id", etapaId), "excluir");
  } else if (!aplicada) {
    await checar(supabase.from("etapas").insert({
      processo_id: processoId,
      nome,
      responsavel_id: user?.id ?? null,
      status: "pendente",
      ordem: ordemCatalogo,
      especial: true,
    }), "salvar");
  }

  after(() => reconciliarAgendaProcesso(supabase, processoId));

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/");
  revalidatePath("/calendario");
}

export async function salvarComissao(formData: FormData) {
  if (!(await exigirUsuario())) return;
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
    await checar(supabase.from("comissoes").update(campos).eq("id", comissaoId), "atualizar");
  } else {
    await checar(supabase.from("comissoes").insert({ processo_id: processoId, ...campos }), "salvar");
  }

  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/minhas-vendas");
  revalidatePath(`/minhas-vendas/${processoId}`);
}

export async function adicionarComentario(formData: FormData) {
  const supabase = await createClient();
  const sessao = await exigirUsuario();
  if (!sessao) return;
  const { user } = sessao;

  const processoId = String(formData.get("processo_id") ?? "");
  const etapaId = String(formData.get("etapa_id") ?? "") || null;
  const texto = String(formData.get("texto") ?? "").trim();

  if (!texto) return;

  await checar(supabase.from("comentarios").insert({
    processo_id: processoId,
    etapa_id: etapaId,
    usuario_id: user.id,
    texto,
  }), "salvar");

  revalidatePath(`/processos/${processoId}`);
}
