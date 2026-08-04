"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hojeISO } from "@/lib/data-br";

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
  const clienteId = await resolverOuCriar(
    supabase,
    "clientes",
    "nome",
    tenantId,
    campo("cliente_nome") ?? ""
  );

  if (!imovelId || !clienteId) return;

  await supabase
    .from("clientes")
    .update({ telefone: campo("cliente_telefone"), email: campo("cliente_email") })
    .eq("id", clienteId);

  let corretorId: string | null = null;
  const corretorNome = campo("corretor_nome");
  if (corretorNome) {
    corretorId = await resolverOuCriar(supabase, "corretores", "nome", tenantId, corretorNome);
  }

  const valorImovel = formData.get("valor_imovel");
  const codigoImovel = campo("codigo_imovel");
  const multaPercentual = formData.get("multa_percentual");
  const dataVisita = campo("data_visita");

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
      criado_por: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error || !termo) return;

  redirect(`/termos-visita/${termo.id}`);
}

export async function atualizarFeedbackVisita(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const nota = formData.get("nota");
  const feedback = String(formData.get("feedback") ?? "").trim() || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;

  await supabase
    .from("termos_visita")
    .update({
      nota: nota ? Number(nota) : null,
      feedback,
      observacoes,
    })
    .eq("id", id);

  revalidatePath(`/termos-visita/${id}`);
}

export async function cancelarTermoVisita(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");

  await supabase.from("termos_visita").update({ status: "cancelado" }).eq("id", id);

  revalidatePath(`/termos-visita/${id}`);
  revalidatePath("/termos-visita");
}
