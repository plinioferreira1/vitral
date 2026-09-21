"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { objetoParcial, objetoVazio } from "@/lib/objeto-parcial";

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

function condicoesDoFormulario(formData: FormData): { descricao: string; valor: number | null; ordem: number }[] {
  const condicoes: { descricao: string; valor: number | null; ordem: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const descricao = String(formData.get(`condicao_descricao_${i}`) ?? "").trim();
    const valorRaw = formData.get(`condicao_valor_${i}`);
    if (!descricao) continue;
    condicoes.push({
      descricao,
      valor: valorRaw ? Number(valorRaw) : null,
      ordem: i,
    });
  }
  return condicoes;
}

export async function criarCartaProposta(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", user?.id ?? "")
    .single();

  if (!usuario?.tenant_id) return;
  const tenantId = usuario.tenant_id;

  const campo = (nome: string) => String(formData.get(nome) ?? "").trim() || null;

  const imovelId = await resolverOuCriar(supabase, "imoveis", "endereco", tenantId, campo("imovel") ?? "");
  const proponenteId = await resolverOuCriar(
    supabase,
    "clientes",
    "nome",
    tenantId,
    campo("proponente_nome") ?? ""
  );

  if (!imovelId || !proponenteId) return;

  const dadosProponente = objetoParcial({ cpf_cnpj: campo("proponente_cpf") });
  if (!objetoVazio(dadosProponente)) {
    await supabase.from("clientes").update(dadosProponente).eq("id", proponenteId);
  }

  let segundoProponenteId: string | null = null;
  const segundoNome = campo("segundo_proponente_nome");
  if (segundoNome) {
    segundoProponenteId = await resolverOuCriar(supabase, "clientes", "nome", tenantId, segundoNome);
    if (segundoProponenteId) {
      const dadosSegundo = objetoParcial({ cpf_cnpj: campo("segundo_proponente_cpf") });
      if (!objetoVazio(dadosSegundo)) {
        await supabase.from("clientes").update(dadosSegundo).eq("id", segundoProponenteId);
      }
    }
  }

  const valorTotal = formData.get("valor_total");
  const prazoDiasValidade = formData.get("prazo_dias_validade");
  const observacoes = campo("observacoes");
  const codigoSan = campo("codigo_san");

  const { data: proposta, error } = await supabase
    .from("cartas_proposta")
    .insert({
      tenant_id: tenantId,
      imovel_id: imovelId,
      proponente_id: proponenteId,
      segundo_proponente_id: segundoProponenteId,
      valor_total: valorTotal ? Number(valorTotal) : null,
      prazo_dias_validade: prazoDiasValidade ? Number(prazoDiasValidade) : 5,
      observacoes,
      codigo_san: codigoSan,
      criado_por: user?.id ?? null,
      responsavel_id: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !proposta) return;

  const condicoes = condicoesDoFormulario(formData);
  if (condicoes.length > 0) {
    await supabase
      .from("carta_proposta_condicoes")
      .insert(condicoes.map((c) => ({ ...c, carta_proposta_id: proposta.id })));
  }

  const signatarios = [{ nome_esperado: "Proponente 1", ordem: 1 }];
  if (segundoProponenteId) {
    signatarios.push({ nome_esperado: "Proponente 2", ordem: 2 });
  }
  await supabase
    .from("carta_proposta_signatarios")
    .insert(signatarios.map((s) => ({ ...s, carta_proposta_id: proposta.id })));

  redirect(`/propostas/${proposta.id}`);
}

export async function atualizarCartaProposta(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data: existente } = await supabase
    .from("cartas_proposta")
    .select("id, status, imovel_id, proponente_id, segundo_proponente_id, tenant_id")
    .eq("id", id)
    .single();

  if (!existente || existente.status !== "pendente") return;

  const campo = (nome: string) => String(formData.get(nome) ?? "").trim() || null;

  const dadosProponente = objetoParcial({
    nome: campo("proponente_nome"),
    cpf_cnpj: campo("proponente_cpf"),
  });
  if (!objetoVazio(dadosProponente)) {
    await supabase.from("clientes").update(dadosProponente).eq("id", existente.proponente_id);
  }

  const dadosImovel = objetoParcial({ endereco: campo("imovel") });
  if (!objetoVazio(dadosImovel)) {
    await supabase.from("imoveis").update(dadosImovel).eq("id", existente.imovel_id);
  }

  let segundoProponenteId = existente.segundo_proponente_id as string | null;
  const segundoNome = campo("segundo_proponente_nome");
  if (segundoNome) {
    if (!segundoProponenteId) {
      segundoProponenteId = await resolverOuCriar(
        supabase,
        "clientes",
        "nome",
        existente.tenant_id,
        segundoNome
      );
    }
    if (segundoProponenteId) {
      const dadosSegundo = objetoParcial({
        nome: segundoNome,
        cpf_cnpj: campo("segundo_proponente_cpf"),
      });
      if (!objetoVazio(dadosSegundo)) {
        await supabase.from("clientes").update(dadosSegundo).eq("id", segundoProponenteId);
      }
    }
  } else {
    segundoProponenteId = null;
  }

  const valorTotal = formData.get("valor_total");
  const prazoDiasValidade = formData.get("prazo_dias_validade");
  const observacoes = campo("observacoes");
  const codigoSan = campo("codigo_san");

  await supabase
    .from("cartas_proposta")
    .update({
      segundo_proponente_id: segundoProponenteId,
      valor_total: valorTotal ? Number(valorTotal) : null,
      prazo_dias_validade: prazoDiasValidade ? Number(prazoDiasValidade) : 5,
      observacoes,
      codigo_san: codigoSan,
    })
    .eq("id", id);

  await supabase.from("carta_proposta_condicoes").delete().eq("carta_proposta_id", id);
  const condicoes = condicoesDoFormulario(formData);
  if (condicoes.length > 0) {
    await supabase
      .from("carta_proposta_condicoes")
      .insert(condicoes.map((c) => ({ ...c, carta_proposta_id: id })));
  }

  const querSegundo = !!segundoProponenteId;
  const { data: signatarios } = await supabase
    .from("carta_proposta_signatarios")
    .select("id, ordem, assinado_em")
    .eq("carta_proposta_id", id);
  const signatario2 = (signatarios ?? []).find((s) => s.ordem === 2);

  if (querSegundo && !signatario2) {
    await supabase
      .from("carta_proposta_signatarios")
      .insert({ carta_proposta_id: id, nome_esperado: "Proponente 2", ordem: 2 });
  } else if (!querSegundo && signatario2 && !signatario2.assinado_em) {
    await supabase.from("carta_proposta_signatarios").delete().eq("id", signatario2.id);
  }

  revalidatePath(`/propostas/${id}`);
  revalidatePath("/propostas");
  redirect(`/propostas/${id}`);
}

export async function cancelarCartaProposta(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("cartas_proposta").update({ status: "cancelado" }).eq("id", id);

  revalidatePath(`/propostas/${id}`);
  revalidatePath("/propostas");
}

export async function salvarResponsavelCartaProposta(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const responsavelId = String(formData.get("responsavel_id") ?? "").trim() || null;
  if (!id) return;

  await supabase.from("cartas_proposta").update({ responsavel_id: responsavelId }).eq("id", id);

  revalidatePath(`/propostas/${id}`);
  revalidatePath("/propostas");
}
