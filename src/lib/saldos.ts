/**
 * Movimento de cada conta bancária: soma das baixas (recebimento +,
 * pagamento −) e das transferências (entrada +, saída −). O saldo atual
 * de uma conta é `saldo_inicial + movimento`.
 *
 * Única fonte do cálculo — usada pelo Resumo, pela lista de Bancos e
 * pela tela da conta, para que todas mostrem o mesmo saldo.
 */

export type BaixaMovimento = {
  conta_bancaria_id: string | null;
  valor: number | string;
  data?: string | null;
  /** tipo do lançamento baixado: "receita" soma, qualquer outro subtrai */
  tipo: string | null | undefined;
};

export type TransferenciaMovimento = {
  conta_origem_id: string;
  conta_destino_id: string;
  valor: number | string;
  data: string;
};

/**
 * @param ateData se informada (AAAA-MM-DD), só considera movimentos até
 * essa data, inclusive — usado para comparar com o saldo de dias atrás.
 */
export function movimentoPorConta(
  baixas: BaixaMovimento[],
  transferencias: TransferenciaMovimento[] = [],
  ateData?: string
): Map<string, number> {
  const mapa = new Map<string, number>();
  const somar = (conta: string, delta: number) => mapa.set(conta, (mapa.get(conta) ?? 0) + delta);

  for (const b of baixas) {
    if (!b.conta_bancaria_id) continue;
    if (ateData && b.data && b.data > ateData) continue;
    somar(b.conta_bancaria_id, b.tipo === "receita" ? Number(b.valor) : -Number(b.valor));
  }
  for (const t of transferencias) {
    if (ateData && t.data > ateData) continue;
    somar(t.conta_origem_id, -Number(t.valor));
    somar(t.conta_destino_id, Number(t.valor));
  }
  // evita "-0,00" e resíduos de ponto flutuante
  for (const [conta, v] of mapa) mapa.set(conta, Math.round(v * 100) / 100);
  return mapa;
}

/** Converte o formato do Supabase (baixa com o lançamento embutido). */
export function baixasParaMovimento(
  linhas: { conta_bancaria_id?: string | null; valor: number | string; data?: string | null; financeiro_lancamentos?: unknown }[] | null
): BaixaMovimento[] {
  return (linhas ?? []).map((b) => ({
    conta_bancaria_id: b.conta_bancaria_id ?? null,
    valor: b.valor,
    data: b.data ?? null,
    tipo: (b.financeiro_lancamentos as { tipo?: string } | null)?.tipo,
  }));
}
