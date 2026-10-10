export type VendaVgv = {
  id: string;
  categoria: string;
  status: string;
  valor_total: number | null;
  data_criacao: string;
  corretor_id?: string | null;
  captador_id?: string | null;
  participacao_vgv_revisada?: boolean;
};

export type VendaHistoricaVgv = {
  linha: number;
  valorCentavos: number;
  processoId?: string;
  participantesIds?: readonly string[];
};

/** O vínculo explícito substitui a linha da planilha pelo cadastro atual.
 * Não comparar só nomes ou preços: duas vendas podem ter o mesmo valor.
 */
export function somarVgvEmpresa(ano: number, vendas: readonly VendaVgv[], historico: readonly VendaHistoricaVgv[], processosForaDoAno: readonly string[] = []) {
  const foraDoAno = new Set(processosForaDoAno);
  const ids = new Set<string>();
  let cadastradoCentavos = 0;
  let semValor = 0;
  for (const venda of vendas) {
    if (ids.has(venda.id)) throw new Error("Processo duplicado no cálculo do VGV.");
    ids.add(venda.id);
    if (foraDoAno.has(venda.id) || venda.categoria !== "venda" || venda.status === "cancelado" ||
        !venda.data_criacao.startsWith(`${ano}-`)) continue;
    if (venda.valor_total === null || venda.valor_total === 0) {
      semValor++;
      continue;
    }
    const centavos = Math.round(venda.valor_total * 100);
    if (!Number.isSafeInteger(centavos) || centavos < 0) throw new Error("Valor de venda inválido.");
    cadastradoCentavos += centavos;
  }
  const linhas = new Set<number>();
  const vinculados = new Set<string>();
  let historicoCentavos = 0;
  for (const linha of historico) {
    if (linhas.has(linha.linha)) throw new Error("Linha duplicada no histórico de VGV.");
    linhas.add(linha.linha);
    if (linha.processoId) {
      if (vinculados.has(linha.processoId)) throw new Error("Processo vinculado a duas vendas históricas.");
      vinculados.add(linha.processoId);
      // Se o cadastro for excluído, cancelado ou mudar de ano, não recuperar
      // silenciosamente o valor antigo da planilha.
      continue;
    }
    if (!Number.isSafeInteger(linha.valorCentavos) || linha.valorCentavos < 0) throw new Error("Histórico inválido.");
    historicoCentavos += linha.valorCentavos;
  }
  const realizadoCentavos = cadastradoCentavos + historicoCentavos;
  if (!Number.isSafeInteger(realizadoCentavos)) throw new Error("VGV excede o limite de cálculo.");
  return { realizadoCentavos, cadastradoCentavos, historicoCentavos, semValor };
}

export type CorretorVgv = { id: string; nome: string; aliases?: readonly string[] };
export type LinhaRankingVgv = { id: string; nome: string; valorCentavos: number; vendas: number; posicao: number };

export function rankingVgvEmpresa(ano: number, vendas: readonly VendaVgv[], historico: readonly VendaHistoricaVgv[], corretores: readonly CorretorVgv[], processosForaDoAno: readonly string[] = []) {
  const foraDoAno = new Set(processosForaDoAno);
  const canonicos = new Map(corretores.flatMap(c => [c.id, ...(c.aliases ?? [])].map(id => [id, c.id] as const)));
  const ranking = new Map<string, Omit<LinhaRankingVgv, "posicao">>();
  const porProcesso = new Map(historico.filter(h => h.processoId).map(h => [h.processoId!, h]));
  let semParticipacao = 0;
  const atribuir = (valorCentavos: number, participantes: readonly string[] | undefined) => {
    if (participantes === undefined) semParticipacao++;
    const ids = new Set((participantes ?? []).flatMap(id => canonicos.has(id) ? [canonicos.get(id)!] : []));
    for (const id of ids) {
      const linha = ranking.get(id) ?? { id, nome: corretores.find(c => c.id === id)!.nome, valorCentavos: 0, vendas: 0 };
      linha.valorCentavos += valorCentavos;
      linha.vendas++;
      ranking.set(id, linha);
    }
  };
  for (const venda of vendas) {
    if (foraDoAno.has(venda.id) || venda.categoria !== "venda" || venda.status === "cancelado" || !venda.data_criacao.startsWith(`${ano}-`) || !venda.valor_total) continue;
    const linha = porProcesso.get(venda.id);
    const atuais = [venda.captador_id, venda.corretor_id].filter((id): id is string => !!id);
    // Captador preenchido indica os dois papéis informados no cadastro atual.
    // No histórico, preservar a participação explicitamente informada na planilha.
    const participantes = venda.participacao_vgv_revisada || venda.captador_id ? atuais : linha?.participantesIds ?? (atuais.length ? atuais : undefined);
    atribuir(Math.round(venda.valor_total * 100), participantes);
  }
  for (const linha of historico) {
    if (!linha.processoId && linha.valorCentavos > 0) atribuir(linha.valorCentavos, linha.participantesIds);
  }
  const ordenado = [...ranking.values()].sort((a, b) => b.valorCentavos - a.valorCentavos || a.nome.localeCompare(b.nome, "pt-BR"));
  return { ranking: ordenado.map((linha) => ({ ...linha, posicao: ordenado.findIndex(r => r.valorCentavos === linha.valorCentavos) + 1 })), semParticipacao };
}
