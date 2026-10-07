import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const FILTROS = [
  { label: "A pagar hoje", tipo: "despesa", href: "/financeiro/contas-a-pagar?referencia=hoje&status=em_aberto#lista", vencido: false },
  { label: "A receber hoje", tipo: "receita", href: "/financeiro/contas-a-receber?referencia=hoje&status=em_aberto#lista", vencido: false },
  { label: "Despesas vencidas", tipo: "despesa", href: "/financeiro/contas-a-pagar?referencia=todos&status=vencido#lista", vencido: true },
  { label: "Receitas vencidas", tipo: "receita", href: "/financeiro/contas-a-receber?referencia=todos&status=vencido#lista", vencido: true },
] as const;

/** Contagem no banco: não fica limitada à primeira página de lançamentos. */
export async function obterPrioridadesFinanceiras(supabase: SupabaseClient<Database>, tenantId: string, hoje: string) {
  const resultados = await Promise.all(FILTROS.map((filtro) => {
    const query = supabase.from("financeiro_lancamentos").select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId).eq("tipo", filtro.tipo).in("status", ["pendente", "pago_parcial"]);
    return filtro.vencido ? query.lt("vencimento", hoje) : query.eq("vencimento", hoje);
  }));
  return {
    data: FILTROS.map((filtro, i) => ({ ...filtro, quantidade: resultados[i].count ?? 0 })),
    error: resultados.some((r) => !!r.error || r.count === null),
  };
}
