"use server";

import { exigirUsuario } from "@/lib/usuario-atual";

import { checar } from "@/lib/aviso";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { objetoParcial, objetoVazio } from "@/lib/objeto-parcial";
import { hojeISO } from "@/lib/data-br";
import { headers } from "next/headers";

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

export async function criarTermoVisita(formData: FormData) {
  const supabase = await createClient();
  const sessao = await exigirUsuario();
  if (!sessao) return;
  const { user } = sessao;
  const usuario = sessao.usuario;

  if (!usuario?.tenant_id) return;
  const tenantId = usuario.tenant_id;

  const campo = (nome: string) => String(formData.get(nome) ?? "").trim() || null;

  const imovelId = await resolverOuCriar(supabase, "imoveis", "endereco", tenantId, campo("imovel") ?? "");
  const clienteId = await resolverOuCriar(
    supabase,
    "clientes",
    "nome",
    tenantId,
    campo("cliente_nome") ?? ""
  );

  if (!imovelId || !clienteId) return;

  const dadosCliente = objetoParcial({ telefone: campo("cliente_telefone"), email: campo("cliente_email") });
  if (!objetoVazio(dadosCliente)) {
    await checar(supabase.from("clientes").update(dadosCliente).eq("id", clienteId), "atualizar");
  }

  let corretorId: string | null = null;
  const corretorNome = campo("corretor_nome");
  if (corretorNome) {
    corretorId = await resolverOuCriar(supabase, "corretores", "nome", tenantId, corretorNome);
  }

  const valorImovel = formData.get("valor_imovel");
  const codigoImovel = campo("codigo_imovel");
  const multaPercentual = formData.get("multa_percentual");
  const assinaturaImagem = campo("assinatura_imagem");
  if (!assinaturaImagem?.startsWith("data:image/png;base64,") || assinaturaImagem.length > 550000) {
    throw new Error("É necessário assinar na ficha antes de salvar.");
  }
  const cabecalhos = await headers();
  const ipAssinatura = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() || cabecalhos.get("x-real-ip") || "desconhecido";
  const dataVisita = campo("data_visita");
  const imoveisVisitados = Array.from({ length: 7 }, (_, i) => ({
    descricao: i === 0 ? campo("imovel") : campo("imovel_" + i),
    codigo: i === 0 ? codigoImovel : campo("codigo_imovel_" + i),
    valor: Number(formData.get(i === 0 ? "valor_imovel" : "valor_imovel_" + i) || 0) || null,
  })).filter((imovel) => imovel.descricao);
  const notaRaw = campo("nota");
  const feedback = campo("feedback");
  const feedbackValidos = ["vai_fazer_proposta", "vai_voltar", "vai_manter_consideracao", "nao_gostou_quer_outras"];

  const { data: termo, error } = await supabase
    .from("termos_visita")
    .insert({
      tenant_id: tenantId,
      imovel_id: imovelId,
      cliente_id: clienteId,
      corretor_id: corretorId,
      valor_imovel: valorImovel ? Number(valorImovel) : null,
      codigo_imovel: codigoImovel,
      multa_percentual: multaPercentual ? Number(multaPercentual) : 6,
      data_visita: dataVisita ?? hojeISO(),
      imoveis_visitados: imoveisVisitados,
      hora_visita: campo("hora_visita"),
      cliente_cpf_informado: campo("cliente_cpf_informado"),
      cliente_rg_informado: campo("cliente_rg_informado"),
      corretor_creci: campo("corretor_creci"),
      corretor_creci_j: campo("corretor_creci_j"),
      imobiliaria_parceira: campo("imobiliaria_parceira"),
      nota: notaRaw !== null ? Number(notaRaw) : null,
      feedback: feedback && feedbackValidos.includes(feedback) ? feedback : null,
      observacoes: campo("observacoes"),
      criado_por: user?.id ?? null,
      status: "assinado",
      nome_digitado: campo("cliente_nome"),
      cliente_cpf: campo("cliente_cpf_informado"),
      cliente_rg: campo("cliente_rg_informado"),
      assinatura_imagem: assinaturaImagem,
      ip_assinatura: ipAssinatura,
      assinado_em: new Date().toISOString(),
    } as never)
    .select("id")
    .single();

  if (error || !termo) return;

  redirect(`/termos-visita/${termo.id}`);
}

export async function atualizarFeedbackVisita(formData: FormData) {
  if (!(await exigirUsuario())) return;
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const nota = formData.get("nota");
  const feedback = String(formData.get("feedback") ?? "").trim() || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  await checar(supabase
    .from("termos_visita")
    .update({
      nota: nota ? Number(nota) : null,
      feedback,
      observacoes,
    })
    .eq("id", id), "atualizar");

  revalidatePath(`/termos-visita/${id}`);
}

export async function cancelarTermoVisita(formData: FormData) {
  if (!(await exigirUsuario())) return;
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

  await checar(supabase.from("termos_visita").update({ status: "cancelado" }).eq("id", id), "atualizar");

  revalidatePath(`/termos-visita/${id}`);
  revalidatePath("/termos-visita");
}
