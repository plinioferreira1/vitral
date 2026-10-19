"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { avisar, checar } from "@/lib/aviso";
import { conteudoArquivoValido, erroArquivoDespesa, nomeArquivoDespesa } from "@/lib/anexo-despesa";
import { BUCKET_CERTIDOES, certidaoPorChave, validarCertidao, type Parte } from "@/lib/certidoes/catalogo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/usuario-atual";

const EXTENSAO: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const campo = (f: FormData, nome: string) => String(f.get(nome) ?? "").trim();

/** Confere sessão, se a pessoa enxerga o processo e se pode editar (mesmas regras de processos). */
async function autorizar(processoId: string) {
  const sessao = await exigirUsuario();
  if (!sessao) return null;
  const supabase = await createClient();
  const [{ data: processo }, { data: podeEditar }] = await Promise.all([
    supabase.from("processos").select("id, tenant_id, comprador_id, vendedor_id").eq("id", processoId).eq("tenant_id", sessao.tenantId).maybeSingle(),
    supabase.rpc("usuario_pode_editar"),
  ]);
  if (!processo) {
    await avisar("erro", "Processo não encontrado ou sem permissão de acesso.");
    return null;
  }
  if (!podeEditar) {
    await avisar("erro", "Você não tem permissão para alterar este processo.");
    return null;
  }
  return { sessao, processo };
}

export async function salvarCertidao(formData: FormData) {
  const processoId = campo(formData, "processo_id");
  const ctx = await autorizar(processoId);
  if (!ctx) return;
  const dados = {
    tipo: campo(formData, "tipo"),
    parte: campo(formData, "parte"),
    emitida_em: campo(formData, "emitida_em"),
    valida_ate: campo(formData, "valida_ate"),
    resultado: campo(formData, "resultado") || "nada_consta",
  };
  const erro = validarCertidao(dados);
  if (erro) return void (await avisar("erro", erro));

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || !arquivo.size) return void (await avisar("erro", "Anexe o arquivo da certidão."));
  const erroArquivo = erroArquivoDespesa(arquivo);
  if (erroArquivo) return void (await avisar("erro", erroArquivo));
  if (!conteudoArquivoValido(new Uint8Array(await arquivo.slice(0, 12).arrayBuffer()), arquivo.type)) {
    return void (await avisar("erro", "O conteúdo do arquivo não corresponde a um PDF ou imagem válida."));
  }

  const parte = dados.parte as Parte;
  const clienteId = parte === "vendedor" ? ctx.processo.vendedor_id : ctx.processo.comprador_id;
  const admin = createAdminClient();
  const anterior = (await admin.from("processo_certidoes").select("caminho")
    .eq("processo_id", processoId).eq("parte", parte).eq("tipo", dados.tipo).maybeSingle()).data;

  const caminho = `${ctx.sessao.tenantId}/${processoId}/${randomUUID()}.${EXTENSAO[arquivo.type]}`;
  const enviou = await checar(admin.storage.from(BUCKET_CERTIDOES).upload(caminho, await arquivo.arrayBuffer(), { contentType: arquivo.type, upsert: false }), "enviar a certidão");
  if (!enviou) return;
  const salvou = await checar(admin.from("processo_certidoes").upsert({
    tenant_id: ctx.sessao.tenantId,
    processo_id: processoId,
    parte,
    cliente_id: clienteId,
    tipo: dados.tipo,
    resultado: dados.resultado,
    emitida_em: dados.emitida_em,
    valida_ate: dados.valida_ate,
    caminho,
    nome_arquivo: nomeArquivoDespesa(arquivo.name),
    mime: arquivo.type,
    tamanho: arquivo.size,
    criado_por: ctx.sessao.userId,
    criado_em: new Date().toISOString(),
  }, { onConflict: "processo_id,parte,tipo" }).select("id").single(), "salvar a certidão");
  if (!salvou) {
    await admin.storage.from(BUCKET_CERTIDOES).remove([caminho]);
    return;
  }
  if (anterior) await admin.storage.from(BUCKET_CERTIDOES).remove([anterior.caminho]);

  const c = certidaoPorChave(dados.tipo)!;
  await admin.from("historico").insert({
    processo_id: processoId,
    usuario_id: ctx.sessao.userId,
    acao: `Certidão anexada (${parte}): ${c.orgao} · ${c.nome}${dados.resultado === "positiva" ? " (positiva)" : ""}`,
  });
  revalidatePath(`/processos/${processoId}`);
  await avisar("sucesso", `Certidão ${c.orgao} · ${c.nome} anexada.`);
}

export async function removerCertidao(formData: FormData) {
  const processoId = campo(formData, "processo_id");
  const id = campo(formData, "id");
  const ctx = await autorizar(processoId);
  if (!ctx) return;
  const admin = createAdminClient();
  const { data: removida } = await admin.from("processo_certidoes").select("caminho, tipo, parte")
    .eq("id", id).eq("processo_id", processoId).eq("tenant_id", ctx.sessao.tenantId).maybeSingle();
  if (!removida) return void (await avisar("erro", "A certidão já foi removida ou substituída. Atualize a página."));
  // A condição no caminho evita apagar uma substituição feita em outra aba.
  const ok = await checar(admin.from("processo_certidoes").delete().eq("id", id).eq("caminho", removida.caminho).select("id").single(), "remover a certidão");
  if (!ok) return;
  await admin.storage.from(BUCKET_CERTIDOES).remove([removida.caminho]);
  const c = certidaoPorChave(removida.tipo);
  await admin.from("historico").insert({
    processo_id: processoId,
    usuario_id: ctx.sessao.userId,
    acao: `Certidão removida (${removida.parte}): ${c ? `${c.orgao} · ${c.nome}` : removida.tipo}`,
  });
  revalidatePath(`/processos/${processoId}`);
  await avisar("sucesso", "Certidão removida.");
}
