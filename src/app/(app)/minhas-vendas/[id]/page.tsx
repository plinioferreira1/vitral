import Link from "next/link";
import { notFound } from "next/navigation";
import { obterMinhasVendas } from "../dados";
import { dataVenda, resumoVenda, STATUS_VENDA, STATUS_ETAPA } from "@/lib/minhas-vendas";
import { ComissoesVenda } from "../comissoes";
import { hojeISO } from "@/lib/data-br";

export default async function MinhaVendaPage({ params }: { params: Promise<{ id: string }> }) {
 const { id } = await params;
 if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
 const { dados, erro } = await obterMinhasVendas(id);
 if (erro) return <p role="alert">Não foi possível carregar esta venda. Tente novamente.</p>;
 const v = dados?.vendas[0]; if (!v) notFound();
 const r = resumoVenda(v, hojeISO());
 return <div className="mx-auto max-w-4xl space-y-6"><Link href="/minhas-vendas" className="text-sm text-brand">← Minhas vendas</Link>
  <div><p className="text-xs text-ink-muted">{v.numero} · {STATUS_VENDA[v.status] ?? v.status}</p><h1 className="mt-2 break-words text-3xl font-bold">{v.imovel || "Imóvel ainda não informado"}</h1><p className="mt-2 text-sm text-ink-muted">Consulta do andamento. As alterações são realizadas pela equipe responsável.</p></div>
  <section className="rounded-xl border border-border bg-white p-5"><h2 className="font-semibold">Resumo da venda</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2">{[["Comprador",v.comprador],["Vendedor",v.vendedor],["Responsável pelo acompanhamento",v.responsavel],["Assinatura do contrato",v.assinatura_contrato ? dataVenda(v.assinatura_contrato) : null],["Prazo final do contrato",dataVenda(v.prazo_contrato)],["Etapa atual",r.atual?.nome]].map(([nome,valor]) => <div key={nome}><dt className="text-xs text-ink-muted">{nome}</dt><dd className="mt-1 break-words text-sm">{valor || "Ainda não informado"}</dd></div>)}</dl>{r.etapaVencida && <p className="mt-4 text-sm text-rose-700">Há etapa com prazo vencido.</p>}{r.contratoVencido && <p className="mt-2 text-sm text-rose-700">O prazo final contratual está vencido.</p>}</section>
  <ComissoesVenda comissoes={v.comissoes ?? []} />
  <section className="rounded-xl border border-border bg-white p-5"><h2 className="font-semibold">Etapas da venda</h2><p className="mt-1 text-sm text-ink-muted">{r.concluidas} de {r.total} concluídas</p>{!v.etapas.length ? <p className="mt-4 text-sm">As etapas ainda não foram definidas pela equipe.</p> : <ol className="mt-4 divide-y divide-border">{v.etapas.map((e) => <li key={e.id} className="py-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-medium">{e.nome}</h3><span className="text-xs text-ink-muted">{STATUS_ETAPA[e.status] ?? e.status}</span></div><p className="mt-2 text-sm">Previsão: {dataVenda(e.prevista)}</p>{e.realizada && <p className="mt-1 text-sm">Realizada em {dataVenda(e.realizada)}</p>}</li>)}</ol>}</section>
  <section className="rounded-xl border border-border bg-white p-5"><h2 className="font-semibold">Atualizações da equipe</h2><p className="mt-1 text-sm text-ink-muted">Informações e pendências publicadas para acompanhar esta venda.</p>{!v.atualizacoes.length ? <p className="mt-4 text-sm">Ainda não há atualizações publicadas. Você já pode acompanhar as etapas acima.</p> : <ul className="mt-4 space-y-4">{v.atualizacoes.map((a) => <li key={a.id} className="rounded-lg bg-background p-4"><p className="whitespace-pre-wrap break-words text-sm">{a.mensagem}</p><p className="mt-2 text-xs text-ink-muted">{a.autor || "Equipe"} · {new Date(a.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p></li>)}</ul>}</section>
 </div>;
}
