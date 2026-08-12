"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { foroPorRegiaoAdministrativa } from "@/lib/circunscricoes-df";
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

export async function criarAutorizacao(formData: FormData) {
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
  const vendedorId = await resolverOuCriar(
    supabase,
    "clientes",
    "nome",
    tenantId,
    campo("vendedor_nome") ?? ""
  );

  if (!imovelId || !vendedorId) return;

  // Atualiza os dados complementares do proprietário e do imóvel
  // (o resolverOuCriar só preenche o nome/endereço na criação; os
  // demais campos do formulário são salvos aqui, sempre que
  // informados).
  const dadosVendedor = objetoParcial({
    cpf_cnpj: campo("vendedor_cpf"),
    rg: campo("vendedor_rg"),
    telefone: campo("vendedor_telefone"),
    endereco: campo("vendedor_endereco"),
  });
  if (!objetoVazio(dadosVendedor)) {
    await supabase.from("clientes").update(dadosVendedor).eq("id", vendedorId);
  }

  const regiaoAdministrativa = campo("regiao_administrativa");

  const dadosImovel = objetoParcial({
    cep: campo("cep"),
    matricula: campo("matricula"),
    area_construida: campo("area_construida"),
    area_lote: campo("area_lote"),
    inscricao_iptu: campo("inscricao_iptu"),
    valor_condominio: formData.get("valor_condominio") ? Number(formData.get("valor_condominio")) : null,
    regiao_administrativa: regiaoAdministrativa,
  });
  if (!objetoVazio(dadosImovel)) {
    await supabase.from("imoveis").update(dadosImovel).eq("id", imovelId);
  }

  let conjugeId: string | null = null;
  const conjugeNome = campo("conjuge_nome");
  if (conjugeNome) {
    conjugeId = await resolverOuCriar(supabase, "clientes", "nome", tenantId, conjugeNome);
    if (conjugeId) {
      const dadosConjuge = objetoParcial({
        cpf_cnpj: campo("conjuge_cpf"),
        rg: campo("conjuge_rg"),
        telefone: campo("conjuge_telefone"),
        endereco: campo("conjuge_endereco"),
      });
      if (!objetoVazio(dadosConjuge)) {
        await supabase.from("clientes").update(dadosConjuge).eq("id", conjugeId);
      }
    }
  }

  const valorImovel = formData.get("valor_imovel");
  const comissaoPercentual = formData.get("comissao_percentual");
  const prazoDias = formData.get("prazo_dias");
  const exclusividade = formData.get("exclusividade") === "on";
  const observacoes = campo("observacoes");
  const foro = foroPorRegiaoAdministrativa(regiaoAdministrativa ?? "");

  const { data: autorizacao, error } = await supabase
    .from("autorizacoes_venda")
    .insert({
      tenant_id: tenantId,
      imovel_id: imovelId,
      vendedor_id: vendedorId,
      conjuge_id: conjugeId,
      valor_imovel: valorImovel ? Number(valorImovel) : null,
      comissao_percentual: comissaoPercentual ? Number(comissaoPercentual) : null,
      prazo_dias: prazoDias ? Number(prazoDias) : null,
      exclusividade,
      observacoes,
      foro,
      criado_por: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !autorizacao) return;

  // Signatários: sempre "Proprietário 1"; se marcou "tem segundo
  // proprietário", também cria "Proprietário 2".
  const signatarios = [{ nome_esperado: "Proprietário 1", ordem: 1 }];
  if (formData.get("segundo_proprietario") === "on") {
    signatarios.push({ nome_esperado: "Proprietário 2", ordem: 2 });
  }
  await supabase.from("autorizacao_signatarios").insert(
    signatarios.map((s) => ({ ...s, autorizacao_id: autorizacao.id }))
  );

  redirect(`/autorizacoes/${autorizacao.id}`);
}

export async function cancelarAutorizacao(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

  await supabase.from("autorizacoes_venda").update({ status: "cancelado" }).eq("id", id);

  revalidatePath(`/autorizacoes/${id}`);
  revalidatePath("/autorizacoes");
}
