"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { tipoLocatario } from "@/lib/ficha-locacao/campos";

// A rota pública apenas cria uma ficha isolada. Nunca retorna dados do titular.
export async function iniciarFichaPublica(formData: FormData) {
  const admin = createAdminClient() as unknown as SupabaseClient;
  const opcao = String(formData.get("papel") ?? "titular");
  const tipo = tipoLocatario(opcao === "fiador_1" || opcao === "fiador_2" ? "fiador" : opcao);
  const numero = opcao === "fiador_1" ? 1 : opcao === "fiador_2" ? 2 : null;
  const nomeTitular = String(formData.get("nome_titular") ?? "").trim().replace(/\s+/g, " ").slice(0, 200);
  const tenantId = "fc91a390-af99-4357-95e1-e173a8213abf";
  const cabecalhos = await headers();
  const ip = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() || cabecalhos.get("x-real-ip") || "";
  const ipHash = ip ? createHash("sha256").update(ip + ":" + process.env.SUPABASE_SERVICE_ROLE_KEY).digest("hex") : null;
  if (ipHash) {
    const umaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: erroLimite } = await admin.from("fichas_cadastrais_locacao")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId).eq("ip_criacao_hash", ipHash).gte("criado_em", umaHora);
    if (erroLimite || (count ?? 0) >= 8) redirect("/cadastro/locacao?erro=limite");
  }
  let principalId: string | null = null;
  if (tipo !== "titular") {
    if (nomeTitular.split(" ").filter(Boolean).length < 2) redirect("/cadastro/locacao?erro=nome");
    // Correspondência automática somente se houver exatamente um titular ativo com nome igual.
    // Nada sobre os titulares encontrados é exposto publicamente.
    const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
    const { data: candidatos, error: erroBusca } = await admin.from("fichas_cadastrais_locacao")
      .select("id, proponente_nome, dados")
      .eq("tenant_id", tenantId).eq("tipo_locatario", "titular")
      .neq("status", "cancelada").order("criado_em", { ascending: false }).limit(1000);
    if (erroBusca) redirect("/cadastro/locacao?erro=salvar");
    const encontrados = (candidatos ?? []).filter(p =>
      (() => { const nome = normalizar(String(p.proponente_nome || p.dados?.nome_completo || "")); const partes = nome.split(" ").filter(Boolean); const informado = normalizar(nomeTitular); return nome === informado || (partes.length >= 2 && `${partes[0]} ${partes[partes.length - 1]}` === informado); })());
    if (encontrados.length === 1) {
      principalId = encontrados[0].id;
      if (numero) {
        const { data: existente } = await admin.from("fichas_cadastrais_locacao")
          .select("id").eq("ficha_principal_id", principalId).eq("numero_fiador", numero)
          .neq("status", "cancelada").maybeSingle();
        if (existente) redirect("/cadastro/locacao?erro=existente");
      }
    }
    // Sem correspondência ou com nomes repetidos, a ficha nasce pendente de vínculo.
    // Assim o fiador pode preencher sem receber qualquer dado de outro locatário.
  }
  const { data, error } = await admin.from("fichas_cadastrais_locacao").insert({
    tenant_id: tenantId, tipo_locatario: tipo, ficha_principal_id: principalId,
    numero_fiador: numero, nome_titular_informado: tipo === "titular" ? null : nomeTitular, ip_criacao_hash: ipHash, dados: {},
    expira_em: new Date(Date.now() + 30 * 86400000).toISOString(),
  } as never).select("token").single();
  if (error || !data) redirect("/cadastro/locacao?erro=salvar");
  redirect(`/cadastro/locacao/${data.token}`);
}
