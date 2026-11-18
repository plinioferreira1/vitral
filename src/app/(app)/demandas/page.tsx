import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CalendarClock, CheckCircle2, ClipboardList, Plus, Search, AlertTriangle, CalendarDays, Repeat2, PauseCircle, PlayCircle, Trash2, Tags } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { criarDemanda, criarRecorrenciaDemanda, alternarRecorrenciaDemanda, marcarNotificacaoDemandaLida, criarCategoriaDemanda, alternarCategoriaDemanda } from "./actions";
import { DitadoDemandas } from "./ditado-demandas";
import { NotificacoesPush } from "./notificacoes-push";

type Situacao = "pendente"|"em_andamento"|"aguardando"|"bloqueada"|"concluida";
const LABEL: Record<Situacao,string> = {
  pendente:"Pendente", em_andamento:"Em andamento", aguardando:"Aguardando terceiros",
  bloqueada:"Bloqueada", concluida:"Concluída",
};
const PRIORIDADE: Record<string,string> = {
  baixa:"Baixa",normal:"Normal",alta:"Alta",urgente:"Urgente",
};
const estiloStatus: Record<Situacao,string> = {
  pendente:"bg-background text-ink-muted", em_andamento:"bg-sky-50 text-sky-800",
  aguardando:"bg-amber-50 text-amber-800", bloqueada:"bg-rose-50 text-rose-800",
  concluida:"bg-emerald-50 text-emerald-800",
};
const hojeSP = () => { const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()); const v=(t:string)=>p.find(x=>x.type===t)?.value??""; return [v("year"),v("month"),v("day")].join("-"); };
const fmt = (data:string|null) => data ? data.slice(0,10).split("-").reverse().join("/") : "Sem prazo";

