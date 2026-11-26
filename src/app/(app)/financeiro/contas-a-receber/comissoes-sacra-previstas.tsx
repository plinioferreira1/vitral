import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BotaoEnviar } from "@/components/botao-enviar";
import { publicarComissaoSacra, vincularComissaoSacraRecebida } from "./comissoes-actions";

const moeda = (valor: number) => Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatarData = (data: string) => data.split("-").reverse().join("/");

export async function ComissoesSacraPrevistas() {
  const supabase = await createClient();
  // RLS limita a diretoria e gerência da mesma empresa; não contorna
  // permissões do Financeiro para corretores ou outros perfis.
  const { data, error } = await supabase
    .from("financeiro_comissoes_previstas")
    .select("id,codigo_referencia,imovel_nome,parcela_numero,parcelas_total,valor,competencia,condicao_pagamento,documento_url,observacoes,vencimento,lancamento_id,processo_id")
    .order("competencia", { ascending: false })
    .order("imovel_nome")
    .order("parcela_numero");

  if (error || !data?.length) return null;

  // Créditos bancários já registrados podem coincidir exatamente com uma
  // parcela. Apenas sinalizar para conferência; valor igual NÃO comprova
  // identidade nem autoriza vincular/baixar automaticamente.
  const { data: creditosExistentes } = await supabase
    .from("financeiro_lancamentos")
    .select("id,descricao,valor,vencimento")
    .eq("tipo", "receita")
    .eq("status", "pago")
    .gte("vencimento", "2026-08-26")
    .lte("vencimento", "2026-11-26");
  const valoresDeCredito = new Map<number, { id: string; descricao: string; vencimento: string }[]>();
  for (const credito of creditosExistentes ?? []) {
    const centavos = Math.round(Number(credito.valor) * 100);
    valoresDeCredito.set(centavos, [
      ...(valoresDeCredito.get(centavos) ?? []),
      { id: credito.id, descricao: credito.descricao, vencimento: credito.vencimento },
    ]);
  }

  const abertos = data.filter(p => !p.lancamento_id);
  const totalEmConferencia = abertos.reduce((s,p) => s+Number(p.valor),0);
  const grupos = new Map<string, typeof data>();
  for (const p of data) grupos.set(p.codigo_referencia, [...(grupos.get(p.codigo_referencia) ?? []),p]);

  return (
    <section id="comissoes-sacra" className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-ink">Comissões de venda da Sacra · conferência</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-ink-muted">
            Vendas documentadas no Drive, com participação exclusiva da Sacra e parcelas individualizadas.
            Valores sem vencimento confirmado <strong>não estão no saldo normal de Contas a Receber</strong> e não aparecem como atrasados.
            Confirme a data contratual ou a data do evento de pagamento para transferir cada parcela ao Financeiro.
          </p>
        </div>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
          {abertos.length} parcela(s) aguardando conferência
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-background p-4">
          <p className="text-xs font-medium text-ink-muted">Previsão documental ainda não lançada</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-ink">{moeda(totalEmConferencia)}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-background p-4">
          <p className="text-xs font-medium text-ink-muted">Vendas identificadas</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-ink">{grupos.size}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-background p-4">
          <p className="text-xs font-medium text-ink-muted">Parcelas enviadas ao Financeiro</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-ink">{data.length - abertos.length}</p>
        </div>
      </div>
      <div className="space-y-3">
        {[...grupos.entries()].map(([codigo, parcelas]) => (
          <details key={codigo} className="group rounded-xl border border-border/80 bg-background" open={parcelas.some(p=>!p.lancamento_id)}>
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-3">
              <span className="font-semibold text-sm text-ink">
                {parcelas[0].imovel_nome} <span className="ml-1 text-xs font-normal text-ink-muted">SAN {codigo}</span>
              </span>
              <span className="text-sm font-semibold tabular-nums text-brand">{moeda(parcelas.reduce((s,p)=>s+Number(p.valor),0))} · {parcelas.length} {parcelas.length===1?"parcela":"parcelas"}</span>
            </summary>
            <div className="divide-y divide-border border-t border-border">
              {parcelas.map(p => (
                <div key={p.id} className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">Parcela {p.parcela_numero}/{p.parcelas_total} · {moeda(p.valor)}</p>
                    {p.lancamento_id ?
                      <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
                        href={`/financeiro/lancamentos/${p.lancamento_id}/baixar?return_to=%2Ffinanceiro%2Fcontas-a-receber%23comissoes-sacra`}>
                        Ver lançamento / dar baixa
                      </Link> :
                      <span className="text-xs font-semibold text-amber-800">Vencimento a confirmar</span>
                    }
                  </div>
                  <p className="text-xs leading-5 text-ink-muted">Condição: {p.condicao_pagamento}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    <a className="font-medium text-brand hover:underline" href={p.documento_url} target="_blank" rel="noopener noreferrer">Conferir contrato no Drive</a>
                    {p.processo_id && <Link className="font-medium text-brand hover:underline" href={`/processos/${p.processo_id}`}>Ver venda no VITRAL</Link>}
                    {p.observacoes && <span className="text-ink-muted">{p.observacoes}</span>}
                  </div>
                  {!p.lancamento_id && (valoresDeCredito.get(Math.round(Number(p.valor) * 100)) ?? []).map(credito => (
                    <div key={credito.id} className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs leading-5 text-amber-950">
                      <strong>Possível crédito já recebido — confira antes de lançar.</strong>{" "}
                      Foi encontrado um recebimento com valor idêntico no Financeiro em {formatarData(credito.vencimento)}:
                      {" "}{credito.descricao}.{" "}
                      <Link className="font-semibold underline"
                        href={`/financeiro/lancamentos/${credito.id}/baixar?return_to=%2Ffinanceiro%2Fcontas-a-receber%23comissoes-sacra`}>
                        Conferir esse recebimento
                      </Link>.
                      Não foi vinculado automaticamente.
                      <form action={vincularComissaoSacraRecebida}
                        className="mt-2 flex flex-wrap items-end gap-2 border-t border-amber-200 pt-2">
                        <input type="hidden" name="comissao_id" value={p.id} />
                        <input type="hidden" name="lancamento_id" value={credito.id} />
                        <label className="inline-flex items-start gap-2 text-xs">
                          <input type="checkbox" name="confirmo_identidade" value="sim" required
                            className="mt-1 h-4 w-4" />
                          Confirmo, após conferir comprovante e pagador, que este crédito corresponde a esta parcela específica.
                        </label>
                        <BotaoEnviar
                          className="min-h-11 rounded-lg border border-amber-700 px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100"
                          textoEnviando="Vinculando…">
                          Vincular crédito já recebido (sem nova baixa)
                        </BotaoEnviar>
                      </form>
                    </div>
                  ))}
                  {p.lancamento_id ? (
                    <p className="text-xs text-emerald-700">Transferida ao Financeiro · vencimento {p.vencimento ? formatarData(p.vencimento) : "—"}. A baixa é registrada separadamente.</p>
                  ) : (
                    <form action={publicarComissaoSacra} className="flex flex-wrap items-end gap-3 rounded-lg border border-border/70 p-3">
                      <input type="hidden" name="comissao_id" value={p.id} />
                      <label className="text-xs font-semibold text-ink-muted">
                        Vencimento confirmado
                        <input type="date" name="vencimento" required
                          className="mt-1 block min-h-11 rounded-lg border border-border bg-surface px-3 text-base text-ink sm:text-sm" />
                      </label>
                      <BotaoEnviar className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90" textoEnviando="Registrando…">
                        Lançar e abrir baixa
                      </BotaoEnviar>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
      <p className="text-xs leading-5 text-ink-muted">
        Atenção: o valor é a cota da Sacra, não a comissão bruta do negócio.
        As parcelas não têm baixa automática; após informar o vencimento, cada uma passa a ter um lançamento de receita próprio.
        Casa Areal, Castanheiras, Flor das Águas e SQS 410 Bloco R foram excluídos.
      </p>
    </section>
  );
}
