import { saldoEmAberto } from "./baixa";

type Lancamento = { id: string; valor: number | string; status: string };
type Baixa = { lancamento_id: string; valor: number | string };

/** A lista já deve estar filtrada por vencimento e demais critérios, antes da paginação.
 * Recorrências são ocorrências reais: nunca agrupar por recorrencia_id nem projetar outras. */
export function resumoLista(lancamentos: Lancamento[], baixas: Baixa[]) {
  const porLancamento = new Map<string, Baixa[]>();
  for (const b of baixas) {
    const grupo = porLancamento.get(b.lancamento_id) ?? [];
    grupo.push(b);
    porLancamento.set(b.lancamento_id, grupo);
  }
  let abertoCentavos = 0;
  let baixadoCentavos = 0;
  let nominalCentavos = 0;
  for (const l of lancamentos) {
    if (l.status === "cancelado") continue;
    const pagamentos = porLancamento.get(l.id) ?? [];
    nominalCentavos += Math.round(Number(l.valor) * 100);
    baixadoCentavos += pagamentos.reduce((s, b) => s + Math.round(Number(b.valor) * 100), 0);
    if (l.status === "pendente" || l.status === "pago_parcial") {
      abertoCentavos += Math.round(saldoEmAberto(Number(l.valor), pagamentos) * 100);
    }
  }
  return { aberto: abertoCentavos / 100, baixado: baixadoCentavos / 100, nominal: nominalCentavos / 100 };
}

/** Lê todas as páginas com ordenação estável definida na consulta. Erro nunca vira total zero. */
export async function lerTodasPaginas<T>(buscar: (inicio: number, fim: number) => PromiseLike<{
  data: T[] | null; error: { message: string } | null;
}>) {
  const data: T[] = [];
  const tamanho = 500;
  for (let inicio = 0; ; inicio += tamanho) {
    const pagina = await buscar(inicio, inicio + tamanho - 1);
    if (pagina.error) throw new Error(`Não foi possível carregar o financeiro: ${pagina.error.message}`);
    data.push(...(pagina.data ?? []));
    if ((pagina.data?.length ?? 0) < tamanho) return { data };
  }
}
