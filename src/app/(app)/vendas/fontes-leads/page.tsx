import Link from "next/link";
import { redirect } from "next/navigation";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { NavegacaoContexto } from "@/components/navegacao-contexto";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { salvarFonteLead, salvarHistoricoFonteLead } from "./actions";
import { FONTES_LEADS } from "@/lib/vendas/fontes-leads";

type Venda = {
  id: string;
  numero_processo: string | null;
  codigo_san: string | null;
  status: string | null;
  fonte_lead: string | null;
  fonte_lead_observacoes: string | null;
  data_venda: string | null;
  mes_venda: string | null;
  data_conclusao: string | null;
  data_assinatura: string | null;
  data_criacao: string | null;
  valor_total: number | null;
  imoveis: { endereco: string | null } | null;
};
type Historico = {
  id: string;
  imovel_nome: string;
  mes_venda: string;
  fonte_lead: string | null;
  fonte_lead_observacoes: string | null;
};
const CANAIS = FONTES_LEADS;
const moeda = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const mesComercial = (v: Venda) => v.mes_venda ?? v.data_venda?.slice(0,7) ?? v.data_conclusao?.slice(0,7) ?? v.data_assinatura?.slice(0,7) ?? v.data_criacao?.slice(0,7) ?? "";
const vendaRealizada = (v: Venda) => v.status === "concluido" || !!v.mes_venda || !!v.data_venda;
const nomeFonte = (v: { fonte_lead: string | null }) => v.fonte_lead || "Não informado";

