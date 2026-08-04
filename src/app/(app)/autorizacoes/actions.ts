"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

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

  const imovelNome = String(formData.get("imovel") ?? "");
  const vendedorNome = String(formData.get("vendedor") ?? "");
  const valorImovel = formData.get("valor_imovel");
  const comissaoPercentual = formData.get("comissao_percentual");
  const prazoDias = formData.get("prazo_dias");
  const exclusividade = formData.get("exclusividade") === "on";
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  const imovelId = await resolverOuCriar(supabase, "imoveis", "endereco", tenantId, imovelNome);
  const vendedorId = await resolverOuCriar(supabase, "clientes", "nome", tenantId, vendedorNome);

  if (!imovelId || !vendedorId) return;

  const { data: autorizacao, error } = await supabase
    .from("autorizacoes_venda")
    .insert({
      tenant_id: tenantId,
      imovel_id: imovelId,
      vendedor_id: vendedorId,
      valor_imovel: valorImovel ? Number(valorImovel) : null,
      comissao_percentual: comissaoPercentual ? Number(comissaoPercentual) : null,
      prazo_dias: prazoDias ? Number(prazoDias) : null,
      exclusividade,
      observacoes,
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
