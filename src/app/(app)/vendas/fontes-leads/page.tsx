import Link from "next/link";
import { redirect } from "next/navigation";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { NavegacaoContexto } from "@/components/navegacao-contexto";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { salvarFonteLead } from "./actions";

type Venda = {
  id: string;
  numero_processo: string | null;
  codigo_san: string | null;
  status: string | null;
  fonte_lead: string | null;
  fonte_lead_observacoes: string | null;
  data_venda: string | null;
  data_conclusao: string | null;
  data_assinatura: string | null;
  data_criacao: string | null;
  valor_total: number | null;
  imoveis: { endereco: string | null } | null;
};
const CANAIS = ["DF Imóveis", "Wimóveis", "OLX", "Viva Real", "Instagram", "Tráfego SACRA", "Tráfego terceiros", "Captação", "SAN", "Indicação", "Site SACRA", "WhatsApp", "Outros", "Indefinido"];
const moeda = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const periodoVenda = (v: Venda) => v.data_venda ?? v.data_conclusao ?? v.data_assinatura ?? v.data_criacao ?? "";
const mesVenda = (v: Venda) => periodoVenda(v).slice(0, 7);

export default async function FontesLeadsPage({ searchParams }: {
  searchParams: Promise<{ ano?: string; canal?: string; busca?: string; estado?: string }>;
}) {
  const { usuario } = await getUsuarioAtual();
  if (!usuario?.tenant_id) redirect("/login");
  if (!["diretor", "gerente"].includes(usuario.nivel_acesso)) redirect("/vendas");
  const params = await searchParams;
  const ano = /^20\\d{2}$/.test(params.ano ?? "") ? params.ano! : "2026";
  const canal = params.canal ?? "";
  const busca = (params.busca ?? "").trim().toLocaleLowerCase("pt-BR");
  const estado = params.estado === "todos" ? "todos" : "concluido";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("processos")
    .select("id, numero_processo, codigo_san, status, fonte_lead, fonte_lead_observacoes, data_venda, data_conclusao, data_assinatura, data_criacao, valor_total, imoveis(endereco)")
    .eq("tenant_id", usuario.tenant_id)
    .eq("categoria", "venda")
    .order("criado_em", { ascending: false });
  if (error) return <p className="p-6 text-sm text-rose-700">Erro ao carregar as vendas: {error.message}</p>;
  const todas = (data ?? []) as unknown as Venda[];
  const noAno = todas.filter(v => periodoVenda(v).startsWith(ano));
  const concluidas = noAno.filter(v => v.status === "concluido");
  const preenchidas = concluidas.filter(v => !!v.fonte_lead && v.fonte_lead !== "Indefinido");
  const porCanal = new Map<string, number>();
  for (const v of concluidas) {
    const nome = v.fonte_lead || "Não informado";
    porCanal.set(nome, (porCanal.get(nome) ?? 0) + 1);
  }
  const canais = [...porCanal.entries()].sort((a,b) => b[1] - a[1]);
  const linhas = noAno
    .filter(v => estado === "todos" || v.status === "concluido")
    .filter(v => !canal || (v.fonte_lead || "Não informado") === canal)
    .filter(v => !busca || [v.imoveis?.endereco, v.numero_processo, v.codigo_san].join(" ").toLocaleLowerCase("pt-BR").includes(busca))
    .sort((a,b) => periodoVenda(b).localeCompare(periodoVenda(a)));
  const anos = [...new Set(["2026", ...todas.map(v => periodoVenda(v).slice(0,4)).filter(v => /^20\\d{2}$/.test(v))])].sort().reverse();
  const semFonte = concluidas.length - preenchidas.length;
  return <div className="w-full min-w-0 space-y-6">
    <CabecalhoPagina titulo="Fontes de leads" descricao="Identifique quais canais realmente geram vendas. Cada lançamento fica vinculado ao processo da venda." acao={<Link href="/vendas?aba=andamento" className={SECONDARY_BUTTON_CLASS}>Ver processos</Link>} />
    <NavegacaoContexto nome="Vendas" links={[{ href: "/vendas", label: "Processos de venda" }, { href: "/vendas/fontes-leads", label: "Fontes de leads" }]} />
    <div className="grid gap-3 sm:grid-cols-3">
      <div className={`${CARD_CLASS} p-5`}><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Vendas concluídas em {ano}</p><p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{concluidas.length}</p></div>
      <div className={`${CARD_CLASS} p-5`}><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Origem identificada</p><p className="mt-2 text-3xl font-semibold tabular-nums text-emerald-700">{preenchidas.length}<span className="ml-2 text-sm font-normal text-slate-500">de {concluidas.length}</span></p></div>
      <div className={`${CARD_CLASS} p-5`}><p className="text-xs font-medium uppercase tracking-wide text-slate-500">A classificar</p><p className="mt-2 text-3xl font-semibold tabular-nums text-amber-700">{semFonte}</p></div>
    </div>
    <section className={`${CARD_CLASS} p-4 sm:p-5`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-slate-900">Vendas por canal</h2><span className="text-xs text-slate-500">Somente processos concluídos</span></div>
      {canais.length ? <div className="space-y-3">{canais.map(([nome, qtd]) => <div key={nome} className="grid grid-cols-[minmax(110px,1fr)_minmax(110px,3fr)_36px] items-center gap-3 text-sm"><span className="truncate text-slate-700">{nome}</span><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-700" style={{width: `${Math.max(2,100*qtd/concluidas.length)}%`}} /></div><strong className="text-right tabular-nums">{qtd}</strong></div>)}</div> : <p className="text-sm text-slate-500">Sem vendas concluídas no período.</p>}
    </section>
    <section className={`${CARD_CLASS} p-4 sm:p-5`}>
      <div className="mb-4"><h2 className="font-semibold text-slate-900">Cadastrar e corrigir origens</h2><p className="mt-1 text-sm text-slate-500">Selecione a fonte, informe a observação quando necessário e salve a venda. O mês é definido pela data da venda, que pode ser ajustada.</p></div>
      <form className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" method="get">
        <label className="text-xs font-medium text-slate-600">Ano<select className={`${INPUT_CLASS} mt-1 w-full`} name="ano" defaultValue={ano}>{anos.map(y=><option key={y} value={y}>{y}</option>)}</select></label>
        <label className="text-xs font-medium text-slate-600">Canal<select className={`${INPUT_CLASS} mt-1 w-full`} name="canal" defaultValue={canal}><option value="">Todos</option>{[...new Set(["Não informado",...CANAIS,...canais.map(c=>c[0])])].map(c=><option key={c} value={c}>{c}</option>)}</select></label>
        <label className="text-xs font-medium text-slate-600">Visualização<select className={`${INPUT_CLASS} mt-1 w-full`} name="estado" defaultValue={estado}><option value="concluido">Concluídas</option><option value="todos">Todos os processos</option></select></label>
        <div className="flex gap-2"><label className="min-w-0 flex-1 text-xs font-medium text-slate-600">Pesquisar imóvel<input className={`${INPUT_CLASS} mt-1 w-full`} name="busca" placeholder="Nome ou código" defaultValue={params.busca ?? ""}/></label><button className={`${SECONDARY_BUTTON_CLASS} self-end`} type="submit">Filtrar</button></div>
      </form>
      <datalist id="fontes-lead-opcoes">{CANAIS.map(c=><option key={c} value={c}/>)}</datalist>
      {linhas.length ? <div className="space-y-3">{linhas.map(v=><form action={salvarFonteLead} key={v.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <input type="hidden" name="processo_id" value={v.id}/>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="font-semibold text-slate-900">{v.imoveis?.endereco || v.numero_processo || "Imóvel sem identificação"}</p><p className="mt-0.5 text-xs text-slate-500">{v.numero_processo} {v.codigo_san ? ` · SAN ${v.codigo_san}` : ""} · {v.status === "concluido" ? "Concluída" : "Em andamento"}</p></div><span className="text-sm font-semibold tabular-nums text-slate-700">{moeda(Number(v.valor_total||0))}</span></div>
        <div className="grid gap-3 sm:grid-cols-[minmax(170px,1fr)_minmax(135px,0.7fr)_minmax(200px,1.6fr)_auto] sm:items-end">
          <label className="min-w-0 text-xs font-medium text-slate-600">Fonte do lead<input list="fontes-lead-opcoes" name="fonte_lead" className={`${INPUT_CLASS} mt-1 w-full`} maxLength={100} defaultValue={v.fonte_lead ?? ""} placeholder="Selecione ou digite"/></label>
          <label className="min-w-0 text-xs font-medium text-slate-600">Data da venda<input type="date" name="data_venda" className={`${INPUT_CLASS} mt-1 w-full`} defaultValue={v.data_venda ?? v.data_conclusao ?? v.data_assinatura ?? ""}/></label>
          <label className="min-w-0 text-xs font-medium text-slate-600">Observações<input name="fonte_lead_observacoes" className={`${INPUT_CLASS} mt-1 w-full`} maxLength={500} defaultValue={v.fonte_lead_observacoes ?? ""} placeholder="Ex.: indicação do porteiro"/></label>
          <button type="submit" className={PRIMARY_BUTTON_CLASS}>Salvar</button>
        </div>
      </form>)}</div> : <p className="rounded-lg bg-slate-50 p-5 text-sm text-slate-500">Nenhum processo encontrado com os filtros selecionados.</p>}
    </section>
  </div>;
}
