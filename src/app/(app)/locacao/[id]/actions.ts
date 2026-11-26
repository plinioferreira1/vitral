"use server";

import { exigirUsuario } from "@/lib/usuario-atual";
import { dadosGarantia } from "@/lib/locacao/garantias";

import { checar } from "@/lib/aviso";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { StatusContaLocacao } from "@/lib/types";
import { hojeISO } from "@/lib/data-br";
import type { SupabaseClient } from "@supabase/supabase-js";
import { valorDaLista } from "@/lib/validacao";

const PROXIMO_STATUS: Record<StatusContaLocacao, StatusContaLocacao> = {
  nao_aplicavel: "pago",
  pendente: "pago",
  pago: "nao_aplicavel",
};

export async function alternarStatusConta(formData: FormData) {
  if (!(await exigirUsuario())) return;
  const supabase = await createClient();

  const contratoId = String(formData.get("contrato_id") ?? "");
  const tipo = valorDaLista("tipo_conta_locacao", formData.get("tipo"));
  const competencia = String(formData.get("competencia") ?? "");
  const statusAtual = String(formData.get("status_atual") ?? "nao_aplicavel") as StatusContaLocacao;
  const contaId = String(formData.get("conta_id") ?? "") || null;

  const proximoStatus = PROXIMO_STATUS[statusAtual];

  if (contaId) {
    await checar(supabase.from("contas_locacao").update({ status: proximoStatus }).eq("id", contaId), "atualizar");
  } else {
    // Vencimento padrão: dia 15 do mês de competência (mesma regra já
    // usada pro resto da base). Sem isso, a conta cai como "atrasada"
    // a partir do dia 2 do mês (a urgência usa a competência como
    // fallback quando não há vencimento).
    if (!tipo) return; // tipo de conta inválido — não grava nada
    const vencimentoPadrao = `${competencia.slice(0, 7)}-15`;
    await checar(supabase.from("contas_locacao").insert({
      contrato_id: contratoId,
      tipo,
      competencia,
      status: proximoStatus,
      vencimento: vencimentoPadrao,
    }), "salvar");
  }

  revalidatePath(`/locacao/${contratoId}`);
  revalidatePath("/locacao");
}

export async function atualizarDetalhesConta(formData: FormData) {
  if (!(await exigirUsuario())) return;
  const supabase = await createClient();
  const contaId = String(formData.get("conta_id") ?? "");
  const contratoId = String(formData.get("contrato_id") ?? "");
  const valor = String(formData.get("valor") ?? "");
  const vencimento = String(formData.get("vencimento") ?? "");

  await checar(supabase
    .from("contas_locacao")
    .update({
      valor: valor ? Number(valor) : null,
      vencimento: vencimento || null,
    })
    .eq("id", contaId), "atualizar");

  revalidatePath(`/locacao/${contratoId}`);
}

/**
 * Acha um cliente pelo nome (sem diferenciar maiúsculas); se não
 * existir, cria na hora. Permite digitar um nome novo direto no
 * formulário em vez de precisar de um cadastro prévio.
 */
async function resolverOuCriarCliente(
  supabase: SupabaseClient,
  tenantId: string,
  nomeDigitado: string
): Promise<string | null> {
  const nome = nomeDigitado.trim();
  if (!nome) return null;

  const { data: existente } = await supabase
    .from("clientes")
    .select("id")
    .eq("tenant_id", tenantId)
    .ilike("nome", nome)
    .limit(1)
    .maybeSingle();

  if (existente) return existente.id;

  const { data: criado } = await supabase
    .from("clientes")
    .insert({ tenant_id: tenantId, nome })
    .select("id")
    .single();

  return criado?.id ?? null;
}

