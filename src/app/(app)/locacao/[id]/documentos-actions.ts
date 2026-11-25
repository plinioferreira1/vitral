"use server";

import { revalidatePath } from "next/cache";
import { avisar } from "@/lib/aviso";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/usuario-atual";
import {
  BUCKET_DOCUMENTOS_LOCACAO,
  caminhoDocumento,
  caminhoValido,
  conteudoConfere,
  erroArquivoDocumento,
  formatoArquivo,
  nomeOriginalSeguro,
  nomePadronizado,
  tipoDocumento,
} from "@/lib/locacao/documentos";
import { tabelaDocumentos, type LinhaDocumentoLocacao } from "@/lib/locacao/documentos-banco";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Contrato visível para a pessoa (RLS) e permissão de edição de Locação. */
async function contratoEditavel(contratoId: string) {
  const sessao = await exigirUsuario();
  if (!sessao || !UUID.test(contratoId)) return null;
  const supabase = await createClient();
  const [{ data: contrato }, { data: podeEditar }] = await Promise.all([
    supabase.from("contratos_locacao").select("id, tenant_id, numero, imoveis ( endereco )").eq("id", contratoId).eq("tenant_id", sessao.tenantId).maybeSingle(),
    supabase.rpc("usuario_pode_editar"),
  ]);
  if (!contrato || podeEditar !== true) return null;
  const endereco = (contrato.imoveis as { endereco: string } | null)?.endereco ?? null;
  return { sessao, supabase, contrato: { id: contrato.id, numero: contrato.numero, endereco } };
}

/** Passo 1: link de envio de uso único para a pasta privada. */
export async function prepararEnvioDocumento(contratoId: string, nomeArquivo: string, tamanho: number): Promise<{ ok: boolean; erro?: string; caminho?: string; token?: string }> {
  const erro = erroArquivoDocumento({ name: nomeArquivo, size: tamanho });
  if (erro) return { ok: false, erro };
  const ctx = await contratoEditavel(contratoId);
  if (!ctx) return { ok: false, erro: "Você não tem permissão para anexar documentos neste contrato." };
  const formato = formatoArquivo(nomeArquivo)!;
  const caminho = caminhoDocumento(ctx.sessao.tenantId, contratoId, formato.extensao, crypto.randomUUID());
  const { data, error } = await createAdminClient().storage.from(BUCKET_DOCUMENTOS_LOCACAO).createSignedUploadUrl(caminho);
  if (error || !data) return { ok: false, erro: "Não foi possível preparar o envio. Tente novamente." };
  return { ok: true, caminho, token: data.token };
}

/** Passo 2: confere o arquivo enviado e registra o documento no contrato. */
export async function registrarDocumento(formData: FormData) {
  const contratoId = String(formData.get("contrato_id") ?? "");
  const ctx = await contratoEditavel(contratoId);
  if (!ctx) {
    await avisar("erro", "Você não tem permissão para anexar documentos neste contrato.");
    return;
  }
  const caminho = String(formData.get("arquivo_caminho") ?? "");
  const nomeOriginal = nomeOriginalSeguro(String(formData.get("arquivo_nome") ?? ""));
  const tipo = tipoDocumento(formData.get("tipo"));
  const dataDoc = String(formData.get("data_documento") ?? "");
  const data = /^\d{4}-\d{2}-\d{2}$/.test(dataDoc) ? dataDoc : null;
  const complemento = String(formData.get("complemento") ?? "");
  const observacao = String(formData.get("observacao") ?? "").trim().slice(0, 500) || null;
  const formato = formatoArquivo(nomeOriginal);
  if (!tipo || !formato || !caminhoValido(caminho, ctx.sessao.tenantId, contratoId)) {
    await avisar("erro", "Escolha o tipo do documento e anexe o arquivo antes de salvar.");
    return;
  }

  const admin = createAdminClient();
  const bucket = admin.storage.from(BUCKET_DOCUMENTOS_LOCACAO);
  const { data: arquivo, error: erroArquivo } = await bucket.download(caminho);
  if (erroArquivo || !arquivo) {
    await avisar("erro", "O arquivo não chegou ao servidor. Anexe de novo.");
    return;
  }
  const bytes = new Uint8Array(await arquivo.slice(0, 16).arrayBuffer());
  if (arquivo.size > 15 * 1024 * 1024 || !conteudoConfere(bytes, formato.mime)) {
    await bucket.remove([caminho]);
    await avisar("erro", "O arquivo não é um PDF ou imagem válido.");
    return;
  }

  const nome = nomePadronizado({ tipo, complemento, numeroContrato: ctx.contrato.numero, endereco: ctx.contrato.endereco, data });
  const { error } = await tabelaDocumentos(ctx.supabase).insert({
    tenant_id: ctx.sessao.tenantId,
    contrato_id: contratoId,
    tipo,
    nome,
    data_documento: data,
    observacao,
    arquivo_caminho: caminho,
    arquivo_nome_original: nomeOriginal,
    mime: formato.mime,
    tamanho: arquivo.size,
    criado_por: ctx.sessao.userId,
  });
  if (error) {
    await bucket.remove([caminho]);
    await avisar("erro", "Não foi possível salvar o documento. Tente novamente.");
    return;
  }
  revalidatePath(`/locacao/${contratoId}`);
  revalidatePath("/locacao/documentos");
  await avisar("sucesso", `${nome} anexado.`);
}

/** Remove o registro (RLS: só quem edita Locação) e depois o arquivo. */
export async function removerDocumento(formData: FormData) {
  const contratoId = String(formData.get("contrato_id") ?? "");
  const documentoId = String(formData.get("documento_id") ?? "");
  const ctx = await contratoEditavel(contratoId);
  if (!ctx || !UUID.test(documentoId)) {
    await avisar("erro", "Você não tem permissão para remover documentos deste contrato.");
    return;
  }
  const { data: doc } = await tabelaDocumentos(ctx.supabase)
    .select("id, nome, arquivo_caminho")
    .eq("id", documentoId)
    .eq("contrato_id", contratoId)
    .maybeSingle<Pick<LinhaDocumentoLocacao, "id" | "nome" | "arquivo_caminho">>();
  if (!doc) {
    await avisar("erro", "Documento não encontrado.");
    return;
  }
  const { data: apagados, error } = await tabelaDocumentos(ctx.supabase).delete().eq("id", doc.id).select("id");
  if (error || !apagados?.length) {
    await avisar("erro", "Não foi possível remover o documento.");
    return;
  }
  await createAdminClient().storage.from(BUCKET_DOCUMENTOS_LOCACAO).remove([doc.arquivo_caminho]);
  revalidatePath(`/locacao/${contratoId}`);
  revalidatePath("/locacao/documentos");
  await avisar("sucesso", `${doc.nome} removido.`);
}
