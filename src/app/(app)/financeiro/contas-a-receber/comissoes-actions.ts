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
  const dataVencimento = new Date(vencimento + "T12:00:00Z");
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(vencimento) &&
    !Number.isNaN(dataVencimento.getTime()) && dataVencimento.toISOString().slice(0, 10) === vencimento;

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

/** Associação somente após confirmação EXPLÍCITA de que o crédito já pago pertence à parcela. */
export async function vincularComissaoSacraRecebida(formData: FormData) {
  const comissaoId = String(formData.get("comissao_id") ?? "").trim();
  const lancamentoId = String(formData.get("lancamento_id") ?? "").trim();
  const uuid = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
  if (!uuid.test(comissaoId) || !uuid.test(lancamentoId) ||
      formData.get("confirmo_identidade") !== "sim") {
    await avisar("erro","Confirme expressamente a identidade do crédito e da parcela.");
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("financeiro_vincular_comissao_recebida",{
    p_id: comissaoId,p_lancamento_id: lancamentoId,
  });
  if (error) {
    await avisar("erro","Não foi possível vincular: confira valor, status quitado e se já existe outra parcela associada.");
    return;
  }
  revalidatePath("/financeiro/contas-a-receber");
  await avisar("sucesso","Recebimento existente vinculado à comissão, sem criar lançamento ou baixa duplicados.");
}
