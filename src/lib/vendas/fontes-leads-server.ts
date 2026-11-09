import { createClient } from "@/lib/supabase/server";
import { FONTES_PADRAO, categoriaValida, type FonteAgrupada } from "@/lib/vendas/fontes-leads";

/** Mescla opções fixas e próprias sem reescrever os valores das vendas anteriores. */
export async function obterFontesLead(tenantId: string): Promise<FonteAgrupada[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("vendas_fontes_personalizadas")
    .select("nome,categoria").eq("tenant_id", tenantId).eq("ativo", true).order("nome");
  if (error) throw new Error("Não foi possível carregar as fontes de leads: " + error.message);
  const unicas = new Map<string, FonteAgrupada>();
  for (const f of [...FONTES_PADRAO, ...(data ?? []).map(f => ({
    nome: f.nome, categoria: categoriaValida(f.categoria) ? f.categoria : "outros" as const,
  }))]) {
    const chave = f.nome.trim().toLocaleLowerCase("pt-BR");
    if (chave && !unicas.has(chave)) unicas.set(chave, { nome: f.nome.trim(), categoria: f.categoria });
  }
  return [...unicas.values()];
}
