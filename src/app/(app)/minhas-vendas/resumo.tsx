import Link from "next/link";
import { obterMinhasVendas } from "./dados";
import { andamento, resumoVenda } from "@/lib/minhas-vendas";
import { hojeISO } from "@/lib/data-br";
export async function ResumoMinhasVendas() {
 const { dados, erro } = await obterMinhasVendas();
 const hoje = hojeISO();
 return <section className="rounded-xl border border-border bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Minhas vendas</h2><Link href="/minhas-vendas" className="text-sm font-semibold text-brand">Acompanhar vendas →</Link></div>{erro || !dados ? <p role="alert" className="mt-3 text-sm">Não foi possível carregar o resumo.</p> : !dados.vinculado ? <p className="mt-3 text-sm text-ink-muted">Solicite à gestão o vínculo da sua conta ao cadastro de corretor.</p> : <div className="mt-4 flex flex-wrap gap-6 text-sm"><p><strong>{dados.vendas.filter(andamento).length}</strong> em andamento</p><p><strong>{dados.vendas.filter((v) => { const r=resumoVenda(v,hoje); return r.etapaVencida || r.contratoVencido; }).length}</strong> com prazo vencido</p></div>}</section>;
}
