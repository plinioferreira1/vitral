import Link from "next/link";
import { notFound } from "next/navigation";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { createClient } from "@/lib/supabase/server";
import { criarMelhoria,atualizarMelhoria } from "./actions";

const STATUS:Record<string,string>={planejado:"Planejado",desenvolvimento:"Em desenvolvimento",laboratorio:"Laboratório",homologacao:"Homologação",publicado:"Publicado",pausado:"Pausado"};
const PRIORIDADE:Record<string,string>={critica:"Crítica",alta:"Alta",media:"Média",baixa:"Baixa"};
const SITUACOES=Object.entries(STATUS);
const PRIORIDADES=Object.entries(PRIORIDADE);
const campo="w-full min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus:border-brand outline-none";
const modulos=["Locação","Financeiro","Vendas","Financiamento","Demandas","Documentos","Integrações","Segurança","Experiência","Onboarding","Geral"];
export default async function DesenvolvimentoPage({searchParams}:{searchParams:Promise<{situacao?:string}>}){
 const {user,usuario}=await getUsuarioAtual();
 if(!user||!usuario?.ativo||!usuario.tenant_id||usuario.nivel_acesso!=="diretor")notFound();
 const db=await createClient();const params=await searchParams;
 const [{data:itens,error},{data:equipe}]=await Promise.all([
  db.from("vitral_desenvolvimento").select("id,titulo,modulo,descricao,prioridade,situacao,prazo,observacoes,responsavel_id,atualizado_em")
    .eq("tenant_id",usuario.tenant_id).order("atualizado_em",{ascending:false}).limit(200),
  db.from("usuarios").select("id,nome").eq("tenant_id",usuario.tenant_id).eq("ativo",true).order("nome")
 ]);
 if(error)return <p role="alert" className="text-rose-700">Não foi possível carregar as melhorias.</p>;
 const todos=itens??[];
 const filtro=params.situacao&&STATUS[params.situacao]?params.situacao:"todos";
 const visiveis=filtro==="todos"?todos:todos.filter(i=>i.situacao===filtro);
 const equipeAtiva=equipe??[];
 return <div className="mx-auto w-full min-w-0 space-y-6">
  <CabecalhoPagina titulo="Central de Desenvolvimento" descricao="Planeje, priorize e acompanhe as melhorias do VITRAL. Área exclusiva da direção." acao={<Link href="/onboarding-corretor" className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-brand">Conteúdo e treinamento</Link>}/>
  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
   {SITUACOES.map(([chave,label])=><Link key={chave} href={"/desenvolvimento?situacao="+chave} className={"rounded-xl border p-4 shadow-sm "+(filtro===chave?"border-brand bg-brand-soft":"border-border bg-surface")}>
    <p className="text-2xl font-semibold tabular-nums text-ink">{todos.filter(i=>i.situacao===chave).length}</p>
    <p className="mt-1 text-xs text-ink-muted">{label}</p>
   </Link>)}
  </div>
  <details className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
   <summary className="cursor-pointer font-semibold text-ink">+ Cadastrar melhoria</summary>
   <form action={criarMelhoria} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
    <label className="text-sm font-medium">Título *<input name="titulo" required minLength={4} maxLength={180} placeholder="Ex.: Central de E-mails da Locação" className={"mt-1 "+campo}/></label>
    <label className="text-sm font-medium">Módulo *<select name="modulo" className={"mt-1 "+campo}>{modulos.map(m=><option key={m}>{m}</option>)}</select></label>
    <label className="text-sm font-medium">Prioridade<select name="prioridade" className={"mt-1 "+campo}>{PRIORIDADES.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
    <label className="text-sm font-medium">Situação<select name="situacao" className={"mt-1 "+campo}>{SITUACOES.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
    <label className="text-sm font-medium">Responsável<select name="responsavel_id" className={"mt-1 "+campo}><option value="">A definir</option>{equipeAtiva.map(u=><option key={u.id} value={u.id}>{u.nome}</option>)}</select></label>
    <label className="text-sm font-medium md:col-span-2">Descrição<textarea name="descricao" rows={2} className={"mt-1 "+campo} placeholder="Escopo e resultado esperado"/></label>
    <button className="min-h-11 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white md:col-span-2 md:justify-self-start">Adicionar ao roadmap</button>
   </form>
  </details>
  <section className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold text-ink">{filtro==="todos"?"Todas as melhorias":STATUS[filtro]} · {visiveis.length}</h2><Link href="/desenvolvimento" className="text-sm text-brand underline">Ver todas</Link></div>
    {!visiveis.length?<div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-ink-muted">Nenhuma melhoria nesta etapa. Cadastre a primeira acima.</div>:
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{visiveis.map(item=><article key={item.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs text-ink-muted">{item.modulo}</p><h3 className="mt-1 font-semibold text-ink">{item.titulo}</h3></div><span className={"rounded-full px-2.5 py-1 text-xs font-semibold "+(item.prioridade==="critica"?"bg-rose-100 text-rose-800":item.prioridade==="alta"?"bg-amber-100 text-amber-900":"bg-background text-ink-muted")}>{PRIORIDADE[item.prioridade]||item.prioridade}</span></div>
      {item.descricao&&<p className="mt-2 text-sm text-ink-muted">{item.descricao}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-muted"><span className="rounded-full bg-background px-2 py-1">{STATUS[item.situacao]||item.situacao}</span><span className="rounded-full bg-background px-2 py-1">{equipeAtiva.find(u=>u.id===item.responsavel_id)?.nome||"Sem responsável"}</span>{item.prazo&&<span className="rounded-full bg-background px-2 py-1">Prazo: {item.prazo.split("-").reverse().join("/")}</span>}</div>
      <details className="mt-3 border-t border-border pt-3"><summary className="cursor-pointer text-sm font-medium text-brand">Editar e registrar andamento</summary>
       <form action={atualizarMelhoria} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={item.id}/>
        <label className="text-xs">Título<input name="titulo" required defaultValue={item.titulo} minLength={4} maxLength={180} className={"mt-1 "+campo}/></label>
        <label className="text-xs">Módulo<select name="modulo" defaultValue={item.modulo} className={"mt-1 "+campo}>{[...new Set([...modulos,item.modulo])].map(m=><option key={m}>{m}</option>)}</select></label>
        <label className="text-xs">Prioridade<select name="prioridade" defaultValue={item.prioridade} className={"mt-1 "+campo}>{PRIORIDADES.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
        <label className="text-xs">Situação<select name="situacao" defaultValue={item.situacao} className={"mt-1 "+campo}>{SITUACOES.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
        <label className="text-xs">Responsável<select name="responsavel_id" defaultValue={item.responsavel_id??""} className={"mt-1 "+campo}><option value="">A definir</option>{equipeAtiva.map(u=><option key={u.id} value={u.id}>{u.nome}</option>)}</select></label>
        <label className="text-xs">Prazo<input name="prazo" type="date" defaultValue={item.prazo??""} className={"mt-1 "+campo}/></label>
        <label className="text-xs sm:col-span-2">Descrição<textarea name="descricao" defaultValue={item.descricao??""} rows={2} className={"mt-1 "+campo}/></label>
        <label className="text-xs sm:col-span-2">Observações e próximos passos<textarea name="observacoes" defaultValue={item.observacoes??""} rows={3} className={"mt-1 "+campo}/></label>
        <button className="min-h-11 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white sm:col-span-2">Salvar alterações</button>
       </form>
      </details>
    </article>)}</div>}
  </section>
 </div>;
}
