import { mediaCorretagem } from "./media-corretagem";
import { CORRETAGEM_CONFERIDA } from "@/app/(app)/painel-sacra/corretagem-conferida";
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { somarVgcEmpresa, type ComissaoConferidaVgc } from "./vgc-empresa";
import type { Database } from "@/lib/database.types";
import { somarVgvEmpresa, type VendaHistoricaVgv, type VendaVgv, rankingVgvEmpresa, type CorretorVgv } from "./vgv-empresa";

/** Consulta com RLS e empresa explícita; pagina para não truncar o VGV em 1.000 vendas. */
export async function obterVgvEmpresa(supabase: SupabaseClient<Database>, tenantId: string, ano: number, historico: readonly VendaHistoricaVgv[], corretores: readonly CorretorVgv[], processosForaDoAno: readonly string[] = [], comissoes: readonly ComissaoConferidaVgc[] = []) {
  const vendas: VendaVgv[] = [];
  const tamanho = 500;
  for (let inicio = 0; ; inicio += tamanho) {
    const { data, error } = await supabase.from("processos")
      .select("id, categoria, status, valor_total, data_criacao, corretor_id, captador_id, participacao_vgv_revisada")
      .eq("tenant_id", tenantId).eq("categoria", "venda")
      .gte("data_criacao", `${ano}-01-01`).lt("data_criacao", `${ano + 1}-01-01`)
      .order("id").range(inicio, inicio + tamanho - 1);
    if (error || !data) throw new Error("Não foi possível consultar o VGV. Tente novamente.");
    vendas.push(...data);
    if (data.length < tamanho) break;
  }
  // Rateios dos processos são exibidos separadamente do VGC contratual auditado;
  // nunca somar os dois, pois um processo pode já constar na base conferida.
  let rateioCentavos = 0;
  let rateioRegistros = 0;
  for (let inicio = 0; ; inicio += 500) {
    const { data, error } = await supabase.from("comissoes")
      .select("valor_previsto, status, processos!inner(tenant_id, categoria, data_criacao, status)")
      .eq("processos.tenant_id", tenantId)
      .eq("processos.categoria", "venda")
      .neq("processos.status", "cancelado")
      .gte("processos.data_criacao", `${ano}-01-01`)
      .lt("processos.data_criacao", `${ano + 1}-01-01`)
      .neq("status", "cancelada")
      .range(inicio, inicio + 499);
    if (error || !data) throw new Error("Não foi possível consultar as comissões dos processos.");
    for (const c of data) {
      rateioCentavos += Math.round(Number(c.valor_previsto ?? 0) * 100);
      rateioRegistros++;
    }
    if (data.length < 500) break;
  }
  return { rateioProcessos: { valorCentavos: rateioCentavos, registros: rateioRegistros }, corretagem: mediaCorretagem(ano, vendas, comissoes, CORRETAGEM_CONFERIDA, processosForaDoAno), vgc: somarVgcEmpresa(ano, vendas, comissoes, processosForaDoAno), ...somarVgvEmpresa(ano, vendas, historico, processosForaDoAno), ...rankingVgvEmpresa(ano, vendas, historico, corretores, processosForaDoAno) };
}
