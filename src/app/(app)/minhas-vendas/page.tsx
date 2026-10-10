import Link from "next/link";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { obterMinhasVendas } from "./dados";
import { andamento, dataVenda, filtrarVendas, resumoVenda, STATUS_VENDA, listarComissoes, resumoComissoes, STATUS_COMISSAO } from "@/lib/minhas-vendas";
import { DadosComissao } from "./comissoes";
import { hojeISO } from "@/lib/data-br";

export default async function MinhasVendasPage({ searchParams }: { searchParams: Promise<{ filtro?: string; aba?: string; pagamento?: string }> }) {
 const [{ dados, erro }, params] = await Promise.all([obterMinhasVendas(), searchParams]);
 if (erro || !dados) return <p role="alert">Não foi possível carregar suas vendas. Tente novamente.</p>;
 const hoje = hojeISO(), filtro = params.filtro ?? "andamento";
 const abaComissoes = params.aba === "comissoes";
 const pagamento = ["todas", "pendentes", "0% pago", "50% pago", "100% pago", "cancelada"].includes(params.pagamento ?? "") ? params.pagamento! : "todas";
 const comissoes = listarComissoes(dados.vendas, pagamento), resumo = resumoComissoes(dados.vendas);
 const vendas = filtrarVendas(dados.vendas, filtro, hoje);
 const vencidas = dados.vendas.filter((v) => { const r = resumoVenda(v, hoje); return r.etapaVencida || r.contratoVencido; }).length;
 return <div className="mx-auto w-full min-w-0 space-y-6">
  <CabecalhoPagina titulo="Minhas vendas" descricao="Acompanhe as etapas, os prazos e suas comissões nas vendas vinculadas a você. A equipe responsável atualiza os processos." />
  {!dados.vinculado ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">Seu acesso ainda não foi vinculado ao cadastro de corretor. Solicite o vínculo à gestão.</div> : <>
   <nav aria-label="Seções de minhas vendas" className="flex gap-2">{[[false,"Vendas","/minhas-vendas"],[true,"Minhas comissões","/minhas-vendas?aba=comissoes"]].map(([ativa,nome,href]) => <Link key={String(nome)} href={String(href)} aria-current={abaComissoes === ativa ? "page" : undefined} className={`min-h-11 rounded-lg border px-4 py-3 text-sm ${abaComissoes === ativa ? "bg-brand text-white" : "border-border"}`}>{nome}</Link>)}</nav>
   {abaComissoes ? <div className="space-y-5">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{[["Aguardando pagamento",resumo.pendentes],["Parcialmente pagas",resumo.parciais],["Pagas",resumo.pagas]].map(([nome,total]) => <div key={nome} className="rounded-xl border border-border p-4"><p className="text-2xl font-bold">{total}</p><p className="text-sm">{nome}</p></div>)}</div>
    <p className="text-sm text-ink-muted">Inclui comissões das suas vendas já concluídas. O status segue o cadastro da equipe; valores e datas ausentes aparecem como não informados.</p>
    <nav aria-label="Filtrar minhas comissões" className="flex flex-wrap gap-2">{[["todas","Todas"],["pendentes","A receber"],["0% pago","Não pagas"],["50% pago","Parciais"],["100% pago","Pagas"],["cancelada","Canceladas"]].map(([valor,nome]) => <Link key={valor} href={`/minhas-vendas?aba=comissoes&pagamento=${encodeURIComponent(valor)}`} aria-current={pagamento === valor ? "page" : undefined} className={`min-h-11 rounded-lg border px-3 py-3 text-sm ${pagamento === valor ? "bg-brand text-white" : "border-border"}`}>{nome}</Link>)}</nav>
    {comissoes.length ? <ul className="grid gap-4 sm:grid-cols-2">{comissoes.map(({venda,comissao}) => <li key={comissao.id} className="min-w-0 rounded-xl border border-border bg-white p-5"><Link href={`/minhas-vendas/${venda.id}`} className="mb-4 block min-h-11 text-brand"><p className="text-xs">{venda.numero} · {STATUS_VENDA[venda.status] ?? venda.status}</p><h2 className="mt-1 break-words font-semibold">{venda.imovel || "Imóvel ainda não informado"}</h2></Link><DadosComissao comissao={comissao} /></li>)}</ul> : <p className="rounded-xl border border-border p-6 text-ink-muted">Nenhuma comissão neste filtro.</p>}
   </div> : <>
   <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-border p-4"><p className="text-2xl font-bold">{dados.vendas.filter(andamento).length}</p><p className="text-sm">Em andamento</p></div><div className="rounded-xl border border-border p-4"><p className="text-2xl font-bold">{vencidas}</p><p className="text-sm">Com prazo vencido</p></div></div>
   <nav aria-label="Filtrar minhas vendas" className="flex flex-wrap gap-2">{[["andamento", "Em andamento"], ["vencidas", "Prazos vencidos"], ["concluidas", "Concluídas"], ["todas", "Todas"]].map(([valor,nome]) => <Link key={valor} href={`/minhas-vendas?filtro=${valor}`} aria-current={filtro === valor ? "page" : undefined} className={`rounded-lg border px-3 py-2 text-sm ${filtro === valor ? "bg-brand text-white" : "border-border"}`}>{nome}</Link>)}</nav>
   {!vendas.length ? <p className="rounded-xl border border-border p-6 text-ink-muted">Nenhuma venda neste filtro. As vendas aparecem quando a gestão atribui o processo ao seu cadastro.</p> : <div className="grid gap-4 sm:grid-cols-2">{vendas.map((v) => { const r = resumoVenda(v, hoje); return <Link key={v.id} href={`/minhas-vendas/${v.id}`} className="min-w-0 rounded-xl border border-border bg-white p-5 hover:border-brand">
    <p className="text-xs text-ink-muted">{v.numero} · {STATUS_VENDA[v.status] ?? v.status}</p><h2 className="mt-2 break-words font-semibold">{v.imovel || "Imóvel ainda não informado"}</h2>
    <p className="mt-3 text-sm">Etapa atual: {r.atual?.nome || (v.etapas.length ? "Etapas concluídas" : "Etapas ainda não definidas")}</p>
    <p className="mt-2 text-sm">Próximo prazo: {dataVenda(r.proximo?.prevista ?? null)}{r.proximo && ` · ${r.proximo.nome}`}</p>
    <p className="mt-2 text-sm">Prazo do contrato: {dataVenda(v.prazo_contrato)}</p>
    {r.etapaVencida && <p className="mt-2 text-sm font-semibold text-rose-700">Há etapa com prazo vencido</p>}{r.contratoVencido && <p className="mt-2 text-sm font-semibold text-rose-700">Prazo contratual vencido</p>}
    <p className="mt-3 text-sm">Comissões: {v.comissoes?.length ? v.comissoes.map(c => STATUS_COMISSAO[c.status] ?? c.status).join(" · ") : "Ainda não cadastradas"}</p>
    <p className="mt-3 text-xs text-ink-muted">Acompanhamento: {v.responsavel || "Responsável ainda não definido"}</p>
   </Link>; })}</div>}
   </>}
  </>}
 </div>;
}
