"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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

export async function criarContratoLocacao(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!usuario?.tenant_id) redirect("/onboarding");

  const imovelNome = String(formData.get("imovel") ?? "");
  const locadorNome = String(formData.get("locador") ?? "");
  const locatarioNome = String(formData.get("locatario") ?? "");
  const emiteNf = formData.get("emite_nf") === "on";

  const imovelId = await resolverOuCriar(supabase, "imoveis", "endereco", usuario.tenant_id, imovelNome);
  const locadorId = await resolverOuCriar(supabase, "clientes", "nome", usuario.tenant_id, locadorNome);
  const locatarioId = await resolverOuCriar(supabase, "clientes", "nome", usuario.tenant_id, locatarioNome);

  const numero = imovelNome.trim() || `Contrato ${Date.now().toString().slice(-6)}`;

  const { data: contrato, error } = await supabase
    .from("contratos_locacao")
    .insert({
      tenant_id: usuario.tenant_id,
      numero,
      imovel_id: imovelId,
      locador_id: locadorId,
      locatario_id: locatarioId,
      emite_nf: emiteNf,
      responsavel_id: user.id,
      ativo: true,
    })
    .select("id")
    .single();

  if (error || !contrato) {
    redirect(`/locacao/novo?erro=${encodeURIComponent(error?.message ?? "Erro ao criar contrato.")}`);
    return;
  }

  redirect(`/locacao/${contrato.id}`);
}
