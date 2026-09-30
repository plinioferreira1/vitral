/**
 * Organiza as etapas e os prazos de contrato dos processos em aberto
 * para o e-mail diário de processos. Função pura (sem banco) para poder
 * ser testada; as datas são "AAAA-MM-DD".
 */

export type ProcessoResumo = {
  id: string;
  numero_processo: string;
  categoria: string;
  endereco: string | null;
  data_final_contrato: string | null;
};

export type EtapaResumo = {
  id: string;
  nome: string;
  data_prevista: string;
  processo_id: string;
  responsavel: string | null;
};

export type ItemEtapa = {
  processoId: string;
  imovel: string;
  categoria: string;
  etapa: string;
  data: string;
  /** negativo = dias de atraso; 0 = hoje */
  dias: number;
  responsavel: string | null;
};

export type ItemPrazo = {
  processoId: string;
  imovel: string;
  categoria: string;
  data: string;
  dias: number;
};

export type ResumoProcessos = {
  processosEmAndamento: number;
  atrasadas: ItemEtapa[];
  hoje: ItemEtapa[];
  proximos: ItemEtapa[];
  prazosContrato: ItemPrazo[];
};

export const DIAS_PROXIMAS_ETAPAS = 7;
export const DIAS_PRAZO_CONTRATO = 30;

export function diferencaDias(deIso: string, ateIso: string): number {
  const [a1, m1, d1] = deIso.split("-").map(Number);
  const [a2, m2, d2] = ateIso.split("-").map(Number);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

export function montarResumoProcessos(
  processos: ProcessoResumo[],
  etapas: EtapaResumo[],
  hojeIso: string
): ResumoProcessos {
  const porId = new Map(processos.map((p) => [p.id, p]));
  const imovel = (p: ProcessoResumo) => p.endereco?.trim() || p.numero_processo;

  const itens: ItemEtapa[] = [];
  for (const e of etapas) {
    const p = porId.get(e.processo_id);
    if (!p || !e.data_prevista) continue;
    const dias = diferencaDias(hojeIso, e.data_prevista);
    if (dias > DIAS_PROXIMAS_ETAPAS) continue;
    itens.push({
      processoId: p.id,
      imovel: imovel(p),
      categoria: p.categoria,
      etapa: e.nome,
      data: e.data_prevista,
      dias,
      responsavel: e.responsavel,
    });
  }
  itens.sort((a, b) => a.data.localeCompare(b.data) || a.imovel.localeCompare(b.imovel));

  const prazosContrato: ItemPrazo[] = processos
    .filter((p) => p.data_final_contrato)
    .map((p) => ({
      processoId: p.id,
      imovel: imovel(p),
      categoria: p.categoria,
      data: p.data_final_contrato as string,
      dias: diferencaDias(hojeIso, p.data_final_contrato as string),
    }))
    .filter((p) => p.dias <= DIAS_PRAZO_CONTRATO)
    .sort((a, b) => a.dias - b.dias);

  return {
    processosEmAndamento: processos.length,
    atrasadas: itens.filter((i) => i.dias < 0),
    hoje: itens.filter((i) => i.dias === 0),
    proximos: itens.filter((i) => i.dias > 0),
    prazosContrato,
  };
}

/** "vence hoje", "em 3 dias", "há 5 dias" */
export function descreverDias(dias: number): string {
  if (dias === 0) return "hoje";
  if (dias > 0) return `em ${dias} dia${dias === 1 ? "" : "s"}`;
  const n = Math.abs(dias);
  return `há ${n} dia${n === 1 ? "" : "s"}`;
}
