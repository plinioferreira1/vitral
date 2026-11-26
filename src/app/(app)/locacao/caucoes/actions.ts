"use server";

import { revalidatePath } from "next/cache";
import { avisar } from "@/lib/aviso";
import { exigirUsuario } from "@/lib/usuario-atual";
import { getPermissoesUsuario } from "@/lib/permissoes";
import { reaisParaCentavos } from "@/lib/locacao/garantias";
import { createClient } from "@/lib/supabase/server";

const TIPOS = new Set(["deposito", "complemento", "rendimento", "utilizacao", "devolucao"]);

/**
 * Livro de movimentações declaradas. NÃO concilia com OFX e NÃO confirma
 * um recebimento bancário. Os registros são imutáveis por RLS.
 */
export async function registrarMovimentoCaucao(formData: FormData) {
  const sessao = await exigirUsuario();
  if (!sessao) return;
  const supabase = await createClient();
  const perms = await getPermissoesUsuario(supabase, sessao.userId, sessao.nivel);
  if (!perms.temLocacao || perms.ehCorretor || perms.ehSocialMedia) {
    await avisar("erro", "Você não possui permissão de acesso à Locação.");
    return;
  }

  const contratoId = String(formData.get("contrato_id") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "").trim();
  const dia = String(formData.get("data_movimento") ?? "").trim();
  const descricao = String(formData.get("descricao") ?? "").trim();
  const url = String(formData.get("comprovante_url") ?? "").trim();
  const centavos = reaisParaCentavos(formData.get("valor"));
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(dia) &&
    !Number.isNaN(Date.parse(dia)) &&
    new Date(dia + "T12:00:00Z").toISOString().slice(0, 10) === dia;

  if (!/^[0-9a-f-]{36}$/i.test(contratoId) || !TIPOS.has(tipo) ||
      !dataValida || !centavos || centavos > 100_000_000 ||
      descricao.length < 5 || descricao.length > 1000 ||
      (url && (!url.startsWith("https://") || url.length > 2048))) {
    await avisar("erro", "Confira tipo, data, valor positivo, descrição (5 a 1000 caracteres) e URL HTTPS do comprovante.");
    return;
  }

  const { data: contrato } = await supabase
    .from("contratos_locacao").select("id").eq("id", contratoId)
    .eq("tenant_id", sessao.tenantId).eq("garantia_locaticia", "Caução").maybeSingle();
  if (!contrato) {
    await avisar("erro", "Contrato com garantia em caução não encontrado nesta empresa.");
    return;
  }

  const { error } = await supabase.from("caucao_movimentacoes").insert({
    tenant_id: sessao.tenantId,
    contrato_id: contratoId,
    tipo, data_movimento: dia,
    valor_centavos: centavos,
    descricao,
    comprovante_url: url || null,
    criado_por: sessao.userId,
  });
  if (error) {
    await avisar("erro", "Não foi possível registrar a movimentação. Nenhum saldo foi alterado.");
    return;
  }
  revalidatePath("/locacao/caucoes");
  revalidatePath(`/locacao/caucoes/${contratoId}`);
  await avisar("sucesso", "Movimentação registrada como pendente de conferência bancária.");
}
