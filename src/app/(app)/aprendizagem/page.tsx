import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, CheckCircle2, PlayCircle, ArrowUpRight } from "lucide-react";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { marcarEtapaAprendizagem } from "./actions";
const trilhas:Record<string,{nome:string,links:{titulo:string,href:string,descricao:string}[]}> = {
 corretor:{nome:"Corretagem",links:[
  {titulo:"Captação e vendas",href:"/corretor",descricao:"Guias de captação, abordagem e documentação"},
  {titulo:"Meus processos",href:"/minhas-vendas",descricao:"Acompanhe negócios e registros"},
  {titulo:"Documentos digitais",href:"/termos-visita",descricao:"Prepare os termos de visita"}]},
 social_media:{nome:"Comunicação",links:[
  {titulo:"Central de ajuda",href:"/corretor",descricao:"Materiais e modelos de comunicação"},
  {titulo:"Minhas demandas",href:"/demandas",descricao:"Acompanhe tarefas atribuídas"}]},
 gerente_locacao:{nome:"Locação",links:[
  {titulo:"Contratos",href:"/locacao?aba=contratos",descricao:"Conheça a carteira e os documentos"},
  {titulo:"Inadimplências",href:"/locacao/debitos",descricao:"Acompanhe débitos e solicitações"},
  {titulo:"Minhas demandas",href:"/demandas",descricao:"Organize os prazos"}]}
};
const geral={nome:"Operação e gestão",links:[
 {titulo:"Central de Demandas",href:"/demandas",descricao:"Organize atividades, prazos e prioridades"},
 {titulo:"Central de ajuda",href:"/corretor",descricao:"Pesquise guias, vídeos e modelos"},
 {titulo:"Calendário",href:"/calendario",descricao:"Visualize os compromissos e prazos"}]};
export default async function AprendizagemPage(){
 const {user,usuario}=await getUsuarioAtual();
 if(!user||!usuario?.ativo||!usuario.tenant_id)redirect("/login");
 const db=await createClient();
 const [{data:etapas,error:erroEtapas},{data:progresso},{data:tutoriais}]=await Promise.all([
  db.from("onboarding_etapas").select("id,nome,descricao,link,ordem").eq("tenant_id",usuario.tenant_id).order("ordem"),
  db.from("onboarding_status").select("etapa_id,concluida").eq("usuario_id",user.id),
  db.from("tutoriais").select("id,titulo,categoria,tipo").eq("tenant_id",usuario.tenant_id).order("ordem").limit(8)
 ]);
 if(erroEtapas)return <p role="alert">Não foi possível carregar o roteiro de integração.</p>;
 const completos=new Set((progresso??[]).filter(p=>p.concluida).map(p=>p.etapa_id));
 const total=etapas?.length??0, feitos=(etapas??[]).filter(e=>completos.has(e.id)).length;
 const roteiro=trilhas[usuario.nivel_acesso]??geral;
 return <div className="mx-auto w-full min-w-0 space-y-6">
  <CabecalhoPagina titulo="Central de Aprendizagem" descricao="Seu ponto de partida para conhecer o VITRAL. Acompanhe os primeiros passos, explore tutoriais e aprenda usando o sistema." acao={<Link href="/corretor" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Abrir todos os tutoriais</Link>}/>
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
   <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm lg:col-span-2">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-brand">Sua integração</p><h2 className="mt-2 text-lg font-semibold text-ink">Checklist de primeiros passos</h2><p className="mt-1 text-sm text-ink-muted">Marque cada etapa após realizá-la.</p></div><span className="text-xl font-semibold text-brand">{feitos}/{total}</span></div>
    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-brand" style={{width:(total?feitos/total*100:0)+"%"}}/></div>
    <div className="mt-4 space-y-2">
     {!total?<p className="rounded-lg border border-dashed border-border p-4 text-sm text-ink-muted">O checklist ainda não foi configurado pela gestão.</p>:
     (etapas??[]).map(e=><article key={e.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 p-3">
       <span className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-full "+(completos.has(e.id)?"bg-emerald-50 text-emerald-700":"bg-background text-ink-muted")}><CheckCircle2 size={18}/></span>
       <div className="min-w-0 flex-1"><p className={"text-sm font-semibold "+(completos.has(e.id)?"text-ink-muted":"text-ink")}>{e.nome}</p>{e.descricao&&<p className="text-xs text-ink-muted">{e.descricao}</p>}{e.link&&<Link className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline" href={e.link}>Abrir etapa <ArrowUpRight size={13}/></Link>}</div>
       <form action={marcarEtapaAprendizagem}><input type="hidden" name="etapa_id" value={e.id}/><input type="hidden" name="concluir" value={completos.has(e.id)?"0":"1"}/><button className={"min-h-10 rounded-lg px-3 py-2 text-xs font-semibold "+(completos.has(e.id)?"border border-border text-ink-muted":"bg-brand text-white")}>{completos.has(e.id)?"Refazer":"Concluir"}</button></form>
      </article>)}
    </div>
   </div>
   <div className="space-y-4">
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
     <p className="text-xs font-semibold uppercase tracking-wide text-brand">Trilha recomendada</p><h2 className="mt-1 text-lg font-semibold text-ink">{roteiro.nome}</h2>
     <div className="mt-4 space-y-3">{roteiro.links.map(l=><Link key={l.href} href={l.href} className="flex gap-3 rounded-lg border border-border/70 p-3 hover:bg-background"><BookOpen size={18} className="mt-1 shrink-0 text-brand"/><span><strong className="block text-sm text-ink">{l.titulo}</strong><span className="block text-xs text-ink-muted">{l.descricao}</span></span></Link>)}</div>
    </section>
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm"><div className="flex items-center gap-2"><PlayCircle size={18} className="text-brand"/><h2 className="font-semibold text-ink">Tutoriais disponíveis</h2></div>
     <p className="mt-2 text-sm text-ink-muted">{tutoriais?.length??0} materiais cadastrados para consulta. Os conteúdos completos ficam na Central de Ajuda.</p>
     <Link href="/corretor" className="mt-3 inline-block text-sm font-semibold text-brand hover:underline">Explorar biblioteca</Link></section>
   </div>
  </div>
 </div>;
}
