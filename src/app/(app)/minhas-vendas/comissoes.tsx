import { dataVenda, STATUS_COMISSAO, valorComissao, type ComissaoCorretor } from "@/lib/minhas-vendas";

export function DadosComissao({ comissao: c }: { comissao: ComissaoCorretor }) {
 return <div className="min-w-0 space-y-3">
  <p className={`text-sm font-semibold ${c.status === "100% pago" ? "text-emerald-700" : c.status === "cancelada" ? "text-ink-muted" : "text-amber-800"}`}>{STATUS_COMISSAO[c.status] ?? c.status}</p>
  <dl className="grid gap-3 sm:grid-cols-2">{[["Valor da comissão", valorComissao(c.valor_previsto)], ["Valor recebido registrado", valorComissao(c.valor_recebido)], ["Previsão de pagamento", c.data_prevista ? dataVenda(c.data_prevista) : "Não informada"], ["Data de pagamento registrada", c.data_recebida ? dataVenda(c.data_recebida) : "Não informada"]].map(([nome, valor]) => <div key={nome}><dt className="text-xs text-ink-muted">{nome}</dt><dd className="mt-1 break-words text-sm">{valor}</dd></div>)}</dl>
 </div>;
}

export function ComissoesVenda({ comissoes }: { comissoes: ComissaoCorretor[] }) {
 return <section className="rounded-xl border border-border bg-white p-5"><h2 className="font-semibold">Minhas comissões nesta venda</h2><p className="mt-1 text-sm text-ink-muted">Valores e pagamentos registrados pela equipe para você.</p>{comissoes.length ? <ul className="mt-4 divide-y divide-border">{comissoes.map(c => <li key={c.id} className="py-4"><DadosComissao comissao={c} /></li>)}</ul> : <p className="mt-4 text-sm text-ink-muted">Ainda não há comissão cadastrada para você nesta venda.</p>}</section>;
}
