"use server";

import { revalidatePath } from "next/cache";
import { avisar, checar } from "@/lib/aviso";
import { BUCKET_DESPESAS, caminhoAnexoValido } from "@/lib/anexo-despesa";
import { salvarAnexoDespesa, validarAnexoDespesa } from "@/lib/anexo-despesa-servidor";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigirUsuario, GESTORES } from "@/lib/usuario-atual";

function revalidar(id: string) {
  revalidatePath(`/financeiro/lancamentos/${id}/anexos`);
  revalidatePath(`/financeiro/lancamentos/${id}/editar`);
  revalidatePath("/financeiro/contas-a-pagar");
}

export async function enviarAnexo(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const id = String(formData.get("id") ?? "");
  const { arquivo, erro } = await validarAnexoDespesa(formData.get("anexo"));
  if (erro || !arquivo) {
    await avisar("erro", erro ?? "Escolha um arquivo para anexar.");
    return;
  }
  if (await salvarAnexoDespesa(id, arquivo)) {
    revalidar(id);
    await avisar("sucesso", "Arquivo anexado à despesa.");
  }
}

export async function removerAnexo(formData: FormData) {
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return;
  const id = String(formData.get("id") ?? "");
  const caminho = String(formData.get("caminho") ?? "");
  if (!caminhoAnexoValido(caminho, sessao.tenantId, id)) return;
  const supabase = await createClient();
  const { data: anexo } = await supabase.from("financeiro_anexos").select("caminho")
    .eq("lancamento_id", id).eq("tenant_id", sessao.tenantId).eq("caminho", caminho).single();
  if (!anexo) {
    await avisar("erro", "O anexo foi alterado ou não está disponível. Atualize a página.");
    return;
  }
  const admin = createAdminClient();
  // A condição no caminho evita remover uma substituição feita em outra aba.
  const removeu = await checar(admin.from("financeiro_anexos").delete()
    .eq("lancamento_id", id).eq("tenant_id", sessao.tenantId).eq("caminho", caminho)
    .select("lancamento_id").single(), "remover o anexo");
  if (!removeu) return;
  await admin.storage.from(BUCKET_DESPESAS).remove([caminho]);
  revalidar(id);
  await avisar("sucesso", "Anexo removido. A despesa foi mantida.");
}
