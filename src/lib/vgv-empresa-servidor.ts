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
  // Até 01/11/2026: base de contratos auditados. Desde 02/11/2026:
  // rateios salvos no processo substituem a comissão histórica do mesmo processo.
  // Parcerias não integram o VGC da Sacra + equipe.
  const inicioRateio = ano === 2026 ? "2026-11-02T03:00:00.000Z" : `${ano}-01-01T00:00:00.000Z`;
  const rateios: { processo_id: string; valor_previsto: number | null; tipo_beneficiario: string; beneficiario_id: string | null }[] = [];
  for (let inicio = 0; ; inicio += 500) {
    const { data, error } = await supabase.from("comissoes")
      .select("processo_id, valor_previsto, tipo_beneficiario, beneficiario_id, processos!inner(tenant_id, categoria, status)")
      .eq("processos.tenant_id", tenantId)
      .eq("processos.categoria", "venda")
      .neq("processos.status", "cancelado")
      .gte("criado_em", inicioRateio)
      .lt("criado_em", `${ano + 1}-01-01T00:00:00.000Z`)
      .neq("status", "cancelada")
      .order("criado_em", { ascending: true })
      .range(inicio, inicio + 499);
    if (error || !data) throw new Error("Não foi possível consultar os rateios dos processos.");
    rateios.push(...(data as unknown as typeof rateios));
    if (data.length < 500) break;
  }
  const processosComRateio = new Set(rateios.map(r => r.processo_id));
  const contratosHistoricos = comissoes.filter(c => !c.processoId || !processosComRateio.has(c.processoId));
  const vgcHistorico = somarVgcEmpresa(ano, vendas, contratosHistoricos, processosForaDoAno);
  const comissoesDaEquipe = rateios.filter(r => r.tipo_beneficiario !== "parceria" && (r.tipo_beneficiario === "sacra" || !!r.beneficiario_id));
  const novoVgcCentavos = comissoesDaEquipe.reduce((soma, r) => soma + Math.round(Number(r.valor_previsto ?? 0) * 100), 0);
  const vgc = { ...vgcHistorico, apuradoCentavos: vgcHistorico.apuradoCentavos + novoVgcCentavos, vendasConferidas: vgcHistorico.vendasConferidas + processosComRateio.size };
  return {
    corretagem: mediaCorretagem(ano, vendas, comissoes, CORRETAGEM_CONFERIDA, processosForaDoAno),
    vgc,
    ...somarVgvEmpresa(ano, vendas, historico, processosForaDoAno),
    ...rankingVgvEmpresa(ano, vendas, historico, corretores, processosForaDoAno)
  };
}
