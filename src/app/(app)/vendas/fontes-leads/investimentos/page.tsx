import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { NavegacaoContexto } from "@/components/navegacao-contexto";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { salvarInvestimentoCanal } from "../actions";

const CANAIS = ["DF Imóveis","Wimóveis","OLX","Viva Real","Instagram","Tráfego SACRA","Tráfego terceiros","Captação","SAN","Indicação","Site SACRA","WhatsApp","Outros"];
const moeda = (n:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n);
export default async function InvestimentosLeadsPage({searchParams}:{searchParams:Promise<{ano?:string}>}){
  const { usuario } = await getUsuarioAtual();
  if(!usuario?.tenant_id) redirect("/login");
  if(!["diretor","gerente"].includes(usuario.nivel_acesso)) redirect("/vendas");
  const p=await searchParams;
  const ano=/^20[0-9]{2}$/.test(p.ano??"")?p.ano!:"2026";
  const db=await createClient();
  const {data,error}=await db.from("vendas_investimentos_canais")
    .select("id,canal,mes,valor,observacoes")
    .eq("tenant_id",usuario.tenant_id).gte("mes",ano+"-01").lte("mes",ano+"-12").order("mes",{ascending:false});
  if(error) return <p className="p-5 text-sm text-rose-700">Não foi possível carregar investimentos: {error.message}</p>;
  const registros=data??[];
  const total=registros.reduce((a,r)=>a+Number(r.valor),0);
  const canais=[...new Set([...CANAIS,...registros.map(r=>r.canal)])];
  return <div className="w-full min-w-0 space-y-6">
    <CabecalhoPagina titulo="Investimentos por canal" descricao="Cadastre quanto a Sacra investiu por portal ou mídia, mês a mês. Esses valores alimentam o relatório gerencial de custo por venda."
      acao={<Link href="/vendas/fontes-leads" className={SECONDARY_BUTTON_CLASS}>Voltar ao relatório</Link>}/>
    <NavegacaoContexto nome="Vendas" links={[{href:"/vendas",label:"Processos de venda"},{href:"/vendas/fontes-leads",label:"Fontes de leads"},{href:"/vendas/fontes-leads/investimentos",label:"Investimentos"}]}/>
    <div className={`${CARD_CLASS} p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-slate-500">Investimento cadastrado em {ano}</p><p className="mt-1 text-3xl font-semibold text-slate-900">{moeda(total)}</p></div>
      <form method="get" className="flex items-end gap-2"><label className="text-xs font-medium text-slate-600">Ano<input type="number" min={2020} max={2100} name="ano" defaultValue={ano} className={`${INPUT_CLASS} mt-1 w-24`}/></label><button className={SECONDARY_BUTTON_CLASS}>Filtrar</button></form></div>
      <p className="mt-3 text-xs text-slate-500">Meses sem cadastro não são considerados investimento zero. Para registrar custo zero conhecido, salve R$ 0,00 explicitamente.</p>
    </div>
    <div className={`${CARD_CLASS} p-5`}>
      <h2 className="mb-1 font-semibold text-slate-900">Adicionar ou corrigir investimento mensal</h2>
      <p className="mb-4 text-sm text-slate-500">Usar o mesmo canal e mês atualiza o valor existente, sem duplicar despesa.</p>
      <form action={salvarInvestimentoCanal} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_160px_180px_1.5fr_auto] lg:items-end">
        <label className="text-xs font-medium text-slate-600">Canal
          <select name="canal" required className={`${INPUT_CLASS} mt-1 w-full`}>{canais.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
        <label className="text-xs font-medium text-slate-600">Mês
          <input name="mes" type="month" required defaultValue={ano+"-11"} className={`${INPUT_CLASS} mt-1 w-full`}/></label>
        <label className="text-xs font-medium text-slate-600">Investimento (R$)
          <input name="valor" required inputMode="decimal" placeholder="1250,00" className={`${INPUT_CLASS} mt-1 w-full`}/></label>
        <label className="text-xs font-medium text-slate-600">Observações
          <input name="observacoes" maxLength={500} placeholder="Ex.: assinatura anual rateada" className={`${INPUT_CLASS} mt-1 w-full`}/></label>
        <button type="submit" className={PRIMARY_BUTTON_CLASS}>Salvar</button>
      </form>
    </div>
    <div className={`${CARD_CLASS} overflow-hidden`}>
      <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Lançamentos registrados</h2></div>
      {registros.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Mês</th><th className="px-5 py-3">Canal</th><th className="px-5 py-3">Observações</th><th className="px-5 py-3 text-right">Investimento</th></tr></thead>
        <tbody>{registros.map(r=><tr key={r.id} className="border-t border-slate-100"><td className="px-5 py-3 whitespace-nowrap">{r.mes.slice(5)}/{r.mes.slice(0,4)}</td><td className="px-5 py-3 font-medium">{r.canal}</td><td className="px-5 py-3 text-slate-500">{r.observacoes||"—"}</td><td className="px-5 py-3 text-right tabular-nums">{moeda(Number(r.valor))}</td></tr>)}</tbody>
      </table></div> : <p className="p-5 text-sm text-slate-500">Nenhum custo informado para o período.</p>}
    </div>
  </div>;
}
