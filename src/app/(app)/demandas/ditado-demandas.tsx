"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Sparkles, Send, AlertTriangle, Plus, Trash2 } from "lucide-react";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { criarDemandasEmLote } from "./actions";

type Colaborador={id:string;nome:string};
type Proposta={titulo:string;descricao:string;responsavel_id:string;prazo:string;prioridade:string};
type ResultadoVoz={isFinal:boolean;[index:number]:{transcript:string}};
type EventoVoz={results:ArrayLike<ResultadoVoz>};
type ReconhecimentoVoz={
  lang:string;continuous:boolean;interimResults:boolean;
  onresult:((e:EventoVoz)=>void)|null;
  onend:(()=>void)|null;
  onerror:((e:{error:string})=>void)|null;
  start:()=>void;stop:()=>void;
};
type ConstrutorVoz=new()=>ReconhecimentoVoz;
type JanelaVoz=Window&{SpeechRecognition?:ConstrutorVoz;webkitSpeechRecognition?:ConstrutorVoz};
const normalizar=(t:string)=>t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").trim();
const agoraSP=(dias=0)=>{
  const partes=new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const n=(tipo:string)=>Number(partes.find(p=>p.type===tipo)?.value??0);
  return new Date(Date.UTC(n("year"),n("month")-1,n("day")+dias)).toISOString().slice(0,10);
};

function sugerir(texto:string,pessoas:Colaborador[]):Proposta[] {
  const partes=texto
    .replace(/([.!?])\s+(?=[A-ZÁÉÍÓÚÃÕÂÊÔÇ])/g,"$1\n")
    .split(/[\n;]+/).map(s=>s.trim()).filter(Boolean).slice(0,10);
  return partes.map(textoItem=>{
    const t=normalizar(textoItem);
    let responsavel_id="";
    let instrucao=textoItem;
    const nomesValidos=pessoas.filter(p=>{
      const primeiro=normalizar(p.nome.split(/\s+/)[0]);
      return primeiro.length>=3 && (t.startsWith(primeiro+",")||t.startsWith(primeiro+":")||t.startsWith(primeiro+" "));
    });
    if(nomesValidos.length===1){
      responsavel_id=nomesValidos[0].id;
      instrucao=textoItem.replace(/^\S+[\s,:–—-]*/,"").trim()||textoItem;
    }
    const prazo=/\bamanh[ãa]\b/i.test(textoItem)?agoraSP(1):/\bhoje\b/i.test(textoItem)?agoraSP():"";
    const prioridade=/\burgent[ea]\b/i.test(textoItem)?"urgente":/\bprioridade\b/i.test(textoItem)?"alta":"normal";
    const titulo=instrucao.slice(0,180);
    const descricao=instrucao.length>180?instrucao:"";
    return {titulo,descricao,responsavel_id,prazo,prioridade};
  });
}