export async function atualizarContrato(formData: FormData) {
  if (!(await exigirUsuario())) return;
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

  const { data: contratoAtual } = await supabase
    .from("contratos_locacao")
    .select("tenant_id, imovel_id")
    .eq("id", id)
    .single();

  if (!contratoAtual) return;

  const locadorNome = String(formData.get("locador_nome") ?? "");
  const locatarioNome = String(formData.get("locatario_nome") ?? "");

  const locadorId = await resolverOuCriarCliente(supabase, contratoAtual.tenant_id, locadorNome);
  const locatarioId = await resolverOuCriarCliente(supabase, contratoAtual.tenant_id, locatarioNome);

  const cepInformado = String(formData.get("imovel_cep")??"").trim();
  if (cepInformado && !/^\d{5}-?\d{3}$/.test(cepInformado)) throw new Error("CEP inválido. Informe 00000-000.");
  const dataInicio = String(formData.get("vigencia_inicio")??"");
  const dataFim = String(formData.get("vigencia_fim")??"");
  if(dataInicio && dataFim && dataFim<dataInicio) throw new Error("A data final da vigência não pode ser anterior ao início.");
  const vencimentoInformado=Number(formData.get("aluguel_dia_vencimento")??0);
  if(vencimentoInformado && (!Number.isInteger(vencimentoInformado)||vencimentoInformado<1||vencimentoInformado>31))
    throw new Error("Dia de vencimento inválido.");
  const campos = {
    numero: String(formData.get("numero") ?? "").trim(),
    locador_id: locadorId,
    locatario_id: locatarioId,
    emite_nf: formData.get("emite_nf") === "on",
    iptu_inscricao: String(formData.get("iptu_inscricao") ?? "").trim() || null,
    vigencia_inicio: String(formData.get("vigencia_inicio") ?? "") || null,
    vigencia_fim: String(formData.get("vigencia_fim") ?? "") || null,
    aluguel_valor: formData.get("aluguel_valor") ? Number(formData.get("aluguel_valor")) : null,
    aluguel_dia_vencimento: formData.get("aluguel_dia_vencimento") ? Number(formData.get("aluguel_dia_vencimento")) : null,
    primeiro_aluguel_vencimento: String(formData.get("primeiro_aluguel_vencimento") ?? "") || null,
    desconto_pontualidade: formData.get("desconto_pontualidade") ? Number(formData.get("desconto_pontualidade")) : null,
    ...dadosGarantia(formData.get("garantia_locaticia"), formData.get("caucao_valor")),
    documento_origem_url: String(formData.get("documento_origem_url") ?? "").trim() || null,
    condominio_nome: String(formData.get("condominio_nome") ?? "").trim() || null,
    condominio_unidade: String(formData.get("condominio_unidade") ?? "").trim() || null,
    condominio_bloco: String(formData.get("condominio_bloco") ?? "").trim() || null,

    iptu_tipo: valorDaLista("tipo_iptu_locacao", formData.get("iptu_tipo")),
    condominio_administradora: String(formData.get("condominio_administradora") ?? "").trim() || null,
    condominio_contato: String(formData.get("condominio_contato") ?? "").trim() || null,
    portal_administradora_url: String(formData.get("portal_administradora_url") ?? "").trim() || null,
    portal_administradora_login: String(formData.get("portal_administradora_login") ?? "").trim() || null,
    agua_inscricao: String(formData.get("agua_inscricao") ?? "").trim() || null,
    luz_codigo_cliente: String(formData.get("luz_codigo_cliente") ?? "").trim() || null,
    responsavel_iptu: valorDaLista("responsavel_pagamento_locacao", formData.get("responsavel_iptu")),
    responsavel_condominio: valorDaLista("responsavel_pagamento_locacao", formData.get("responsavel_condominio")),
    responsavel_agua: valorDaLista("responsavel_pagamento_locacao", formData.get("responsavel_agua")),
    responsavel_luz: valorDaLista("responsavel_pagamento_locacao", formData.get("responsavel_luz")),
    responsavel_gas: valorDaLista("responsavel_pagamento_locacao", formData.get("responsavel_gas")),
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  };

  await checar(supabase.from("contratos_locacao").update(campos).eq("id", id), "atualizar");
  // O endereço/CEP são atributos do imóvel e alimentam as consultas condominiais.
  if (contratoAtual.imovel_id) {
    const novoEndereco = String(formData.get("imovel_endereco")??"").trim();
    const novoCep = String(formData.get("imovel_cep")??"").trim();
    if (novoEndereco) {
      await checar(supabase.from("imoveis").update({
        endereco:novoEndereco,
        cep:novoCep ? novoCep.replace(/^(\d{5})(\d{3})$/,"$1-$2") : null,
        ...(campos.iptu_inscricao ? {inscricao_iptu:campos.iptu_inscricao}:{}),
      }).eq("id",contratoAtual.imovel_id).eq("tenant_id",contratoAtual.tenant_id),"atualizar");
    }
  }
  revalidatePath(`/locacao/${id}`);
  revalidatePath("/locacao");
  revalidatePath("/locacao/debitos");
  redirect(`/locacao/${id}?salvo=1`);
}

export async function encerrarContrato(formData: FormData) {
  if (!(await exigirUsuario())) return;
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

  await checar(supabase
    .from("contratos_locacao")
    .update({ ativo: false, data_encerramento: hojeISO() })
    .eq("id", id), "atualizar");

  revalidatePath(`/locacao/${id}`);
  revalidatePath("/locacao");
  redirect("/locacao");
}

export async function reativarContrato(formData: FormData) {
  if (!(await exigirUsuario())) return;
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

  await checar(supabase
    .from("contratos_locacao")
    .update({ ativo: true, data_encerramento: null })
    .eq("id", id), "atualizar");

  revalidatePath(`/locacao/${id}`);
  revalidatePath("/locacao");
}
