"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { documentosPendentes } from "@/lib/ficha-locacao/documentos";
import { limparDados, pendencias, textoPendencias, tipoLocatario, LIMITE_ARQUIVOS, type DadosFicha } from "@/lib/ficha-locacao/campos";
import type { SupabaseClient } from "@supabase/supabase-js";

type Resultado = { ok: boolean; erro?: string; id?: string; salvoEm?: string; etapa?: number };

const TIPOS = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

async function obterFicha(token: string) {
  const admin = createAdminClient() as unknown as SupabaseClient;
  const { data } = await admin.from("fichas_cadastrais_locacao").select("id, tenant_id, status, expira_em, tipo_locatario, ficha_principal_id").eq("token", token).maybeSingle();
  if (!data || data.status === "cancelada" || new Date(data.expira_em).getTime() < Date.now()) return null;
  return { admin, ficha: data, tipo: tipoLocatario(data.tipo_locatario) };
}

export async function salvarRascunho(token: string, dados: DadosFicha): Promise<Resultado> {
  const contexto = await obterFicha(token);
  if (!contexto || contexto.ficha.status === "concluida") return { ok: false, erro: "Este link não está mais disponível." };
  if (JSON.stringify(dados ?? {}).length > 50000) return { ok: false, erro: "Os dados informados ultrapassam o limite permitido." };
  // Só o que a ficha conhece é gravado (o que vier a mais é descartado).
  dados = limparDados(dados ?? {}, contexto.tipo);
  const salvoEm = new Date().toISOString();
  const { data: salva, error } = await contexto.admin.from("fichas_cadastrais_locacao").update({ dados, status: "em_preenchimento", proponente_nome: String(dados.nome_completo ?? "").slice(0, 200) || null, proponente_email: String(dados.email ?? "").slice(0, 254) || null, atualizado_em: salvoEm }).eq("id", contexto.ficha.id).neq("status", "concluida").neq("status", "cancelada").select("id").maybeSingle();
  if (error || !salva) return { ok: false, erro: "Não foi possível salvar agora. Tente novamente." };
  revalidatePath(`/cadastro/locacao/${token}`);
  return { ok: true, salvoEm };
}

export async function prepararUpload(token: string, nome: string, mime: string, tamanho: number): Promise<{ ok: boolean; erro?: string; caminho?: string; uploadToken?: string }> {
  const contexto = await obterFicha(token);
  if (!contexto || contexto.ficha.status === "concluida") return { ok: false, erro: "Este link não está mais disponível." };
  const { count } = await contexto.admin.from("ficha_locacao_documentos").select("id", { count: "exact", head: true }).eq("ficha_id", contexto.ficha.id);
  if ((count ?? 0) >= LIMITE_ARQUIVOS) return { ok: false, erro: "O limite de 10 arquivos já foi atingido." };
  if (!TIPOS.has(mime) || !Number.isFinite(tamanho) || tamanho <= 0 || tamanho > 10 * 1024 * 1024) return { ok: false, erro: "Use PDF, JPG, PNG ou WebP com até 10 MB." };
  const extensao = nome.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "arquivo";
  const caminho = `${contexto.ficha.tenant_id}/${contexto.ficha.id}/${crypto.randomUUID()}.${extensao}`;
  const { data, error } = await contexto.admin.storage.from("fichas-locacao").createSignedUploadUrl(caminho);
  if (error || !data) return { ok: false, erro: "Não foi possível preparar o envio do arquivo." };
  return { ok: true, caminho: data.path, uploadToken: data.token };
}

export async function confirmarUpload(token: string, documento: { caminho: string; nome: string; mime: string; tamanho: number; tipo: string }): Promise<Resultado> {
  const contexto = await obterFicha(token);
  if (!contexto || contexto.ficha.status === "concluida") return { ok: false, erro: "Este link não está mais disponível." };
  const prefixo = `${contexto.ficha.tenant_id}/${contexto.ficha.id}/`;
  if (!documento.caminho.startsWith(prefixo) || !TIPOS.has(documento.mime) || !Number.isFinite(documento.tamanho) || documento.tamanho <= 0 || documento.tamanho > 10 * 1024 * 1024) return { ok: false, erro: "Arquivo inválido." };
  const { count } = await contexto.admin.from("ficha_locacao_documentos").select("id", { count: "exact", head: true }).eq("ficha_id", contexto.ficha.id);
  if ((count ?? 0) >= LIMITE_ARQUIVOS) return { ok: false, erro: "O limite de 10 arquivos já foi atingido." };
  const { data, error } = await contexto.admin.from("ficha_locacao_documentos").insert({ ficha_id: contexto.ficha.id, tipo: documento.tipo.slice(0, 80), nome_arquivo: documento.nome.slice(0, 255), caminho_storage: documento.caminho, tamanho_bytes: documento.tamanho, mime_type: documento.mime }).select("id").single();
  if (error) return { ok: false, erro: "O arquivo foi enviado, mas não pôde ser registrado." };
  return { ok: true, id: data?.id };
}

