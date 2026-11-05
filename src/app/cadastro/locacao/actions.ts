"use server";

import { redirect } from "next/navigation";
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
    numero_fiador: numero, dados: {},
    expira_em: new Date(Date.now() + 30 * 86400000).toISOString(),
  } as never).select("token").single();
  if (error || !data) redirect("/cadastro/locacao?erro=salvar");
  redirect(`/cadastro/locacao/${data.token}`);
}
