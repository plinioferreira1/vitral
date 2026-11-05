"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { tipoLocatario } from "@/lib/ficha-locacao/campos";

// A rota pública apenas cria uma ficha isolada. Nunca retorna dados do titular.
export async function iniciarFichaPublica(formData: FormData) {
  const admin = createAdminClient();
  const opcao = String(formData.get("papel") ?? "titular");
  const tipo = tipoLocatario(opcao === "fiador_1" || opcao === "fiador_2" ? "fiador" : opcao);
  const numero = opcao === "fiador_1" ? 1 : opcao === "fiador_2" ? 2 : null;
  const codigo = String(formData.get("codigo_proposta") ?? "").trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
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
    if (!/^[A-F0-9]{12}$/.test(codigo)) redirect("/cadastro/locacao?erro=codigo");
    const { data: principal } = await admin.from("fichas_cadastrais_locacao")
      .select("id").eq("tenant_id", tenantId).eq("codigo_proposta", codigo)
      .eq("tipo_locatario", "titular").neq("status", "cancelada").maybeSingle();
    if (!principal) redirect("/cadastro/locacao?erro=codigo");
    principalId = principal.id;
    if (numero) {
      const { data: existente } = await admin.from("fichas_cadastrais_locacao")
        .select("id").eq("ficha_principal_id", principalId).eq("numero_fiador", numero)
        .neq("status", "cancelada").maybeSingle();
      if (existente) redirect("/cadastro/locacao?erro=existente");
    }
  }
  const { data, error } = await admin.from("fichas_cadastrais_locacao").insert({
    tenant_id: tenantId, tipo_locatario: tipo, ficha_principal_id: principalId,
    numero_fiador: numero, ip_criacao_hash: ipHash, dados: {},
    expira_em: new Date(Date.now() + 30 * 86400000).toISOString(),
  } as never).select("token").single();
  if (error || !data) redirect("/cadastro/locacao?erro=salvar");
  redirect(`/cadastro/locacao/${data.token}`);
}
