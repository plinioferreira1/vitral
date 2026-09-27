"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { moedaParaNumero } from "@/lib/moeda";

async function contexto() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", user?.id ?? "")
    .single();
  return { supabase, tenantId: usuario?.tenant_id ?? null };
}

const campo = (formData: FormData, nome: string) => String(formData.get(nome) ?? "").trim() || null;

export async function criarContaBancaria(formData: FormData) {
  const { supabase, tenantId } = await contexto();
  if (!tenantId) return;
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  await supabase.from("financeiro_contas_bancarias").insert({
    tenant_id: tenantId,
    nome,
    banco: campo(formData, "banco"),
    agencia: campo(formData, "agencia"),
    numero_conta: campo(formData, "numero_conta"),
    titular: campo(formData, "titular"),
    tipo: String(formData.get("tipo") ?? "corrente"),
    saldo_inicial: moedaParaNumero(formData.get("saldo_inicial")),
    data_abertura: campo(formData, "data_abertura"),
  });

  revalidatePath("/financeiro/contas-bancarias");
  revalidatePath("/financeiro");
}

export async function editarContaBancaria(formData: FormData) {
  const { supabase, tenantId } = await contexto();
  if (!tenantId) return;

  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!id || !nome) return;

  await supabase
    .from("financeiro_contas_bancarias")
    .update({
      nome,
      banco: campo(formData, "banco"),
      agencia: campo(formData, "agencia"),
      numero_conta: campo(formData, "numero_conta"),
      titular: campo(formData, "titular"),
      tipo: String(formData.get("tipo") ?? "corrente"),
      saldo_inicial: moedaParaNumero(formData.get("saldo_inicial")),
      data_abertura: campo(formData, "data_abertura"),
      ativa: formData.get("ativa") === "on",
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  revalidatePath("/financeiro/contas-bancarias");
  revalidatePath("/financeiro");
  redirect("/financeiro/contas-bancarias");
}

export async function criarContasPadrao() {
  const { supabase, tenantId } = await contexto();
  if (!tenantId) return;

  const { data: existentes } = await supabase
    .from("financeiro_contas_bancarias")
    .select("nome, banco")
    .eq("tenant_id", tenantId);

  const textoExistente = (existentes ?? []).map((c) => `${c.nome} ${c.banco ?? ""}`.toLowerCase()).join(" ");
  const novas = [];

  if (!textoExistente.includes("caixa")) {
    novas.push({
      tenant_id: tenantId,
      nome: "Caixa",
      banco: "Caixa",
      tipo: "corrente",
      saldo_inicial: 0,
      ativa: true,
    });
  }

  if (!textoExistente.includes("banco do brasil") && !/\bbb\b/.test(textoExistente)) {
    novas.push({
      tenant_id: tenantId,
      nome: "Banco do Brasil",
      banco: "Banco do Brasil",
      tipo: "corrente",
      saldo_inicial: 0,
      ativa: true,
    });
  }

  if (novas.length > 0) {
    await supabase.from("financeiro_contas_bancarias").insert(novas);
  }

  revalidatePath("/financeiro/contas-bancarias");
  revalidatePath("/financeiro");
}

export async function arquivarContaBancaria(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("financeiro_contas_bancarias").update({ ativa: false }).eq("id", id);
  revalidatePath("/financeiro/contas-bancarias");
  revalidatePath("/financeiro");
}
