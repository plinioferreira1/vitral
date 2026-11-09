import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { NavegacaoContexto } from "@/components/navegacao-contexto";
import { PlanilhaFontes, type LinhaVenda } from "./planilha";
import { obterFontesLead } from "@/lib/vendas/fontes-leads-server";

type Processo = {
 id: string; numero_processo: string | null; codigo_san: string | null;
 status: string | null; situacao_comercial: string | null; fonte_lead: string | null; data_venda: string | null;
 mes_venda: string | null; data_conclusao: string | null;
 data_assinatura: string | null; data_criacao: string | null;
 imoveis: { endereco: string | null } | null;
};
type Historico = { id: string; imovel_nome: string; mes_venda: string; fonte_lead: string | null; situacao_comercial: string | null };
function mes(v: Processo) {
 return v.mes_venda ?? v.data_venda?.slice(0,7) ?? v.data_assinatura?.slice(0,7) ??
   v.data_conclusao?.slice(0,7) ?? v.data_criacao?.slice(0,7) ?? "";
}
export default async function FontesLeadsPage({ searchParams }: {
 searchParams: Promise<{ ano?: string }>;
}) {
 const { usuario } = await getUsuarioAtual();
 if (!usuario?.tenant_id) redirect("/login");
 if (!["diretor", "gerente"].includes(usuario.nivel_acesso)) redirect("/vendas");
 const params = await searchParams;
 const ano = /^20[0-9]{2}$/.test(params.ano ?? "") ? params.ano! : "2026";
 const supabase = await createClient();
 const fontes = await obterFontesLead(usuario.tenant_id);
 const [processos, historicos] = await Promise.all([
  supabase.from("processos")
   .select("id,numero_processo,codigo_san,status,situacao_comercial,fonte_lead,data_venda,mes_venda,data_conclusao,data_assinatura,data_criacao,imoveis(endereco)")
   .eq("tenant_id", usuario.tenant_id).eq("categoria", "venda"),
  supabase.from("vendas_fontes_historicas")
   .select("id,imovel_nome,mes_venda,fonte_lead,situacao_comercial")
   .eq("tenant_id", usuario.tenant_id),
 ]);
 if (processos.error || historicos.error) {
   return <p role="alert" className="p-6 text-sm text-rose-700">
     Não foi possível carregar o controle: {processos.error?.message || historicos.error?.message}
   </p>;
 }
 const listaProcessos = (processos.data ?? []) as unknown as Processo[];
 const listaHistorica = (historicos.data ?? []) as unknown as Historico[];
 const linhas: LinhaVenda[] = [
   ...listaProcessos
    .filter(p => mes(p).startsWith(ano) && (!!p.situacao_comercial || !!p.data_assinatura || !!p.data_venda))
    .map(p => ({
       id: p.id, tipo: "processo" as const,
       imovel: p.imoveis?.endereco || p.numero_processo || "Imóvel não identificado",
       mes: mes(p), san: p.codigo_san, fonte: p.fonte_lead,
       situacao: (p.situacao_comercial === "concluida" || p.status === "concluido") ? "concluida" as const : "andamento" as const,
    })),
   ...listaHistorica.filter(h => h.mes_venda.startsWith(ano))
    .map(h => ({
       id: h.id, tipo: "historico" as const, imovel: h.imovel_nome,
       mes: h.mes_venda, san: null, fonte: h.fonte_lead,
       situacao: h.situacao_comercial === "andamento" ? "andamento" as const : "concluida" as const,
    })),
 ].sort((a, b) => b.mes.localeCompare(a.mes) || a.imovel.localeCompare(b.imovel, "pt-BR"));
 const concluidas = linhas.filter(l => l.situacao === "concluida").length;
 const classificadas = linhas.filter(l => !!l.fonte && l.fonte !== "Indefinido").length;
 return <div className="w-full min-w-0 space-y-5">
  <CabecalhoPagina titulo="Fonte de Vendas" descricao="Toda venda assinada entra aqui, mesmo com financiamento, registro ou entrega de chaves pendentes." />
  <NavegacaoContexto nome="Vendas" links={[
    { href: "/vendas", label: "Processos de venda" },
    { href: "/vendas/fontes-leads", label: "Fonte de Vendas" },
  ]} />
  <div className="flex flex-wrap items-center justify-between gap-3">
   <form method="get"><label className="flex items-center gap-2 text-sm text-ink-muted">
     Ano <select name="ano" defaultValue={ano} className="rounded-lg border border-border bg-surface px-3 py-2 text-ink">
       {[ano, "2026", "2027", "2025"].filter((v,i,a) => a.indexOf(v) === i).map(v => <option key={v} value={v}>{v}</option>)}
     </select>
     <button type="submit" className="rounded-lg border border-border bg-surface px-3 py-2 text-ink hover:bg-background">Aplicar</button>
   </label></form>
   <div className="flex flex-wrap items-center gap-3 text-sm">
    <Link className="rounded-lg bg-brand px-4 py-2.5 font-semibold text-white hover:opacity-90" href={`/vendas/fontes-leads/resultados?ano=${ano}`}>Ver gráfico de fontes</Link>
    <Link className="text-brand hover:underline" href={`/vendas/fontes-leads/exportar?ano=${ano}`}>Exportar CSV</Link>
    <Link className="text-brand hover:underline" href="/vendas/fontes-leads/investimentos">Investimentos</Link>
    <Link className="text-brand hover:underline" href="/vendas/fontes-leads/fontes">Gerenciar fontes</Link>
   </div>
  </div>
  <div className="grid grid-cols-3 gap-2 sm:gap-3">
   {[
    ["Vendas assinadas", linhas.length],
    ["Processos concluídos", concluidas],
    ["Origens preenchidas", classificadas],
   ].map(([rotulo, valor]) => <div key={rotulo} className="rounded-xl border border-border bg-surface p-3 sm:p-5">
     <p className="text-xs text-ink-muted sm:text-sm">{rotulo}</p>
     <p className="mt-1 text-2xl font-semibold tabular-nums text-ink sm:text-3xl">{valor}</p>
   </div>)}
  </div>
  <PlanilhaFontes linhas={linhas} ano={ano} fontes={fontes} />
 </div>;
}