export default async function FontesLeadsPage({ searchParams }: {
  searchParams: Promise<{ ano?: string; canal?: string; busca?: string; estado?: string }>;
}) {
  const { usuario } = await getUsuarioAtual();
  if (!usuario?.tenant_id) redirect("/login");
  if (!["diretor", "gerente"].includes(usuario.nivel_acesso)) redirect("/vendas");
  const params = await searchParams;
  const ano = /^20[0-9]{2}$/.test(params.ano ?? "") ? params.ano! : "2026";
  const canal = params.canal ?? "";
  const busca = (params.busca ?? "").trim().toLocaleLowerCase("pt-BR");
  const estado = "concluido";
  const supabase = await createClient();
  const [resProcessos, resHistoricos] = await Promise.all([
    supabase.from("processos")
      .select("id,numero_processo,codigo_san,status,fonte_lead,fonte_lead_observacoes,data_venda,mes_venda,data_conclusao,data_assinatura,data_criacao,valor_total,imoveis(endereco)")
      .eq("tenant_id", usuario.tenant_id).eq("categoria", "venda")
      .order("criado_em", { ascending: false }),
    supabase.from("vendas_fontes_historicas")
      .select("id,imovel_nome,mes_venda,fonte_lead,fonte_lead_observacoes")
      .eq("tenant_id", usuario.tenant_id).order("mes_venda", { ascending: false }),
  ]);
  if (resProcessos.error || resHistoricos.error)
    return <p className="p-6 text-sm text-rose-700">Erro ao carregar vendas: {resProcessos.error?.message || resHistoricos.error?.message}</p>;

  const todas = (resProcessos.data ?? []) as unknown as Venda[];
  const todasHistoricas = (resHistoricos.data ?? []) as Historico[];
  const noAno = todas.filter(v => mesComercial(v).startsWith(ano));
  const realizadas = noAno.filter(vendaRealizada);
  const historicasAno = todasHistoricas.filter(v => v.mes_venda.startsWith(ano));
  const total = realizadas.length + historicasAno.length;
  const comFonte = [...realizadas, ...historicasAno].filter(v => !!v.fonte_lead && v.fonte_lead !== "Indefinido").length;
  const porCanal = new Map<string, number>();
  for (const v of [...realizadas, ...historicasAno]) porCanal.set(nomeFonte(v), (porCanal.get(nomeFonte(v)) ?? 0) + 1);
  const canais = [...porCanal.entries()].sort((a,b) => b[1]-a[1]);
  const linhas = noAno
    .filter(v => vendaRealizada(v))
    .filter(v => !canal || nomeFonte(v) === canal)
    .filter(v => !busca || [v.imoveis?.endereco, v.numero_processo, v.codigo_san].join(" ").toLocaleLowerCase("pt-BR").includes(busca))
    .sort((a,b) => mesComercial(b).localeCompare(mesComercial(a)));
  const historicas = historicasAno
    .filter(v => !canal || nomeFonte(v) === canal)
    .filter(v => !busca || v.imovel_nome.toLocaleLowerCase("pt-BR").includes(busca));
  const anos = [...new Set(["2026", ...todas.map(v=>mesComercial(v).slice(0,4)), ...todasHistoricas.map(v=>v.mes_venda.slice(0,4))].filter(v=>/^20[0-9]{2}$/.test(v)))].sort().reverse();
  const query = new URLSearchParams({ ano, canal, busca: params.busca ?? "", estado });
  return <div className="w-full min-w-0 space-y-6">
    <CabecalhoPagina titulo="Fontes de leads" descricao="Origem dos imóveis vendidos, incluindo vendas com trâmites ainda em andamento." acao={<Link href="/vendas?aba=andamento" className={SECONDARY_BUTTON_CLASS}>Ver processos</Link>} />
    <NavegacaoContexto nome="Vendas" links={[{ href: "/vendas", label: "Processos de venda" }, { href: "/vendas/fontes-leads", label: "Fontes de leads" }]} />
    {ano === "2026" && <p className="text-sm text-slate-600">Referência informada pela gestão: <strong>60 imóveis vendidos em 2026</strong>. O total abaixo mostra somente os registros já conciliados com o Vitral, sem completar artificialmente os cadastros.</p>}
    <div className="grid gap-3 sm:grid-cols-3">
      <div className={`${CARD_CLASS} p-5`}><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Vendas registradas em {ano}</p><p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{total}</p></div>
      <div className={`${CARD_CLASS} p-5`}><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Origem identificada</p><p className="mt-2 text-3xl font-semibold tabular-nums text-emerald-700">{comFonte}<span className="ml-2 text-sm font-normal text-slate-500">de {total}</span></p></div>
      <div className={`${CARD_CLASS} p-5`}><p className="text-xs font-medium uppercase tracking-wide text-slate-500">A classificar</p><p className="mt-2 text-3xl font-semibold tabular-nums text-amber-700">{total-comFonte}</p></div>
    </div>
    <section className={`${CARD_CLASS} p-4 sm:p-5`}>
      <h2 className="mb-4 font-semibold text-slate-900">Vendas por canal</h2>
      {canais.length ? <div className="space-y-3">{canais.map(([nome, qtd]) => <div key={nome} className="grid grid-cols-[minmax(110px,1fr)_minmax(110px,3fr)_36px] items-center gap-3 text-sm"><span className="truncate text-slate-700">{nome}</span><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-700" style={{width: `${Math.max(2,100*qtd/Math.max(1,total))}%`}} /></div><strong className="text-right tabular-nums">{qtd}</strong></div>)}</div> : <p className="text-sm text-slate-500">Nenhuma venda registrada neste ano.</p>}
    </section>
    <section className={`${CARD_CLASS} p-4 sm:p-5`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">Classificar fontes de leads</h2><p className="mt-1 text-sm text-slate-500">A fonte cadastrada em um processo aparece aqui automaticamente. Cadastre também vendas antigas que ainda não estejam no Vitral.</p></div><div className="flex flex-wrap gap-2"><Link href="/vendas/fontes-leads/investimentos" className={SECONDARY_BUTTON_CLASS}>Investimento por portal</Link><Link href={`/vendas/fontes-leads/pdf?${query}`} className={PRIMARY_BUTTON_CLASS}>Exportar relatório PDF</Link><Link href={`/vendas/fontes-leads/exportar?${query}`} className={SECONDARY_BUTTON_CLASS}>Exportar CSV</Link></div></div>
      <form className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" method="get">
        <label className="text-xs font-medium text-slate-600">Ano<select className={`${INPUT_CLASS} mt-1 w-full`} name="ano" defaultValue={ano}>{anos.map(y=><option key={y} value={y}>{y}</option>)}</select></label>
        <label className="text-xs font-medium text-slate-600">Canal<select className={`${INPUT_CLASS} mt-1 w-full`} name="canal" defaultValue={canal}><option value="">Todos</option>{[...new Set(["Não informado",...CANAIS,...canais.map(c=>c[0])])].map(c=><option key={c} value={c}>{c}</option>)}</select></label>
        <div className="self-end rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">Somente imóveis vendidos</div>
        <div className="flex gap-2"><label className="min-w-0 flex-1 text-xs font-medium text-slate-600">Pesquisar imóvel<input className={`${INPUT_CLASS} mt-1 w-full`} name="busca" placeholder="Nome ou código" defaultValue={params.busca ?? ""}/></label><button className={`${SECONDARY_BUTTON_CLASS} self-end`} type="submit">Filtrar</button></div>
      </form>
      {historicas.length > 0 && <div className="mb-6"><h3 className="mb-3 text-sm font-semibold text-slate-800">Vendas históricas — cadastro manual</h3><div className="space-y-3">{historicas.map(h=><form action={salvarHistoricoFonteLead} key={h.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <input type="hidden" name="historico_id" value={h.id}/>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-slate-900">{h.imovel_nome}</strong><span className="text-xs text-slate-500">Venda histórica</span></div>
        <div className="grid gap-3 sm:grid-cols-[minmax(180px,1.3fr)_minmax(170px,1fr)_minmax(135px,0.7fr)_minmax(180px,1.5fr)_auto] sm:items-end">
          <label className="text-xs font-medium text-slate-600">Imóvel<input name="imovel_nome" className={`${INPUT_CLASS} mt-1 w-full`} required maxLength={180} defaultValue={h.imovel_nome}/></label>
          <label className="text-xs font-medium text-slate-600">Fonte do lead<input name="fonte_lead" list="fontes-lead-opcoes" className={`${INPUT_CLASS} mt-1 w-full`} maxLength={100} defaultValue={h.fonte_lead ?? ""}/></label>
          <label className="text-xs font-medium text-slate-600">Mês da venda<input name="mes_venda" type="month" className={`${INPUT_CLASS} mt-1 w-full`} required defaultValue={h.mes_venda}/></label>
          <label className="text-xs font-medium text-slate-600">Observações<input name="fonte_lead_observacoes" className={`${INPUT_CLASS} mt-1 w-full`} maxLength={500} defaultValue={h.fonte_lead_observacoes ?? ""}/></label>
          <button className={PRIMARY_BUTTON_CLASS} type="submit">Salvar</button>
        </div>
      </form>)}</div></div>}
      <h3 className="mb-3 text-sm font-semibold text-slate-800">Processos de venda</h3>
      {linhas.length ? <div className="space-y-3">{linhas.map(v=><form action={salvarFonteLead} key={v.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <input type="hidden" name="processo_id" value={v.id}/>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="font-semibold text-slate-900">{v.imoveis?.endereco || v.numero_processo || "Imóvel sem identificação"}</p><p className="mt-0.5 text-xs text-slate-500">{v.numero_processo} {v.codigo_san ? ` · SAN ${v.codigo_san}` : ""} · {vendaRealizada(v) ? "Venda realizada" : "Em andamento"} · <Link className="underline" href={`/processos/${v.id}`}>Abrir processo</Link></p></div><span className="text-sm font-semibold tabular-nums text-slate-700">{moeda(Number(v.valor_total||0))}</span></div>
        <div className="grid gap-3 sm:grid-cols-[minmax(170px,1fr)_minmax(135px,0.7fr)_minmax(200px,1.6fr)_auto] sm:items-end">
          <label className="min-w-0 text-xs font-medium text-slate-600">Fonte do lead<input list="fontes-lead-opcoes" name="fonte_lead" className={`${INPUT_CLASS} mt-1 w-full`} maxLength={100} defaultValue={v.fonte_lead ?? ""} placeholder="Selecione ou digite"/></label>
          <label className="min-w-0 text-xs font-medium text-slate-600">Mês da venda<input type="month" name="mes_venda" className={`${INPUT_CLASS} mt-1 w-full`} defaultValue={v.mes_venda ?? v.data_venda?.slice(0,7) ?? ""}/></label>
          <label className="min-w-0 text-xs font-medium text-slate-600">Observações<input name="fonte_lead_observacoes" className={`${INPUT_CLASS} mt-1 w-full`} maxLength={500} defaultValue={v.fonte_lead_observacoes ?? ""} placeholder="Ex.: indicação do porteiro"/></label>
          <button type="submit" className={PRIMARY_BUTTON_CLASS}>Salvar</button>
        </div>
      </form>)}</div> : <p className="rounded-lg bg-slate-50 p-5 text-sm text-slate-500">Nenhum processo encontrado com os filtros selecionados.</p>}
      <form action={salvarHistoricoFonteLead} className="mt-6 space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
        <div><h3 className="text-sm font-semibold text-slate-900">Cadastrar venda histórica</h3><p className="text-xs text-slate-500">Para vendas sem processo correspondente. Não cria processos fictícios.</p></div>
        <div className="grid gap-3 sm:grid-cols-[minmax(180px,1.3fr)_minmax(170px,1fr)_minmax(130px,0.7fr)_minmax(180px,1.5fr)_auto] sm:items-end">
          <label className="text-xs font-medium text-slate-600">Imóvel<input name="imovel_nome" required maxLength={180} className={`${INPUT_CLASS} mt-1 w-full`} placeholder="Nome do imóvel"/></label>
          <label className="text-xs font-medium text-slate-600">Fonte do lead<input name="fonte_lead" maxLength={100} list="fontes-lead-opcoes" className={`${INPUT_CLASS} mt-1 w-full`} placeholder="Canal"/></label>
          <label className="text-xs font-medium text-slate-600">Mês da venda<input name="mes_venda" required type="month" defaultValue={`${ano}-11`} className={`${INPUT_CLASS} mt-1 w-full`}/></label>
          <label className="text-xs font-medium text-slate-600">Observações<input name="fonte_lead_observacoes" maxLength={500} className={`${INPUT_CLASS} mt-1 w-full`} placeholder="Detalhes adicionais"/></label>
          <button type="submit" className={PRIMARY_BUTTON_CLASS}>Adicionar</button>
        </div>
      </form>
    </section>
  </div>;
}
