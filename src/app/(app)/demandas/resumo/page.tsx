import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, ClipboardList, Clock3, AlertTriangle } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { CARD_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";

const formatarDia=(d:string)=>d.split("-").reverse().join("/");
const dataSP=(d:string)=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(d));
export default async function ResumoDemandasPage({searchParams}:{
  searchParams:Promise<{dia?:string}>;
}){
  const {user,usuario}=await getUsuarioAtual();
  if(!user||!usuario?.tenant_id||!usuario.ativo) redirect("/login");
  const gestor=["diretor","gerente"].includes(usuario.nivel_acesso);
  const sp=await searchParams;
  const hoje=dataSP(new Date().toISOString());
  const dia=/^\d{4}-\d{2}-\d{2}$/.test(sp.dia??"")?sp.dia!:hoje;
  const supabase=await createClient();
  const [tarefasResult,eventosResult,usuariosResult]=await Promise.all([
    supabase.from("demandas").select("id,titulo,status,prioridade,prazo,responsavel_id,solicitante_id,criada_em,concluida_em")
      .eq("tenant_id",usuario.tenant_id).is("excluida_em",null).order("criada_em",{ascending:false}).limit(500),
    supabase.from("demandas_atualizacoes").select("demanda_id,tipo,criada_em,autor_id,status_novo")
      .eq("tenant_id",usuario.tenant_id).order("criada_em",{ascending:false}).limit(1200),
    supabase.from("usuarios").select("id,nome").eq("tenant_id",usuario.tenant_id).eq("ativo",true),
  ]);
  if(tarefasResult.error||eventosResult.error||usuariosResult.error)
    return <p role="alert" className="p-5 text-sm text-rose-700">Não foi possível gerar o resumo do dia.</p>;
  const tarefas=(tarefasResult.data??[]).filter(d=>gestor||d.responsavel_id===user.id);
  const ids=new Set(tarefas.map(t=>t.id));
  const eventos=(eventosResult.data??[]).filter(e=>ids.has(e.demanda_id)&&dataSP(e.criada_em)===dia);
  const criadas=tarefas.filter(t=>dataSP(t.criada_em)===dia);
  const concluidas=tarefas.filter(t=>t.concluida_em&&dataSP(t.concluida_em)===dia);
  const abertas=tarefas.filter(t=>t.status!=="concluida");
  const atrasadas=abertas.filter(t=>t.prazo&&t.prazo<dia);
  const bloqueadas=abertas.filter(t=>t.status==="bloqueada");
  const atualizadas=Array.from(new Set(eventos.map(e=>e.demanda_id)));
  const nomes=new Map((usuariosResult.data??[]).map(u=>[u.id,u.nome]));
  const pessoas=new Map<string,{nome:string,total:number,concluidas:number,bloqueadas:number}>();
  for(const t of tarefas) {
    const atual=pessoas.get(t.responsavel_id)??{nome:nomes.get(t.responsavel_id)??"Colaborador",total:0,concluidas:0,bloqueadas:0};
    atual.total++;
    if(t.status==="concluida") atual.concluidas++;
    if(t.status==="bloqueada") atual.bloqueadas++;
    pessoas.set(t.responsavel_id,atual);
  }
  return <main className="space-y-5">
    <Link href="/demandas" className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"><ArrowLeft size={16}/> Voltar às demandas</Link>
    <CabecalhoPagina titulo="Fechamento das Demandas" descricao="Resumo gerado a partir das atividades registradas no VITRAL, sem presumir tarefas concluídas."/>
    <form method="get" className={`${CARD_CLASS} flex flex-wrap items-end gap-3 p-4`}>
      <label className="text-xs font-medium text-ink-muted">Dia do relatório
        <input type="date" name="dia" defaultValue={dia} className="mt-1 block min-h-11 rounded-lg border border-border bg-surface px-3 text-sm text-ink"/>
      </label>
      <button type="submit" className={SECONDARY_BUTTON_CLASS}>Consultar</button>
      <span className="pb-3 text-xs text-ink-muted">Referência: Brasília · {formatarDia(dia)}</span>
    </form>
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {[
        {titulo:"Criadas no dia",n:criadas.length,icone:ClipboardList},
        {titulo:"Concluídas no dia",n:concluidas.length,icone:CheckCircle2},
        {titulo:"Com atualização",n:atualizadas.length,icone:Clock3},
        {titulo:"Atrasadas",n:atrasadas.length,icone:AlertTriangle},
      ].map(({titulo,n,icone:Icon})=><div className={`${CARD_CLASS} p-4`} key={titulo}>
        <p className="flex items-center gap-2 text-xs text-ink-muted"><Icon size={15}/>{titulo}</p>
        <p className="mt-2 text-2xl font-bold tabular-nums text-ink">{n}</p>
      </div>)}
    </div>
    <section className={`${CARD_CLASS} space-y-3 p-4 sm:p-5`}>
      <h2 className="font-semibold text-ink">Visão da equipe</h2>
      <p className="text-xs text-ink-muted">As contagens abaixo representam o estado atual de cada fila. O histórico diário é contabilizado acima.</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {[...pessoas.values()].sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR")).map(p=><div key={p.nome} className="rounded-lg border border-border p-3">
          <h3 className="text-sm font-semibold text-ink">{p.nome}</h3>
          <p className="mt-1 text-xs text-ink-muted">{p.total} demandas · {p.concluidas} concluídas · {p.bloqueadas} bloqueadas</p>
        </div>)}
      </div>
      {!pessoas.size&&<p className="text-sm text-ink-muted">Nenhuma demanda registrada.</p>}
    </section>
    <section className={`${CARD_CLASS} space-y-3 p-4 sm:p-5`}>
      <h2 className="font-semibold text-ink">Prioridades que exigem atenção</h2>
      {[...bloqueadas,...atrasadas.filter(d=>d.status!=="bloqueada")].slice(0,30).map(t=><Link key={t.id}
        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 hover:border-brand"
        href={`/demandas/${t.id}`}>
        <span className="min-w-0 text-sm font-medium text-ink">{t.titulo}</span>
        <span className="text-xs text-rose-700">{t.status==="bloqueada"?"Bloqueada":"Atrasada"} · {nomes.get(t.responsavel_id)??"Colaborador"}</span>
      </Link>)}
      {!bloqueadas.length&&!atrasadas.length&&<p className="text-sm text-ink-muted">Nenhuma demanda bloqueada ou vencida no período selecionado.</p>}
    </section>
    <section className={`${CARD_CLASS} space-y-2 p-4 sm:p-5`}>
      <h2 className="font-semibold text-ink">O que aconteceu no dia</h2>
      <p className="text-xs text-ink-muted">O resumo considera ações registradas, não inferências de produtividade. A listagem exibe até 1.200 eventos recentes.</p>
      {eventos.slice(0,100).map((ev,i)=><Link key={ev.demanda_id+"-"+i} href={`/demandas/${ev.demanda_id}`}
        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background p-3 text-sm hover:text-brand">
        <span>{ev.tipo==="comentario"?"Nova atualização":ev.tipo==="status"?"Situação alterada":"Demanda criada"}</span>
        <span className="text-xs text-ink-muted">{nomes.get(ev.autor_id??"")??"Sistema"} · {new Intl.DateTimeFormat("pt-BR",{timeZone:"America/Sao_Paulo",hour:"2-digit",minute:"2-digit"}).format(new Date(ev.criada_em))}</span>
      </Link>)}
      {!eventos.length&&<p className="text-sm text-ink-muted">Nenhuma atualização registrada neste dia.</p>}
    </section>
  </main>;
}