export default async function DemandasPage({searchParams}:{
  searchParams:Promise<{q?:string;status?:string;escopo?:string;prazo?:string;categoria?:string}>;
}) {
  const { user, usuario } = await getUsuarioAtual();
  if(!user || !usuario?.tenant_id || !usuario.ativo) redirect("/login");
  const gestor=["diretor","gerente"].includes(usuario.nivel_acesso);
  const sp=await searchParams;
  const supabase=await createClient();
  const [rDemandas,rAvisos,rEquipe,rRotinas,rCategorias]=await Promise.all([
    supabase.from("demandas")
      .select("id,titulo,descricao,status,prioridade,prazo,responsavel_id,solicitante_id,criada_em,concluida_em,categoria_id")
      .eq("tenant_id",usuario.tenant_id).is("excluida_em",null).order("criada_em",{ascending:false}).limit(250),
    supabase.from("demandas_notificacoes")
      .select("id,demanda_id,titulo,mensagem,criada_em,demandas!inner(excluida_em)")
      .eq("tenant_id",usuario.tenant_id).eq("destinatario_id",user.id)
      .is("demandas.excluida_em",null)
      .is("lida_em",null).order("criada_em",{ascending:false}).limit(12),
    supabase.from("usuarios").select("id,nome,ativo")
      .eq("tenant_id",usuario.tenant_id).eq("ativo",true).order("nome"),
    gestor ? supabase.from("demandas_recorrencias")
      .select("id,titulo,responsavel_id,periodicidade,proxima_data,ativa,prioridade,categoria_id")
      .eq("tenant_id",usuario.tenant_id).order("ativa",{ascending:false}).order("proxima_data",{ascending:true}).limit(80)
      : Promise.resolve({data:[] as {id:string;titulo:string;responsavel_id:string;periodicidade:string;proxima_data:string;ativa:boolean;prioridade:string;categoria_id:string|null}[]}),
    supabase.from("demandas_categorias").select("id,nome,ativa")
      .eq("tenant_id",usuario.tenant_id).order("nome"),
  ]);
  if(rDemandas.error || rAvisos.error || rEquipe.error || rCategorias.error) {
    return <div role="alert" className="rounded-xl border border-rose-200 p-5 text-sm text-rose-800">
      Não foi possível carregar a Central de Demandas. {rDemandas.error?.message||rAvisos.error?.message||rEquipe.error?.message||rCategorias.error?.message}
    </div>;
  }
  const tarefas = rDemandas.data??[];
  const equipe=rEquipe.data??[];
  const categorias=rCategorias.data??[];
  const categoriasAtivas=categorias.filter(c=>c.ativa);
  const nomesCategoria=new Map(categorias.map(c=>[c.id,c.nome]));
  const categoriaFiltro=categorias.some(c=>c.id===sp.categoria)?sp.categoria??"":"";
  const nomes=new Map(equipe.map(u=>[u.id,u.nome]));
  const agora=hojeSP();
  const buscar=(sp.q??"").trim().toLocaleLowerCase("pt-BR");
  const statusValido=Object.prototype.hasOwnProperty.call(LABEL,sp.status??"") ? sp.status! : "";
  const escopo=sp.escopo==="minhas"||!gestor?"minhas":"todas";
  const prazoFiltro=["atrasadas","hoje","futuras","sem_prazo"].includes(sp.prazo??"")?sp.prazo??"":"";
  const universo=tarefas.filter(d=>escopo!=="minhas"||d.responsavel_id===user.id);
  const contagens={
    atrasadas:universo.filter(d=>d.status!=="concluida"&&!!d.prazo&&d.prazo<agora).length,
    hoje:universo.filter(d=>d.status!=="concluida"&&d.prazo===agora).length,
    futuras:universo.filter(d=>d.status!=="concluida"&&!!d.prazo&&d.prazo>agora).length,
    concluidas:universo.filter(d=>d.status==="concluida").length,
  };
  const prioridadePeso:Record<string,number>={urgente:0,alta:1,normal:2,baixa:3};
  const filtradas=universo
    .filter(d=>!statusValido||d.status===statusValido)
    .filter(d=>!categoriaFiltro||d.categoria_id===categoriaFiltro)
    .filter(d=>!prazoFiltro||(d.status!=="concluida"&&(
      prazoFiltro==="atrasadas"?!!d.prazo&&d.prazo<agora:
      prazoFiltro==="hoje"?d.prazo===agora:
      prazoFiltro==="futuras"?!!d.prazo&&d.prazo>agora:!d.prazo)))
    .filter(d=>!buscar||[d.titulo,d.descricao,nomes.get(d.responsavel_id)].some(v=>v?.toLocaleLowerCase("pt-BR").includes(buscar)))
    .sort((a,b)=>(a.status==="concluida"?1:0)-(b.status==="concluida"?1:0)||
      (a.prazo??"9999").localeCompare(b.prazo??"9999")||
      (prioridadePeso[a.prioridade]??2)-(prioridadePeso[b.prioridade]??2));
  const coresPrioridade:Record<string,string>={
    urgente:"bg-rose-100 text-rose-800",alta:"bg-orange-100 text-orange-800",
    normal:"bg-sky-100 text-sky-800",baixa:"bg-slate-100 text-slate-700",
  };
  return <main className="w-full min-w-0 space-y-5">
    <CabecalhoPagina titulo="Central de Demandas"
      descricao="Distribua atividades e acompanhe o andamento de cada colaborador. Todo pedido fica registrado, com responsável e histórico."
      acao={<div className="flex flex-wrap items-center gap-2">
        {gestor&&<Link href="/demandas/lixeira" className={SECONDARY_BUTTON_CLASS}><Trash2 size={16}/> Lixeira</Link>}
        <Link href="/demandas/resumo" className={SECONDARY_BUTTON_CLASS}><ClipboardList size={16}/> Fechamento do dia</Link>
      </div>}/>
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {[
        {t:"Vencidas",n:contagens.atrasadas,icon:AlertTriangle,cor:"text-rose-700",fundo:"border-rose-200 bg-rose-50/50"},
        {t:"Vencem hoje",n:contagens.hoje,icon:CalendarClock,cor:"text-amber-700",fundo:"border-amber-200 bg-amber-50/50"},
        {t:"Próximas",n:contagens.futuras,icon:CalendarDays,cor:"text-sky-700",fundo:"border-sky-200 bg-sky-50/50"},
        {t:"Concluídas",n:contagens.concluidas,icon:CheckCircle2,cor:"text-emerald-700",fundo:"border-emerald-200 bg-emerald-50/50"},
      ].map(({t,n,icon:Icon,cor,fundo})=><div key={t} className={`rounded-xl border p-3 sm:p-4 ${fundo}`}>
        <span className={`flex items-center gap-2 text-xs font-semibold ${cor}`}><Icon size={15}/>{t}</span>
        <p className={`mt-2 text-2xl font-bold tabular-nums ${cor}`}>{n}</p>
      </div>)}
    </div>

    <NotificacoesPush/>

    {(rAvisos.data??[]).length>0 && <section className={`${CARD_CLASS} space-y-2 p-4`} aria-label="Notificações não lidas">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Bell size={16}/> Novidades para você <span className="text-xs text-ink-muted">({rAvisos.data?.length})</span></h2>
      {(rAvisos.data??[]).map(n=><div key={n.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background p-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{n.titulo}</p>
          <p className="truncate text-xs text-ink-muted">{n.mensagem}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link className="text-sm font-semibold text-brand underline underline-offset-2" href={`/demandas/${n.demanda_id}`}>Abrir</Link>
          <form action={marcarNotificacaoDemandaLida}>
            <input type="hidden" name="notificacao_id" value={n.id}/>
            <button type="submit" className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted">Marcar lida</button>
          </form>
        </div>
      </div>)}
    </section>}

    {gestor && <DitadoDemandas equipe={equipe.map(u=>({id:u.id,nome:u.nome}))} categorias={categoriasAtivas.map(c=>({id:c.id,nome:c.nome}))} iaAtiva={Boolean(process.env.OPENAI_API_KEY)}/>}

    {gestor && <details className={`${CARD_CLASS} group p-4 sm:p-5`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-brand"><Plus size={18}/> Nova demanda
        <span className="ml-auto text-xs font-normal text-ink-muted">Abrir cadastro</span>
      </summary>
      <form action={criarDemanda} className="mt-5 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
        <label className="block text-xs font-medium text-ink-muted sm:col-span-2">O que precisa ser feito? *
          <input name="titulo" required minLength={4} maxLength={180} className={`${INPUT_CLASS} mt-1`} placeholder="Ex.: Solicitar matrícula atualizada do imóvel"/>
        </label>
        <label className="block text-xs font-medium text-ink-muted sm:col-span-2">Detalhes e orientações
          <textarea name="descricao" rows={3} maxLength={5000} className={`${INPUT_CLASS} mt-1`}
            placeholder="Inclua o resultado esperado e informações importantes"/>
        </label>
        <label className="block text-xs font-medium text-ink-muted">Responsável *
          <select name="responsavel_id" required defaultValue="" className={`${INPUT_CLASS} mt-1`}>
            <option value="" disabled>Selecione um colaborador</option>
            {equipe.map(u=><option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </label>
        <label className="block text-xs font-medium text-ink-muted">Categoria *
          <select name="categoria_id" required defaultValue="" className={`${INPUT_CLASS} mt-1`}>
            <option value="" disabled>Escolha uma categoria</option>
            {categoriasAtivas.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
        <label className="block text-xs font-medium text-ink-muted">Prazo
          <input type="date" name="prazo" className={`${INPUT_CLASS} mt-1`}/>
        </label>
        <label className="block text-xs font-medium text-ink-muted">Prioridade
          <select name="prioridade" defaultValue="normal" className={`${INPUT_CLASS} mt-1`}>
            {Object.entries(PRIORIDADE).map(([value,label])=><option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <div className="flex items-end sm:justify-end">
          <button className={PRIMARY_BUTTON_CLASS} type="submit"><Plus size={16}/> Distribuir demanda</button>
        </div>
      </form>
      <p className="mt-3 text-xs text-ink-muted">Para várias demandas, use o ditado e revise a prévia acima. Para uma atividade isolada, preencha este formulário.</p>
    </details>}

    {gestor && <details className={`${CARD_CLASS} group p-4 sm:p-5`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-brand">
        <Repeat2 size={18}/> Demandas recorrentes
        <span className="ml-auto text-xs font-normal text-ink-muted">{(rRotinas.data??[]).filter(r=>r.ativa).length} ativas · abrir configuração</span>
      </summary>
      <p className="mt-3 text-xs leading-5 text-ink-muted">Crie uma atividade automática diária, semanal ou mensal. Cada ocorrência vira uma nova demanda com responsável, prazo, histórico e notificação.</p>
      <form action={criarRecorrenciaDemanda} className="mt-4 grid gap-3 rounded-xl border border-border bg-background/40 p-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-ink-muted sm:col-span-2">Atividade recorrente *
          <input name="titulo" required minLength={4} maxLength={180} className={`${INPUT_CLASS} mt-1`} placeholder="Ex.: Conferir inadimplência do condomínio"/>
        </label>
        <label className="text-xs font-medium text-ink-muted sm:col-span-2">Instruções (opcional)
          <textarea name="descricao" rows={2} maxLength={5000} className={`${INPUT_CLASS} mt-1`}/>
        </label>
        <label className="text-xs font-medium text-ink-muted">Responsável *
          <select name="responsavel_id" required defaultValue="" className={`${INPUT_CLASS} mt-1`}>
            <option value="" disabled>Escolha um colaborador</option>
            {equipe.map(u=><option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-ink-muted">Categoria *
          <select name="categoria_id" required defaultValue="" className={`${INPUT_CLASS} mt-1`}>
            <option value="" disabled>Escolha uma categoria</option>
            {categoriasAtivas.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-ink-muted">Frequência *
          <select name="periodicidade" required defaultValue="semanal" className={`${INPUT_CLASS} mt-1`}>
            <option value="diaria">Todos os dias</option>
            <option value="semanal">Toda semana</option>
            <option value="mensal">Todo mês</option>
          </select>
        </label>
        <label className="text-xs font-medium text-ink-muted">Primeira ocorrência *
          <input type="date" name="proxima_data" required min={agora} defaultValue={agora} className={`${INPUT_CLASS} mt-1`}/>
        </label>
        <label className="text-xs font-medium text-ink-muted">Prioridade
          <select name="prioridade" defaultValue="normal" className={`${INPUT_CLASS} mt-1`}>
            {Object.entries(PRIORIDADE).map(([value,label])=><option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <div className="sm:col-span-2">
          <button type="submit" className={PRIMARY_BUTTON_CLASS}><Plus size={16}/> Criar recorrência</button>
        </div>
      </form>
      <div className="mt-4 space-y-2">
        {(rRotinas.data??[]).map(rotina=><div key={rotina.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{rotina.titulo}</p>
            <p className="mt-1 text-xs text-ink-muted">{nomes.get(rotina.responsavel_id)??"Colaborador"} · {nomesCategoria.get(rotina.categoria_id??"")??"Sem categoria"} · {rotina.periodicidade} · Próxima: {fmt(rotina.proxima_data)}</p>
          </div>
          <form action={alternarRecorrenciaDemanda}>
            <input type="hidden" name="recorrencia_id" value={rotina.id}/>
            <input type="hidden" name="ativa" value={rotina.ativa?"false":"true"}/>
            <button className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-ink" type="submit">
              {rotina.ativa?<PauseCircle size={15}/>:<PlayCircle size={15}/>} {rotina.ativa?"Pausar":"Reativar"}
            </button>
          </form>
        </div>)}
        {!rRotinas.data?.length&&<p className="text-sm text-ink-muted">Nenhuma demanda recorrente cadastrada.</p>}
      </div>
    </details>}

    {gestor&&<details className={`${CARD_CLASS} group p-4 sm:p-5`}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-brand">
        <Tags size={18}/> Gerenciar categorias
        <span className="ml-auto text-xs font-normal text-ink-muted">{categoriasAtivas.length} ativas · adicionar ou arquivar</span>
      </summary>
      <p className="mt-3 text-xs leading-5 text-ink-muted">Crie categorias para classificar demandas avulsas e recorrentes. Arquivar oculta a opção nos novos cadastros, sem apagar o histórico.</p>
      <form action={criarCategoriaDemanda} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label className="flex-1 text-xs font-medium text-ink-muted">Nova categoria
          <input name="nome" minLength={2} maxLength={60} required className={`${INPUT_CLASS} mt-1`} placeholder="Ex.: Pós-venda, Financeiro, Jurídico"/>
        </label>
        <button type="submit" className={`${PRIMARY_BUTTON_CLASS} sm:self-end`}><Plus size={16}/> Adicionar</button>
      </form>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {categorias.map(c=><div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
          <span className="min-w-0 truncate text-sm font-medium text-ink">{c.nome}{!c.ativa&&<span className="ml-2 text-xs text-ink-muted">(arquivada)</span>}</span>
          <form action={alternarCategoriaDemanda}>
            <input type="hidden" name="categoria_id" value={c.id}/>
            <input type="hidden" name="ativa" value={c.ativa?"false":"true"}/>
            <button type="submit" className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink">
              {c.ativa?"Arquivar":"Reativar"}
            </button>
          </form>
        </div>)}
      </div>
    </details>}

    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">Acompanhamento</h2>
        <span className="text-xs text-ink-muted">{filtradas.length} exibidas · até 250 registros recentes</span>
      </div>
      <form method="get" className={`${CARD_CLASS} grid gap-3 p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] sm:items-end`}>
        <label className="text-xs font-medium text-ink-muted">Buscar
          <span className="relative block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"/>
            <input name="q" defaultValue={sp.q??""} placeholder="Título, pessoa ou descrição" className={`${INPUT_CLASS} mt-1 pl-9`}/>
          </span>
        </label>
        <label className="text-xs font-medium text-ink-muted">Situação
          <select name="status" defaultValue={statusValido} className={`${INPUT_CLASS} mt-1`}>
            <option value="">Todas</option>
            {Object.entries(LABEL).map(([value,label])=><option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-ink-muted">Categoria
          <select name="categoria" defaultValue={categoriaFiltro} className={`${INPUT_CLASS} mt-1`}>
            <option value="">Todas</option>
            {categorias.map(c=><option key={c.id} value={c.id}>{c.nome}{c.ativa?"":" (arquivada)"}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-ink-muted">Vencimento
          <select name="prazo" defaultValue={prazoFiltro} className={`${INPUT_CLASS} mt-1`}>
            <option value="">Todos os prazos</option>
            <option value="atrasadas">Vencidas</option>
            <option value="hoje">Vencem hoje</option>
            <option value="futuras">Próximas</option>
            <option value="sem_prazo">Sem prazo</option>
          </select>
        </label>
        <label className="text-xs font-medium text-ink-muted">Visualização
          <select name="escopo" defaultValue={escopo} className={`${INPUT_CLASS} mt-1`}>
            {gestor && <option value="todas">Equipe inteira</option>}
            <option value="minhas">Minhas demandas</option>
          </select>
        </label>
        <button type="submit" className={SECONDARY_BUTTON_CLASS}>Filtrar</button>
      </form>
      <div className="grid gap-3 lg:grid-cols-2">
        {filtradas.map(d=>{
          const status=d.status as Situacao;
          const atrasada=!!d.prazo && d.prazo<agora && d.status!=="concluida";
          return <Link key={d.id} href={`/demandas/${d.id}`} className={`${CARD_CLASS} block space-y-3 p-4 transition hover:border-brand/40 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${estiloStatus[status]??"bg-background text-ink"}`}>{LABEL[status]??d.status}</span>
              <span className={`text-xs font-semibold ${atrasada?"text-rose-700":d.prazo===agora&&d.status!=="concluida"?"text-amber-700":"text-ink-muted"}`}>{atrasada?"Vencida · ":d.prazo===agora&&d.status!=="concluida"?"Vence hoje · ":"Prazo: "}{fmt(d.prazo)}</span>
            </div>
            <h3 className="text-sm font-semibold leading-6 text-ink">{d.titulo}</h3>
            <span className="inline-flex rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-ink-muted">{nomesCategoria.get(d.categoria_id??"")??"Sem categoria"}</span>
            {d.descricao && <p className="line-clamp-2 text-xs leading-5 text-ink-muted">{d.descricao}</p>}
            <div className="flex justify-between gap-2 border-t border-border/70 pt-3 text-xs text-ink-muted">
              <span>Responsável: <strong className="text-ink">{nomes.get(d.responsavel_id)??"Colaborador"}</strong></span>
              <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${coresPrioridade[d.prioridade]??coresPrioridade.normal}`}>{PRIORIDADE[d.prioridade]??d.prioridade}</span>
            </div>
          </Link>;
        })}
      </div>
      {!filtradas.length && <div className={`${CARD_CLASS} p-8 text-center`}>
        <ClipboardList size={25} className="mx-auto text-ink-muted"/>
        <h3 className="mt-2 font-semibold text-ink">Nenhuma demanda encontrada</h3>
        <p className="mt-1 text-sm text-ink-muted">Ajuste os filtros ou distribua uma nova atividade.</p>
      </div>}
    </section>
  </main>;
}
