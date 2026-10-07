import Link from "next/link";
import { obterMinhasVendas } from "./dados";
import { andamento, dataVenda, filtrarVendas, resumoVenda, STATUS_VENDA } from "@/lib/minhas-vendas";
import { hojeISO } from "@/lib/data-br";

export default async function MinhasVendasPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
 const [{ dados, erro }, params] = await Promise.all([obterMinhasVendas(), searchParams]);
 if (erro || !dados) return <p role="alert">Não foi possível carregar suas vendas. Tente novamente.</p>;
 const hoje = hojeISO(), filtro = params.filtro ?? "andamento";
 const vendas = filtrarVendas(dados.vendas, filtro, hoje);
 const vencidas = dados.vendas.filter((v) => { const r = resumoVenda(v, hoje); return r.etapaVencida || r.contratoVencido; }).length;
 return <div className="mx-auto max-w-5xl space-y-6">
  <div><h1 className="text-3xl font-bold">Minhas vendas</h1><p className="mt-2 text-sm text-ink-muted">Acompanhe as etapas e os prazos das vendas vinculadas a você. A equipe responsável atualiza os processos.</p></div>
  {!dados.vinculado ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">Seu acesso ainda não foi vinculado ao cadastro de corretor. Solicite o vínculo à gestão.</div> : <>
   <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-border p-4"><p className="text-2xl font-bold">{dados.vendas.filter(andamento).length}</p><p className="text-sm">Em andamento</p></div><div className="rounded-xl border border-border p-4"><p className="text-2xl font-bold">{vencidas}</p><p className="text-sm">Com prazo vencido</p></div></div>
   <nav aria-label="Filtrar minhas vendas" className="flex flex-wrap gap-2">{[["andamento", "Em andamento"], ["vencidas", "Prazos vencidos"], ["concluidas", "Concluídas"], ["todas", "Todas"]].map(([valor,nome]) => <Link key={valor} href={`/minhas-vendas?filtro=${valor}`} aria-current={filtro === valor ? "page" : undefined} className={`rounded-lg border px-3 py-2 text-sm ${filtro === valor ? "bg-brand text-white" : "border-border"}`}>{nome}</Link>)}</nav>
   {!vendas.length ? <p className="rounded-xl border border-border p-6 text-ink-muted">Nenhuma venda neste filtro. As vendas aparecem quando a gestão atribui o processo ao seu cadastro.</p> : <div className="grid gap-4 sm:grid-cols-2">{vendas.map((v) => { const r = resumoVenda(v, hoje); return <Link key={v.id} href={`/minhas-vendas/${v.id}`} className="min-w-0 rounded-xl border border-border bg-white p-5 hover:border-brand">
    <p className="text-xs text-ink-muted">{v.numero} · {STATUS_VENDA[v.status] ?? v.status}</p><h2 className="mt-2 break-words font-semibold">{v.imovel || "Imóvel ainda não informado"}</h2>
    <p className="mt-3 text-sm">Etapa atual: {r.atual?.nome || (v.etapas.length ? "Etapas concluídas" : "Etapas ainda não definidas")}</p>
    <p className="mt-2 text-sm">Próximo prazo: {dataVenda(r.proximo?.prevista ?? null)}{r.proximo && ` · ${r.proximo.nome}`}</p>
    <p className="mt-2 text-sm">Prazo do contrato: {dataVenda(v.prazo_contrato)}</p>
    {r.etapaVencida && <p className="mt-2 text-sm font-semibold text-rose-700">Há etapa com prazo vencido</p>}{r.contratoVencido && <p className="mt-2 text-sm font-semibold text-rose-700">Prazo contratual vencido</p>}
    <p className="mt-3 text-xs text-ink-muted">Acompanhamento: {v.responsavel || "Responsável ainda não definido"}</p>
   </Link>; })}</div>}
  </>}
 </div>;
}
