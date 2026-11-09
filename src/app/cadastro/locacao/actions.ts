"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cpfValido, tipoLocatario } from "@/lib/ficha-locacao/campos";
import { decidirRetomada, nomeCombina, titularUnico, type FichaExistente } from "@/lib/ficha-locacao/vinculo";

// A rota pública apenas cria uma ficha isolada. Nunca retorna dados do titular.
export async function iniciarFichaPublica(formData: FormData) {
  const admin = createAdminClient() as unknown as SupabaseClient;
  const opcao = String(formData.get("papel") ?? "titular");
  const tipo = tipoLocatario(opcao === "fiador_1" || opcao === "fiador_2" ? "fiador" : opcao);
  const numero = opcao === "fiador_1" ? 1 : opcao === "fiador_2" ? 2 : null;
  const nomeTitular = String(formData.get("nome_titular") ?? "").trim().replace(/\s+/g, " ").slice(0, 200);
  const cpf = String(formData.get("cpf") ?? "").replace(/\D/g, "").slice(0, 11);
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
  let substituir: string | null = null;
  if (tipo !== "titular") {
    if (nomeTitular.split(" ").filter(Boolean).length < 2) redirect("/cadastro/locacao?erro=nome");
    if (!cpfValido(cpf)) redirect("/cadastro/locacao?erro=cpf");
    // Vínculo automático quando exatamente um titular ativo combina com o nome digitado.
    // Nada sobre os titulares encontrados é exposto publicamente.
    const { data: candidatos, error: erroBusca } = await admin.from("fichas_cadastrais_locacao")
      .select("id, proponente_nome, dados")
      .eq("tenant_id", tenantId).eq("tipo_locatario", "titular")
      .neq("status", "cancelada").order("criado_em", { ascending: false }).limit(1000);
    if (erroBusca) redirect("/cadastro/locacao?erro=salvar");
    const unico = titularUnico(nomeTitular, (candidatos ?? []).map((p) => ({ id: p.id as string, nome: String(p.proponente_nome || p.dados?.nome_completo || "") })));
    const encontrados = unico ? [unico] : [];
    if (encontrados.length === 1) principalId = encontrados[0].id;

    // Quem já começou volta para a própria ficha confirmando o CPF; sem CPF igual nada é reaberto.
    const { data: anteriores } = await admin.from("fichas_cadastrais_locacao")
      .select("id, token, status, dados, ficha_principal_id, numero_fiador, nome_titular_informado")
      .eq("tenant_id", tenantId).eq("tipo_locatario", tipo).neq("status", "cancelada")
      .gte("criado_em", new Date(Date.now() - 90 * 86400000).toISOString()).limit(2000);
    const comoExistente = (f: { id: string; token: string; status: string; dados: Record<string, unknown> | null }): FichaExistente =>
      ({ id: f.id, token: f.token, status: f.status, cpf: String(f.dados?.cpf ?? "") });
    const daProposta = (anteriores ?? []).filter((f) => principalId ? f.ficha_principal_id === principalId : nomeCombina(nomeTitular, String(f.nome_titular_informado ?? "")));
    const vaga = principalId && numero ? (anteriores ?? []).find((f) => f.ficha_principal_id === principalId && f.numero_fiador === numero) : undefined;
    const decisao = decidirRetomada(cpf, daProposta.map(comoExistente), vaga ? comoExistente(vaga) : null);
    if (decisao.acao === "continuar") {
      await admin.from("fichas_cadastrais_locacao").update({ expira_em: new Date(Date.now() + 30 * 86400000).toISOString() } as never).eq("token", decisao.token).neq("status", "concluida");
      redirect(`/cadastro/locacao/${decisao.token}`);
    }
    if (decisao.acao === "enviada") redirect("/cadastro/locacao?erro=enviada");
    if (decisao.acao === "ocupada") redirect("/cadastro/locacao?erro=existente");
    substituir = decisao.substituir;
    // Sem correspondência ou com nomes repetidos, a ficha nasce pendente de vínculo.
    // Assim o fiador pode preencher sem receber qualquer dado de outro locatário.
  }
  if (substituir) await admin.from("fichas_cadastrais_locacao").update({ status: "cancelada" } as never).eq("id", substituir).neq("status", "concluida");
  const { data, error } = await admin.from("fichas_cadastrais_locacao").insert({
    tenant_id: tenantId, tipo_locatario: tipo, ficha_principal_id: principalId,
    numero_fiador: numero, nome_titular_informado: tipo === "titular" ? null : nomeTitular, ip_criacao_hash: ipHash, dados: tipo === "titular" ? {} : { cpf: cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") },
    expira_em: new Date(Date.now() + 30 * 86400000).toISOString(),
  } as never).select("token").single();
  if (error || !data) redirect("/cadastro/locacao?erro=salvar");
  redirect(`/cadastro/locacao/${data.token}`);
}
