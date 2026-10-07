import "server-only";
import { randomUUID } from "node:crypto";
import { avisar, checar } from "@/lib/aviso";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario, GESTORES } from "@/lib/usuario-atual";
import { BUCKET_DESPESAS, conteudoArquivoValido, erroArquivoDespesa, nomeArquivoDespesa } from "./anexo-despesa";

export async function validarAnexoDespesa(entrada: FormDataEntryValue | null) {
  if (!(entrada instanceof File) || !entrada.size) return { arquivo: null, erro: null };
  const erro = erroArquivoDespesa(entrada);
  if (erro) return { arquivo: null, erro };
  if (!conteudoArquivoValido(new Uint8Array(await entrada.slice(0, 12).arrayBuffer()), entrada.type)) {
    return { arquivo: null, erro: "O conteúdo do arquivo não corresponde a um PDF ou imagem válida." };
  }
  return { arquivo: entrada, erro: null };
}

/** Autorização também aqui: chamado pela criação e pela tela de anexos. */
export async function salvarAnexoDespesa(id: string, arquivo: File): Promise<boolean> {
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return false;
  const supabase = await createClient();
  const { data: despesa } = await supabase.from("financeiro_lancamentos").select("id")
    .eq("id", id).eq("tenant_id", sessao.tenantId).eq("tipo", "despesa").single();
  if (!despesa) {
    await avisar("erro", "Despesa não encontrada ou sem permissão de acesso.");
    return false;
  }
  const validacao = await validarAnexoDespesa(arquivo);
  if (validacao.erro || !validacao.arquivo) {
    await avisar("erro", validacao.erro ?? "Escolha um arquivo para anexar.");
    return false;
  }
  const admin = createAdminClient();
  const anterior = (await admin.from("financeiro_anexos").select("caminho")
    .eq("lancamento_id", id).eq("tenant_id", sessao.tenantId).maybeSingle()).data;
  const extensao = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[arquivo.type];
  const caminho = `${sessao.tenantId}/${id}/${randomUUID()}.${extensao}`;
  const enviou = await checar(admin.storage.from(BUCKET_DESPESAS).upload(caminho, await arquivo.arrayBuffer(), {
    contentType: arquivo.type, upsert: false,
  }), "enviar o anexo");
  if (!enviou) return false;
  const salvou = await checar(admin.from("financeiro_anexos").upsert({
    lancamento_id: id, tenant_id: sessao.tenantId, caminho,
    nome: nomeArquivoDespesa(arquivo.name), mime: arquivo.type, tamanho: arquivo.size,
    criado_por: sessao.userId, criado_em: new Date().toISOString(),
  }).select("lancamento_id").single(), "salvar o anexo");
  if (!salvou) {
    await admin.storage.from(BUCKET_DESPESAS).remove([caminho]);
    return false;
  }
  if (anterior) await admin.storage.from(BUCKET_DESPESAS).remove([anterior.caminho]);
  return true;
}
