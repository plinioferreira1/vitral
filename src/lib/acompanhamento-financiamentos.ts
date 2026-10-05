export type EtapaAcompanhamento = {
  processo_id: string;
  nome: string;
  status: string;
  ordem: number;
  especial: boolean;
  data_prevista: string | null;
  usuarios: { nome: string } | null;
};

export function etapasAtuais(etapas: EtapaAcompanhamento[]) {
  const atuais: Record<string, EtapaAcompanhamento> = {};
  for (const etapa of [...etapas].sort((a, b) => a.ordem - b.ordem)) {
    if (!etapa.especial && etapa.status !== "concluida" && !atuais[etapa.processo_id]) {
      atuais[etapa.processo_id] = etapa;
    }
  }
  return atuais;
}
