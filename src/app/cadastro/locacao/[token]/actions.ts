"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

type DadosFicha = Record<string, string | number | boolean | null>;
type Resultado = { ok: boolean; erro?: string };

const TIPOS = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

async function obterFicha(token: string) {
  const admin = createAdminClient() as unknown as SupabaseClient;
  const { data } = await admin.from("fichas_cadastrais_locacao").select("id, tenant_id, status, expira_em").eq("token", token).maybeSingle();
  if (!data || data.status === "cancelada" || new Date(data.expira_em).getTime() < Date.now()) return null;
  return { admin, ficha: data };
}

export async function salvarRascunho(token: string, dados: DadosFicha): Promise<Resultado> {
  const contexto = await obterFicha(token);
  if (!contexto || contexto.ficha.status === "concluida") return { ok: false, erro: "Este link não está mais disponível." };
  const serializado = JSON.stringify(dados);
  if (serializado.length > 50000) return { ok: false, erro: "Os dados informados ultrapassam o limite permitido." };
  const { error } = await contexto.admin.from("fichas_cadastrais_locacao").update({ dados, status: "em_preenchimento", proponente_nome: String(dados.nome_completo ?? "").slice(0, 200) || null, proponente_email: String(dados.email ?? "").slice(0, 254) || null, atualizado_em: new Date().toISOString() }).eq("id", contexto.ficha.id);
  if (error) return { ok: false, erro: "Não foi possível salvar agora. Tente novamente." };
  revalidatePath(`/cadastro/locacao/${token}`);
  return { ok: true };
}

export async function prepararUpload(token: string, nome: string, mime: string, tamanho: number): Promise<{ ok: boolean; erro?: string; caminho?: string; uploadToken?: string }> {
  const contexto = await obterFicha(token);
  if (!contexto || contexto.ficha.status === "concluida") return { ok: false, erro: "Este link não está mais disponível." };
  if (!TIPOS.has(mime) || tamanho <= 0 || tamanho > 10 * 1024 * 1024) return { ok: false, erro: "Use PDF, JPG, PNG ou WebP com até 10 MB." };
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
  if (!documento.caminho.startsWith(prefixo) || !TIPOS.has(documento.mime) || documento.tamanho > 10 * 1024 * 1024) return { ok: false, erro: "Arquivo inválido." };
  const { error } = await contexto.admin.from("ficha_locacao_documentos").insert({ ficha_id: contexto.ficha.id, tipo: documento.tipo.slice(0, 80), nome_arquivo: documento.nome.slice(0, 255), caminho_storage: documento.caminho, tamanho_bytes: documento.tamanho, mime_type: documento.mime });
  if (error) return { ok: false, erro: "O arquivo foi enviado, mas não pôde ser registrado." };
  return { ok: true };
}

export async function finalizarFicha(token: string, dados: DadosFicha, assinatura: string): Promise<Resultado> {
  const contexto = await obterFicha(token);
  if (!contexto || contexto.ficha.status === "concluida") return { ok: false, erro: "Este link não está mais disponível." };
  const obrigatorios = ["nome_completo", "cpf", "nascimento", "telefone", "email", "endereco", "profissao", "renda_mensal", "imovel_interesse", "garantia"];
  if (obrigatorios.some((campo) => !String(dados[campo] ?? "").trim())) return { ok: false, erro: "Preencha todos os campos obrigatórios antes de enviar." };
  if (dados.garantia === "Fiador") {
    const camposFiador = ["fiador_nome", "fiador_cpf", "fiador_rg", "fiador_telefone", "fiador_email", "fiador_endereco", "fiador_profissao", "fiador_renda", "fiador_imovel_quitado"];
    if (camposFiador.some((campo) => !String(dados[campo] ?? "").trim())) return { ok: false, erro: "Preencha todos os dados obrigatórios do fiador." };
  }
  if (dados.consentimento_lgpd !== true) return { ok: false, erro: "É necessário aceitar o consentimento de tratamento de dados." };
  if (!assinatura.startsWith("data:image/png;base64,") || assinatura.length > 500000) return { ok: false, erro: "Faça sua assinatura antes de enviar." };
  const listaHeaders = await headers();
  const ip = listaHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || listaHeaders.get("x-real-ip") || "desconhecido";
  const { error } = await contexto.admin.from("fichas_cadastrais_locacao").update({ dados, proponente_nome: String(dados.nome_completo).slice(0, 200), proponente_email: String(dados.email).slice(0, 254), assinatura_imagem: assinatura, consentimento_lgpd: true, status: "concluida", concluido_em: new Date().toISOString(), atualizado_em: new Date().toISOString(), ip_conclusao: ip, user_agent_conclusao: String(listaHeaders.get("user-agent") ?? "").slice(0, 500) }).eq("id", contexto.ficha.id);
  if (error) return { ok: false, erro: "Não foi possível concluir a ficha. Tente novamente." };
  revalidatePath(`/cadastro/locacao/${token}`);
  revalidatePath("/locacao/ficha-cadastral");
  return { ok: true };
}
