import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CalendarClock, CheckCircle2, ClipboardList, Plus, Search, Users } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { criarDemanda, marcarNotificacaoDemandaLida } from "./actions";
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
const hojeSP = () => new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const fmt = (data:string|null) => data ? data.slice(0,10).split("-").reverse().join("/") : "Sem prazo";

export default async function DemandasPage({searchParams}:{
  searchParams:Promise<{q?:string;status?:string;escopo?:string}>;
}) {
  const { user, usuario } = await getUsuarioAtual();
  if(!user || !usuario?.tenant_id || !usuario.ativo) redirect("/login");
  const gestor=["diretor","gerente"].includes(usuario.nivel_acesso);
  const sp=await searchParams;
  const supabase=await createClient();
  const [rDemandas,rAvisos,rEquipe]=await Promise.all([
    supabase.from("demandas")
      .select("id,titulo,descricao,status,prioridade,prazo,responsavel_id,solicitante_id,criada_em,concluida_em")
      .eq("tenant_id",usuario.tenant_id).order("criada_em",{ascending:false}).limit(250),
    supabase.from("demandas_notificacoes")
      .select("id,demanda_id,titulo,mensagem,criada_em")
      .eq("tenant_id",usuario.tenant_id).eq("destinatario_id",user.id)
      .is("lida_em",null).order("criada_em",{ascending:false}).limit(12),
    supabase.from("usuarios").select("id,nome,ativo")
      .eq("tenant_id",usuario.tenant_id).eq("ativo",true).order("nome"),
  ]);
  if(rDemandas.error || rAvisos.error || rEquipe.error) {
    return <div role="alert" className="rounded-xl border border-rose-200 p-5 text-sm text-rose-800">
      Não foi possível carregar a Central de Demandas. {rDemandas.error?.message||rAvisos.error?.message||rEquipe.error?.message}
    </div>;
  }
  const tarefas = rDemandas.data??[];
  const equipe=rEquipe.data??[];
  const nomes=new Map(equipe.map(u=>[u.id,u.nome]));
  const agora=hojeSP();
  const buscar=(sp.q??"").trim().toLocaleLowerCase("pt-BR");
  const statusValido=Object.prototype.hasOwnProperty.call(LABEL,sp.status??"") ? sp.status! : "";
  const escopo=sp.escopo==="minhas"||!gestor?"minhas":"todas";
  const filtradas=tarefas
    .filter(d=>escopo!=="minhas"||d.responsavel_id===user.id)
    .filter(d=>!statusValido||d.status===statusValido)
    .filter(d=>!buscar||[d.titulo,d.descricao,nomes.get(d.responsavel_id)].some(v=>v?.toLocaleLowerCase("pt-BR").includes(buscar)));
  const contagens={
    abertas:tarefas.filter(d=>d.status!=="concluida").length,
    minhas:tarefas.filter(d=>d.responsavel_id===user.id && d.status!=="concluida").length,
    concluidas:tarefas.filter(d=>d.status==="concluida").length,
    atrasadas:tarefas.filter(d=>d.prazo && d.prazo<agora && d.status!=="concluida").length,
  };
  return <main className="w-full min-w-0 space-y-5">
    <CabecalhoPagina titulo="Central de Demandas"
      descricao="Distribua atividades e acompanhe o andamento de cada colaborador. Todo pedido fica registrado, com responsável e histórico."
      acao={<Link href="/demandas/resumo" className={SECONDARY_BUTTON_CLASS}><ClipboardList size={16}/> Fechamento do dia</Link>}/>
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {[
        {t:"Em aberto",n:contagens.abertas,icon:ClipboardList},
        {t:"Minhas pendências",n:contagens.minhas,icon:Users},
        {t:"Concluídas",n:contagens.concluidas,icon:CheckCircle2},
        {t:"Atrasadas",n:contagens.atrasadas,icon:CalendarClock},
      ].map(({t,n,icon:Icon})=><div key={t} className={`${CARD_CLASS} p-3 sm:p-4`}>
        <span className="flex items-center gap-2 text-xs font-medium text-ink-muted"><Icon size={15}/>{t}</span>
        <p className="mt-2 text-2xl font-bold tabular-nums text-ink">{n}</p>
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

    {gestor && <DitadoDemandas equipe={equipe.map(u=>({id:u.id,nome:u.nome}))} iaAtiva={Boolean(process.env.OPENAI_API_KEY)}/>}

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
      <p className="mt-3 text-xs text-ink-muted">Nesta primeira versão, as demandas são criadas por texto. Gravação de áudio e extração automática entram na próxima etapa, com revisão antes do envio.</p>
    </details>}

    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">Acompanhamento</h2>
        <span className="text-xs text-ink-muted">{filtradas.length} exibidas · até 250 registros recentes</span>
      </div>
      <form method="get" className={`${CARD_CLASS} grid gap-3 p-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end`}>
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
              <span className={`text-xs font-medium ${atrasada?"text-rose-700":"text-ink-muted"}`}>{atrasada?"Atrasada · ":"Prazo: "}{fmt(d.prazo)}</span>
            </div>
            <h3 className="text-sm font-semibold leading-6 text-ink">{d.titulo}</h3>
            {d.descricao && <p className="line-clamp-2 text-xs leading-5 text-ink-muted">{d.descricao}</p>}
            <div className="flex justify-between gap-2 border-t border-border/70 pt-3 text-xs text-ink-muted">
              <span>Responsável: <strong className="text-ink">{nomes.get(d.responsavel_id)??"Colaborador"}</strong></span>
              <span>{PRIORIDADE[d.prioridade]??d.prioridade}</span>
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
