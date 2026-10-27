/** Regras puras de baixa (pagamento/recebimento) de um lançamento. */

/** Tolerância de arredondamento (meio centavo), a mesma usada no banco. */
const TOLERANCIA = 0.005;

export function saldoEmAberto(valorLancamento: number, baixas: { valor: number | string }[]): number {
  const pago = baixas.reduce((soma, b) => soma + Number(b.valor), 0);
  return Math.max(0, Math.round((Number(valorLancamento) - pago) * 100) / 100);
}

/** A baixa informada cabe no saldo em aberto? */
export function baixaCabeNoSaldo(valorBaixa: number, saldo: number): boolean {
  return valorBaixa > 0 && valorBaixa <= saldo + TOLERANCIA;
}