export async function finalizarFicha(token: string, dados: DadosFicha, assinatura: string): Promise<Resultado> {
  const contexto = await obterFicha(token);
  if (!contexto || contexto.ficha.status === "concluida") return { ok: false, erro: "Este link não está mais disponível." };
  if (JSON.stringify(dados ?? {}).length > 50000) return { ok: false, erro: "Os dados informados ultrapassam o limite permitido." };
  dados = limparDados(dados ?? {}, contexto.tipo);
  const faltas = pendencias(dados, contexto.tipo);
  if (faltas.length > 0) return { ok: false, etapa: Math.min(...faltas.map((f) => f.etapa)), erro: textoPendencias(faltas) };
  const [{ data: documentos, error: erroDocumentos }, { data: principal, error: erroPrincipal }] = await Promise.all([
    contexto.admin.from("ficha_locacao_documentos").select("id, nome_arquivo, tipo").eq("ficha_id", contexto.ficha.id),
    contexto.ficha.ficha_principal_id
      ? contexto.admin.from("fichas_cadastrais_locacao").select("dados, status").eq("id", contexto.ficha.ficha_principal_id).eq("tenant_id", contexto.ficha.tenant_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (erroDocumentos || erroPrincipal) return { ok: false, erro: "Não foi possível conferir os documentos. Tente novamente." };
  if (contexto.ficha.ficha_principal_id && (!principal || principal.status === "cancelada")) return { ok: false, erro: "A proposta principal não está disponível." };
  const garantia = contexto.tipo === "titular" ? String(dados.garantia ?? "") : String(principal?.dados?.garantia ?? "");
  const documentosFaltando = documentosPendentes(contexto.tipo, garantia, dados, documentos ?? []);
  if (documentosFaltando.length) return { ok: false, etapa: 4, erro: `Anexe os documentos pendentes: ${documentosFaltando.join(", ")}.` };
  if (dados.consentimento_lgpd !== true) return { ok: false, erro: "É necessário aceitar o consentimento de tratamento de dados." };
  if (!assinatura.startsWith("data:image/png;base64,") || assinatura.length > 500000) return { ok: false, erro: "Faça sua assinatura antes de enviar." };
  const listaHeaders = await headers();
  const ip = listaHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || listaHeaders.get("x-real-ip") || "desconhecido";
  const { data: concluida, error } = await contexto.admin.from("fichas_cadastrais_locacao").update({ dados, proponente_nome: String(dados.nome_completo).slice(0, 200), proponente_email: String(dados.email).slice(0, 254), assinatura_imagem: assinatura, consentimento_lgpd: true, status: "concluida", concluido_em: new Date().toISOString(), atualizado_em: new Date().toISOString(), ip_conclusao: ip, user_agent_conclusao: String(listaHeaders.get("user-agent") ?? "").slice(0, 500) }).eq("id", contexto.ficha.id).neq("status", "concluida").neq("status", "cancelada").select("id").maybeSingle();
  if (error || !concluida) return { ok: false, erro: "Não foi possível concluir a ficha. Tente novamente." };
  revalidatePath(`/cadastro/locacao/${token}`);
  revalidatePath("/locacao/ficha-cadastral");
  return { ok: true };
}


/** O token dá acesso somente aos anexos da própria ficha ainda aberta. */
export async function visualizarDocumento(token: string, documentoId: string): Promise<{ ok: boolean; url?: string; erro?: string }> {
  const contexto = await obterFicha(token);
  if (!contexto || contexto.ficha.status === "concluida") return { ok: false, erro: "Este link não está mais disponível." };
  const { data } = await contexto.admin.from("ficha_locacao_documentos").select("caminho_storage").eq("id", documentoId).eq("ficha_id", contexto.ficha.id).maybeSingle();
  if (!data) return { ok: false, erro: "Documento não encontrado nesta ficha." };
  const { data: link, error } = await contexto.admin.storage.from("fichas-locacao").createSignedUrl(data.caminho_storage, 60);
  return error || !link ? { ok: false, erro: "Não foi possível abrir o documento." } : { ok: true, url: link.signedUrl };
}

/** Retira um anexo incorreto do rascunho para permitir o envio do substituto. */
export async function removerDocumento(token: string, documentoId: string): Promise<Resultado> {
  const contexto = await obterFicha(token);
  if (!contexto || contexto.ficha.status === "concluida") return { ok: false, erro: "Este link não está mais disponível." };
  const { data } = await contexto.admin.from("ficha_locacao_documentos").select("id").eq("id", documentoId).eq("ficha_id", contexto.ficha.id).maybeSingle();
  if (!data) return { ok: false, erro: "Documento não encontrado nesta ficha." };
  // O objeto privado é preservado; sua referência sai do rascunho e libera uma vaga.
  const { error } = await contexto.admin.from("ficha_locacao_documentos").delete().eq("id", documentoId).eq("ficha_id", contexto.ficha.id);
  if (error) return { ok: false, erro: "Não foi possível retirar o anexo." };
  revalidatePath(`/cadastro/locacao/${token}`);
  return { ok: true };
}
