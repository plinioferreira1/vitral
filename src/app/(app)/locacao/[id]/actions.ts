"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { StatusContaLocacao } from "@/lib/types";

const PROXIMO_STATUS: Record<StatusContaLocacao, StatusContaLocacao> = {
  nao_aplicavel: "pendente",
  pendente: "pago",
  pago: "nao_aplicavel",
};

export async function alternarStatusConta(formData: FormData) {
  const supabase = await createClient();

  const contratoId = String(formData.get("contrato_id") ?? "");
  const tipo = String(formData.get("tipo") ?? "");
  const competencia = String(formData.get("competencia") ?? "");
  const statusAtual = String(formData.get("status_atual") ?? "nao_aplicavel") as StatusContaLocacao;
  const contaId = String(formData.get("conta_id") ?? "") || null;

  const proximoStatus = PROXIMO_STATUS[statusAtual];

  if (contaId) {
    await supabase.from("contas_locacao").update({ status: proximoStatus }).eq("id", contaId);
  } else {
    await supabase.from("contas_locacao").insert({
      contrato_id: contratoId,
      tipo,
      competencia,
      status: proximoStatus,
    });
  }

  revalidatePath(`/locacao/${contratoId}`);
  revalidatePath("/locacao");
}

export async function atualizarDetalhesConta(formData: FormData) {
  const supabase = await createClient();
  const contaId = String(formData.get("conta_id") ?? "");
  const contratoId = String(formData.get("contrato_id") ?? "");
  const valor = String(formData.get("valor") ?? "");
  const vencimento = String(formData.get("vencimento") ?? "");

  await supabase
    .from("contas_locacao")
    .update({
      valor: valor ? Number(valor) : null,
      vencimento: vencimento || null,
    })
    .eq("id", contaId);

  revalidatePath(`/locacao/${contratoId}`);
}

export async function atualizarContrato(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

  const campos = {
    numero: String(formData.get("numero") ?? "").trim(),
    locador_id: String(formData.get("locador_id") ?? "") || null,
    locatario_id: String(formData.get("locatario_id") ?? "") || null,
    emite_nf: formData.get("emite_nf") === "on",
    iptu_inscricao: String(formData.get("iptu_inscricao") ?? "").trim() || null,
    iptu_tipo: String(formData.get("iptu_tipo") ?? "") || null,
    condominio_administradora: String(formData.get("condominio_administradora") ?? "").trim() || null,
    condominio_contato: String(formData.get("condominio_contato") ?? "").trim() || null,
    agua_inscricao: String(formData.get("agua_inscricao") ?? "").trim() || null,
    agua_codigo_cliente: String(formData.get("agua_codigo_cliente") ?? "").trim() || null,
    responsavel_iptu: String(formData.get("responsavel_iptu") ?? "") || null,
    responsavel_condominio: String(formData.get("responsavel_condominio") ?? "") || null,
    responsavel_agua: String(formData.get("responsavel_agua") ?? "") || null,
    responsavel_luz: String(formData.get("responsavel_luz") ?? "") || null,
    responsavel_gas: String(formData.get("responsavel_gas") ?? "") || null,
    ativo: formData.get("ativo") === "on",
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  };

  await supabase.from("contratos_locacao").update(campos).eq("id", id);
  revalidatePath(`/locacao/${id}`);
}
