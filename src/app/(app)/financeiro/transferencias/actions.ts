"use server";

import { avisar, checar } from "@/lib/aviso";
import { moedaParaNumero } from "@/lib/moeda";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario, GESTORES } from "@/lib/usuario-atual";
import { revalidatePath } from "next/cache";

function revalidarSaldos() {
  revalidatePath("/financeiro/transferencias");
  revalidatePath("/financeiro/contas-bancarias");
  revalidatePath("/financeiro");
}

/** Move dinheiro de uma conta da empresa para outra (não é receita nem despesa). */
export async function criarTransferencia(formData: FormData) {
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return;

  const origem = String(formData.get("conta_origem_id") ?? "");
  const destino = String(formData.get("conta_destino_id") ?? "");
  const valor = moedaParaNumero(formData.get("valor"));
  const data = String(formData.get("data") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim() || null;

  if (!origem || !destino || !data) {
    await avisar("erro", "Informe a conta de origem, a de destino e a data.");
    return;
  }
  if (origem === destino) {
    await avisar("erro", "A conta de origem e a de destino precisam ser diferentes.");
    return;
  }
  if (!valor || valor <= 0) {
    await avisar("erro", "Informe um valor maior que zero.");
    return;
  }

  const supabase = await createClient();
  const salvou = await checar(
    supabase.from("financeiro_transferencias").insert({
      tenant_id: sessao.tenantId,
      conta_origem_id: origem,
      conta_destino_id: destino,
      valor,
      data,
      descricao,
      criado_por: sessao.userId,
    }),
    "salvar a transferência"
  );
  if (!salvou) return;

  await avisar("sucesso", "Transferência registrada.");
  revalidarSaldos();
}

export async function apagarTransferencia(formData: FormData) {
  const sessao = await exigirUsuario(GESTORES);
  if (!sessao) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const apagou = await checar(supabase.from("financeiro_transferencias").delete().eq("id", id), "excluir a transferência");
  if (!apagou) return;

  await avisar("sucesso", "Transferência excluída.");
  revalidarSaldos();
}
