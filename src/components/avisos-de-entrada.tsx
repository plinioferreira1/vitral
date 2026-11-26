"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellRing, CalendarClock, CheckCircle2, X } from "lucide-react";

export type DemandaEntrada = {id:string;titulo:string;prazo:string|null;prioridade:string};
export type AvisoEntrada = {id:string;etapa:string;contexto:string;prazo:string;href?:string;processoId:string;tipo:string};
const hojeBR=()=>{
 const partes=new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const p=(tipo:string)=>partes.find(t=>t.type===tipo)?.value??"";
 return [p("year"),p("month"),p("day")].join("-");
};
const estilos={
 urgente:"bg-rose-100 text-rose-800",alta:"bg-orange-100 text-orange-800",
 normal:"bg-sky-100 text-sky-800",baixa:"bg-slate-100 text-slate-700",
};
export function AvisosDeEntrada({usuarioId,notificacoes,demandas}:{
 usuarioId:string;notificacoes:AvisoEntrada[];demandas:DemandaEntrada[];
}){
 const [aberto,setAberto]=useState(false);
 const dia=hojeBR();
 // Uma vez por dia por pessoa (neste navegador): na primeira tela aberta do dia.
 // Fica marcado assim que aparece, para não voltar em outra aba, ao recarregar
 // ou quando chega um aviso novo — esses ficam no sino.
 const chave="vitral-avisos-inicio:"+usuarioId;
 useEffect(()=>{
  if(!notificacoes.length&&!demandas.length)return;
  let jaViuHoje=false;
  try{jaViuHoje=localStorage.getItem(chave)===dia;}catch{jaViuHoje=false;}
  if(jaViuHoje)return;
  const t=window.setTimeout(()=>{
   setAberto(true);
   try{localStorage.setItem(chave,dia);}catch{}
  },400);
  return ()=>window.clearTimeout(t);
 },[chave,dia,notificacoes.length,demandas.length]);
 const fechar=()=>setAberto(false);
 useEffect(()=>{
  if(!aberto)return;
  const esc=(e:KeyboardEvent)=>{if(e.key==="Escape")fechar();};
  document.addEventListener("keydown",esc);
  return ()=>document.removeEventListener("keydown",esc);
 },[aberto]);
 if(!aberto)return null;
 const vencidas=demandas.filter(d=>d.prazo&&d.prazo<dia);
 const hoje=demandas.filter(d=>d.prazo===dia);
 return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-3 sm:p-6" role="presentation">
  <section role="dialog" aria-modal="true" aria-labelledby="vitral-boasvindas" className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl" style={{maxHeight:"min(88dvh,720px)"}}>
   <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
    <div>
     <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand"><BellRing size={16}/> VITRAL · Sua atenção hoje</p>
     <h2 id="vitral-boasvindas" className="mt-1 text-lg font-semibold text-ink">Bom trabalho! Veja o que precisa de você.</h2>
     <p className="mt-1 text-xs text-ink-muted">Novidades e tarefas em aberto. Os avisos continuarão disponíveis no sino.</p>
    </div>
    <button type="button" onClick={fechar} autoFocus aria-label="Fechar resumo de entrada" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-background"><X size={19}/></button>
   </header>
   <div className="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-5">
    <div className="grid grid-cols-3 gap-2">
     {[{n:notificacoes.length,t:"Avisos",color:"text-brand"},{n:vencidas.length,t:"Vencidas",color:"text-rose-700"},{n:hoje.length,t:"Para hoje",color:"text-amber-700"}].map(c=>
      <div key={c.t} className="rounded-xl border border-border bg-background p-3 text-center">
       <p className={"text-xl font-bold tabular-nums "+c.color}>{c.n}</p>
       <p className="text-xs text-ink-muted">{c.t}</p>
      </div>)}
    </div>
    {!!notificacoes.length&&<section className="space-y-2">
      <h3 className="text-sm font-semibold text-ink">Notificações não lidas</h3>
      {notificacoes.slice(0,6).map(n=><Link key={n.id} href={n.href??(n.processoId?"/processos/"+n.processoId+"#etapa-"+n.id:"/demandas")} onClick={fechar} className="block rounded-xl border border-border p-3 hover:bg-background">
       <p className="text-sm font-medium text-ink">{n.etapa}</p>
       <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{n.contexto} · {n.prazo}</p>
      </Link>)}
      {notificacoes.length>6&&<p className="text-xs text-ink-muted">Mais {notificacoes.length-6} notificações no sino.</p>}
    </section>}
    {!!demandas.length&&<section className="space-y-2">
     <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><CalendarClock size={16}/> Demandas em aberto</h3>
     {demandas.slice(0,6).map(d=><Link key={d.id} href={"/demandas/"+d.id} onClick={fechar}
       className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 hover:bg-background">
      <div className="min-w-0">
       <p className="truncate text-sm font-medium text-ink">{d.titulo}</p>
       <p className={"mt-1 text-xs "+(d.prazo&&d.prazo<dia?"text-rose-700":d.prazo===dia?"text-amber-700":"text-ink-muted")}>
        {d.prazo?d.prazo.split("-").reverse().join("/"):"Sem prazo"}
       </p>
      </div>
      <span className={"shrink-0 rounded-lg px-2 py-1 text-xs font-semibold "+(estilos[d.prioridade as keyof typeof estilos]??estilos.normal)}>{d.prioridade}</span>
     </Link>)}
    </section>}
   </div>
   <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border p-4">
    <button type="button" onClick={fechar} className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold text-ink">Entendi</button>
    <Link href="/demandas" onClick={fechar} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white">
     <CheckCircle2 size={16}/> Ver minhas demandas
    </Link>
   </footer>
  </section>
 </div>;
}
