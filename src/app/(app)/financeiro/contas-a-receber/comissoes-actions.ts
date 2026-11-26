"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { avisar } from "@/lib/aviso";
import { createClient } from "@/lib/supabase/server";

/**
 * Publica UMA comissão já documentada no Financeiro após confirmação da
 * data de vencimento. A função SQL usa trava de linha e chave documental,
 * evitando criar duas receitas para a mesma parcela.
 * Nenhuma baixa é gerada automaticamente: usuário informa o que recebeu.
 */
export async function publicarComissaoSacra(formData: FormData) {
  const id = String(formData.get("comissao_id") ?? "").trim();
  const vencimento = String(formData.get("vencimento") ?? "").trim();
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(vencimento) &&
    new Date(vencimento + "T12:00:00Z").toISOString().slice(0,10) === vencimento;

  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id) || !dataValida) {
    await avisar("erro", "Informe uma data válida para a parcela da comissão.");
    return;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("financeiro_publicar_comissao_prevista", {
    p_id: id,
    p_vencimento: vencimento,
  });
  if (error || !data) {
    await avisar("erro", "Não foi possível lançar a parcela. Confira o vencimento e suas permissões.");
    return;
  }
  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/financeiro");
  redirect(`/financeiro/lancamentos/${data}/baixar?return_to=%2Ffinanceiro%2Fcontas-a-receber%23comissoes-sacra`);
}
