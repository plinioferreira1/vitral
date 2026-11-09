import { createClient } from "@/lib/supabase/server";
import { FONTES_LEADS } from "@/lib/vendas/fontes-leads";

/** Mescla opções padrão + opções cadastradas, sem perder fontes antigas em uso. */
export async function obterFontesLead(tenantId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendas_fontes_personalizadas")
    .select("nome")
    .eq("tenant_id", tenantId)
    .eq("ativo", true)
    .order("nome");
  if (error) throw new Error("Não foi possível carregar fontes de leads: " + error.message);
  const fontes = new Map<string, string>();
  for (const nome of [...FONTES_LEADS, ...(data ?? []).map(f => f.nome)]) {
    const chave = nome.trim().toLocaleLowerCase("pt-BR");
    if (chave && !fontes.has(chave)) fontes.set(chave, nome.trim());
  }
  return [...fontes.values()];
}