export function DitadoDemandas({equipe}:{equipe:Colaborador[]}) {
  const [suportado,setSuportado]=useState(false);
  const [gravando,setGravando]=useState(false);
  const [texto,setTexto]=useState("");
  const [erro,setErro]=useState("");
  const [propostas,setPropostas]=useState<Proposta[]>([]);
  const [loteId,setLoteId]=useState("");
  const reconhecimento=useRef<ReconhecimentoVoz|null>(null);
  useEffect(()=>{
    const w=window as JanelaVoz;
    setSuportado(Boolean(w.SpeechRecognition||w.webkitSpeechRecognition));
    return ()=>{reconhecimento.current?.stop();};
  },[]);
  const iniciar=()=>{
    setErro("");
    const w=window as JanelaVoz;
    const Construtor=w.SpeechRecognition||w.webkitSpeechRecognition;
    if(!Construtor){setErro("O reconhecimento de voz não é compatível com este navegador. Digite a mensagem abaixo.");return;}
    const r=new Construtor();
    r.lang="pt-BR";r.continuous=true;r.interimResults=true;
    r.onresult=e=>{
      const partes=Array.from({length:e.results.length},(_,i)=>e.results[i][0]?.transcript??"");
      setTexto(partes.join(" ").trim());
    };
    r.onerror=e=>{setErro("O ditado não pôde continuar ("+e.error+"). Você pode editar o texto manualmente.");setGravando(false);};
    r.onend=()=>setGravando(false);
    reconhecimento.current=r;
    setTexto("");
    setPropostas([]);
    try{r.start();setGravando(true);}catch{setErro("Não foi possível acessar o microfone.");setGravando(false);}
  };
  const parar=()=>{reconhecimento.current?.stop();setGravando(false);};
  const preparar=()=>{
    const lista=sugerir(texto,equipe);
    if(!lista.length){setErro("Escreva ou dite ao menos uma solicitação.");return;}
    setPropostas(lista);
    setLoteId(crypto.randomUUID());
    setErro("");
  };
  const ajustar=(i:number,campos:Partial<Proposta>)=>setPropostas(prev=>prev.map((p,j)=>j===i?{...p,...campos}:p));
  const remover=(i:number)=>setPropostas(prev=>prev.filter((_,j)=>i!==j));
  const podeEnviar=!!loteId && propostas.length>0 && propostas.every(p=>
    p.titulo.length>=4&&p.titulo.length<=180&&!!p.responsavel_id&&(!p.prazo||/^\d{4}-\d{2}-\d{2}$/.test(p.prazo)));
  return <section className={`${CARD_CLASS} space-y-4 p-4 sm:p-5`}>
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Mic size={20}/></span>
      <div>
        <h2 className="font-semibold text-ink">Distribuir demandas por voz</h2>
        <p className="mt-1 text-xs leading-5 text-ink-muted">Dite as atividades, revise cada uma e escolha os responsáveis antes de distribuir.</p>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {!gravando?<button type="button" onClick={iniciar} disabled={!suportado}
        className={PRIMARY_BUTTON_CLASS}><Mic size={16}/> Iniciar ditado</button>:
        <button type="button" onClick={parar} className={PRIMARY_BUTTON_CLASS}><MicOff size={16}/> Parar ditado</button>}
      <span className="text-xs text-ink-muted" role="status">{gravando?"Ouvindo pelo microfone...":suportado?"Microfone disponível":"Ditado indisponível neste navegador"}</span>
    </div>
    <p className="text-xs leading-5 text-ink-muted">Este modo experimental usa o reconhecimento de voz do navegador, que pode processar o áudio pelo provedor do navegador. O VITRAL não guarda a gravação nesta etapa. Não dite informações confidenciais. Você também pode digitar.</p>
    <label className="block text-xs font-medium text-ink-muted">Texto do áudio (editável)
      <textarea className={`${INPUT_CLASS} mt-1`} value={texto} onChange={e=>setTexto(e.target.value)}
        rows={4} maxLength={12000} placeholder="Ex.: Amanda, finalizar a avaliação do Guará amanhã; João, conferir documentação do cliente hoje."/>
    </label>
    <p className="text-xs text-ink-muted">Separe atividades por ponto e vírgula ou linha. O sistema apenas sugere nome e prazo quando encontra indicação clara; sempre revise.</p>
    <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={preparar}><Sparkles size={16}/> Preparar prévia das tarefas</button>
    {erro&&<p role="alert" className="flex items-center gap-2 text-xs text-rose-700"><AlertTriangle size={15}/>{erro}</p>}
    {!!propostas.length&&<form action={criarDemandasEmLote} className="space-y-3 border-t border-border pt-4">
      <input type="hidden" name="lote_id" value={loteId}/>
      <input type="hidden" name="tarefas_json" value={JSON.stringify(propostas)}/>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{propostas.length} {propostas.length===1?"demanda identificada":"demandas identificadas"}</h3>
        <span className="text-xs text-ink-muted">Revise antes de confirmar</span>
      </div>
      {propostas.map((p,i)=><div key={i} className="space-y-3 rounded-xl border border-border bg-background/60 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-ink">Demanda {i+1}</h4>
          <button type="button" onClick={()=>remover(i)} aria-label={`Remover demanda ${i+1}`}
            className="rounded-lg p-2 text-ink-muted hover:text-rose-700"><Trash2 size={16}/></button>
        </div>
        <label className="block text-xs font-medium text-ink-muted">Atividade *
          <textarea rows={2} minLength={4} maxLength={180} required className={`${INPUT_CLASS} mt-1`}
            value={p.titulo} onChange={e=>ajustar(i,{titulo:e.target.value})}/>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-ink-muted">Responsável *
            <select required value={p.responsavel_id} onChange={e=>ajustar(i,{responsavel_id:e.target.value})}
              className={`${INPUT_CLASS} mt-1`}>
              <option value="">Escolha uma pessoa</option>
              {equipe.map(u=><option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-ink-muted">Prazo
            <input type="date" value={p.prazo} onChange={e=>ajustar(i,{prazo:e.target.value})}
              className={`${INPUT_CLASS} mt-1`}/>
          </label>
          <label className="text-xs font-medium text-ink-muted">Prioridade
            <select value={p.prioridade} onChange={e=>ajustar(i,{prioridade:e.target.value})}
              className={`${INPUT_CLASS} mt-1`}>
              <option value="baixa">Baixa</option><option value="normal">Normal</option>
              <option value="alta">Alta</option><option value="urgente">Urgente</option>
            </select>
          </label>
        </div>
      </div>)}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={()=>setPropostas(p=>p.length<10?[...p,{titulo:"",descricao:"",responsavel_id:"",prazo:"",prioridade:"normal"}]:p)}
          disabled={propostas.length>=10}><Plus size={15}/> Adicionar tarefa</button>
        <button type="submit" disabled={!podeEnviar}
          className={`${PRIMARY_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-40`}><Send size={15}/> Distribuir {propostas.length} demanda(s)</button>
      </div>
    </form>}
  </section>;
}
