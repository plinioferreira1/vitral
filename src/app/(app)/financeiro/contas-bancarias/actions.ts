"use server";

import { checar } from "@/lib/aviso";
import { moedaParaNumero } from "@/lib/moeda";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario, GESTORES } from "@/lib/usuario-atual";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function contexto() {
  const supabase = await createClient();
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return null;
  return { supabase, tenantId: sessao.tenantId };
}

const campo = (formData: FormData, nome: string) => String(formData.get(nome) ?? "").trim() || null;

export async function criarContaBancaria(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const { supabase, tenantId } = ctx;
  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  const salvou = await checar(
    supabase.from("financeiro_contas_bancarias").insert({
      tenant_id: tenantId,
      nome,
      banco: campo(formData, "banco"),
      agencia: campo(formData, "agencia"),
      numero_conta: campo(formData, "numero_conta"),
      titular: campo(formData, "titular"),
      tipo: String(formData.get("tipo") ?? "corrente"),
      saldo_inicial: moedaParaNumero(formData.get("saldo_inicial")),
      data_abertura: campo(formData, "data_abertura"),
    }),
    "salvar"
  );
  if (!salvou) return;

  revalidatePath("/financeiro/contas-bancarias");
  revalidatePath("/financeiro");
}

export async function editarContaBancaria(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const { supabase, tenantId } = ctx;

  const id = String(formData.get("id") ?? "");
  const nome = String(formData.get("nome") ?? "").trim();
  if (!id || !nome) return;

  const atualizou = await checar(
    supabase
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
      .eq("tenant_id", tenantId),
    "atualizar"
  );
  if (!atualizou) return;

  revalidatePath("/financeiro/contas-bancarias");
  revalidatePath("/financeiro");
  redirect("/financeiro/contas-bancarias");
}

export async function criarContasPadrao() {
  const ctx = await contexto();
  if (!ctx) return;
  const { supabase, tenantId } = ctx;

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
    const salvou = await checar(supabase.from("financeiro_contas_bancarias").insert(novas), "salvar");
    if (!salvou) return;
  }

  revalidatePath("/financeiro/contas-bancarias");
  revalidatePath("/financeiro");
}

export async function arquivarContaBancaria(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await checar(
    ctx.supabase.from("financeiro_contas_bancarias").update({ ativa: false }).eq("id", id),
    "atualizar"
  );
  revalidatePath("/financeiro/contas-bancarias");
  revalidatePath("/financeiro");
}
