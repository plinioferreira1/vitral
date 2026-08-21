import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Busca a ordem canônica de colunas (nomes das etapas sequenciais,
 * sem as especiais) pra uma categoria, baseada em Etapas padrão.
 */
export async function colunasKanban(
  supabase: SupabaseClient,
  tenantId: string,
  categoria: string
): Promise<string[]> {
  const { data } = await supabase
    .from("etapas_padrao")
    .select("nome, ordem, tipo")
    .eq("tenant_id", tenantId)
    .eq("categoria", categoria)
    .neq("tipo", "especial")
    .order("ordem", { ascending: true });

  const nomes: string[] = [];
  (data ?? []).forEach((e) => {
    if (!nomes.includes(e.nome)) nomes.push(e.nome);
  });
  return nomes;
}

/**
 * Pra cada processo_id, acha a etapa atual: a primeira etapa
 * sequencial (não especial) ainda não concluída, na ordem. Se
 * todas estiverem concluídas (ou não houver etapas sequenciais),
 * o processo entra como null (cai na coluna "Sem etapa em aberto").
 */
export async function etapaAtualPorProcesso(
  supabase: SupabaseClient,
  tenantId: string,
  categoria: string,
  processoIds: string[]
): Promise<Map<string, string | null>> {
  const resultado = new Map<string, string | null>();
  if (processoIds.length === 0) return resultado;

  const { data: especiais } = await supabase
    .from("etapas_padrao")
    .select("nome")
    .eq("tenant_id", tenantId)
    .eq("categoria", categoria)
    .eq("tipo", "especial");
  const nomesEspeciais = new Set((especiais ?? []).map((e) => e.nome));

  const { data: etapasRaw } = await supabase
    .from("etapas")
    .select("processo_id, nome, status, ordem")
    .in("processo_id", processoIds)
    .order("ordem", { ascending: true });

  const etapasPorProcesso = new Map<string, { nome: string; status: string }[]>();
  (etapasRaw ?? [])
    .filter((e) => !nomesEspeciais.has(e.nome))
    .forEach((e) => {
      const lista = etapasPorProcesso.get(e.processo_id) ?? [];
      lista.push({ nome: e.nome, status: e.status });
      etapasPorProcesso.set(e.processo_id, lista);
    });

  processoIds.forEach((id) => {
    const etapas = etapasPorProcesso.get(id) ?? [];
    const atual = etapas.find((e) => e.status !== "concluida");
    resultado.set(id, atual?.nome ?? null);
  });

  return resultado;
}
