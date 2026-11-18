"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Sparkles, Send, AlertTriangle, Plus, Trash2, Upload, AudioLines } from "lucide-react";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { criarDemandasEmLote } from "./actions";
import { validarLote } from "@/lib/demandas/validacao";

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
  const [gravando,setGravando]=useState(false);
  const [texto,setTexto]=useState("");
  const [erro,setErro]=useState("");
  const [propostas,setPropostas]=useState<Proposta[]>([]);
  const [loteId,setLoteId]=useState("");
  const reconhecimento=useRef<ReconhecimentoVoz|null>(null);
  const gravador=useRef<MediaRecorder|null>(null);
  const stream=useRef<MediaStream|null>(null);
  const [gravacaoAtiva,setGravacaoAtiva]=useState(false);
  const [audio,setAudio]=useState<File|null>(null);
  const [processandoIA,setProcessandoIA]=useState(false);
  useEffect(()=>{
    return ()=>{reconhecimento.current?.stop();if(gravador.current?.state==="recording")gravador.current.stop();stream.current?.getTracks().forEach(t=>t.stop());};
  },[]);
  const iniciar=()=>{
    setErro("");
    const w=window as JanelaVoz;
    const Construtor=w.SpeechRecognition||w.webkitSpeechRecognition;
    if(!Construtor){setErro("Seu navegador não oferece reconhecimento de voz. Você pode escrever a solicitação e distribuí-la normalmente, ou registrar áudio como resposta em uma demanda.");return;}
    const r=new Construtor();
    r.lang="pt-BR";r.continuous=true;r.interimResults=true;
    r.onresult=e=>{
      const partes=Array.from({length:e.results.length},(_,i)=>e.results[i][0]?.transcript??"");
      setTexto(partes.join(" ").trim());
    };
    r.onerror=e=>{
      const mensagens:Record<string,string>={
        "not-allowed":"O navegador bloqueou o ditado. No computador, clique no ícone de controles/cadeado ao lado do endereço do VITRAL, permita o microfone e atualize a página. No celular, verifique a permissão do microfone nas configurações do navegador. Se continuar, use o cadastro por texto ou grave uma mensagem na própria demanda.",
        "service-not-allowed":"O serviço de reconhecimento de voz foi bloqueado pelo navegador, mesmo que o microfone esteja autorizado. Experimente o Chrome atualizado ou use o cadastro por texto.",
        "audio-capture":"Nenhum microfone foi encontrado. Confira o dispositivo ou use o cadastro manual.",
        "network":"O serviço de ditado perdeu a conexão. Confirme sua internet ou escreva as solicitações.",
        "no-speech":"Nenhuma fala foi reconhecida. Fale perto do microfone e tente novamente.",
      };
      setErro(mensagens[e.error]??"O ditado não pôde continuar. Você pode escrever as tarefas diretamente abaixo.");
      setGravando(false);
    };
    r.onend=()=>setGravando(false);
    reconhecimento.current=r;
    setTexto("");
    setPropostas([]);
    try{r.start();setGravando(true);}catch{setErro("O navegador não autorizou o reconhecimento de voz. Libere o microfone nas permissões do site, atualize a página e tente novamente.");setGravando(false);}
  };
  const parar=()=>{reconhecimento.current?.stop();setGravando(false);};
  const iniciarAudio=async()=>{
    setErro("");setAudio(null);
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){
      setErro("Este navegador não oferece gravação por áudio. Selecione um arquivo já gravado.");return;
    }
    try{
      const mic=await navigator.mediaDevices.getUserMedia({audio:true});
      stream.current=mic;
      const tipos=["audio/webm;codecs=opus","audio/mp4","audio/webm"].filter(t=>MediaRecorder.isTypeSupported(t));
      const r=new MediaRecorder(mic,tipos[0]?{mimeType:tipos[0]}:undefined);
      const chunks:Blob[]=[];
      r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      r.onstop=()=>{
        const tipo=r.mimeType.split(";")[0]||"audio/webm";
        const formato=tipo==="audio/mp4"?"m4a":"webm";
        const blob=new Blob(chunks,{type:tipo});
        if(blob.size>8*1024*1024)setErro("O áudio deve ter no máximo 8 MB. Grave uma mensagem mais curta.");
        else if(blob.size)setAudio(new File([blob],"demanda-"+Date.now()+"."+formato,{type:tipo}));
        setGravacaoAtiva(false);mic.getTracks().forEach(t=>t.stop());
      };
      r.onerror=()=>{setErro("A gravação foi interrompida. Você também pode selecionar um arquivo.");setGravacaoAtiva(false);mic.getTracks().forEach(t=>t.stop());};
      gravador.current=r;r.start();setGravacaoAtiva(true);
    }catch{
      setErro("O navegador não permitiu acessar o microfone. Verifique as permissões do VITRAL ou selecione um áudio existente.");
    }
  };
  const pararAudio=()=>{if(gravador.current?.state==="recording")gravador.current.stop();};
  const analisarIA=async(modo:"audio"|"texto")=>{
    setErro("");setProcessandoIA(true);
    try{
      let res:Response;
      if(modo==="audio"){
        if(!audio)throw new Error("Grave ou selecione um áudio primeiro.");
        const dados=new FormData();dados.set("audio",audio);
        res=await fetch("/api/demandas/interpretar",{method:"POST",body:dados});
      }else{
        if(texto.trim().length<5)throw new Error("Digite ou dite uma solicitação para organizar.");
        res=await fetch("/api/demandas/interpretar",{
          method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({texto}),
        });
      }
      const json=await res.json() as {erro?:string;texto?:string;tarefas?:Array<Proposta & {revisao?:string}>};
      if(!res.ok)throw new Error(json.erro||"Não foi possível interpretar a demanda.");
      if(json.texto)setTexto(json.texto);
      const novas=(json.tarefas??[]).map(t=>({titulo:t.titulo,descricao:t.descricao||"",
        responsavel_id:t.responsavel_id||"",prazo:t.prazo||"",prioridade:t.prioridade||"normal"}));
      if(!novas.length)throw new Error("Nenhuma tarefa foi identificada.");
      setPropostas(novas);setLoteId(crypto.randomUUID());
    }catch(e){setErro(e instanceof Error?e.message:"Não foi possível analisar a solicitação.");}
    finally{setProcessandoIA(false);}
  };

  const preparar=()=>{
    const lista=sugerir(texto,equipe);
    if(!lista.length){setErro("Escreva ou dite ao menos uma solicitação.");return;}
    setPropostas(lista);
    setLoteId(crypto.randomUUID());
    setErro("");
  };
  const ajustar=(i:number,campos:Partial<Proposta>)=>setPropostas(prev=>prev.map((p,j)=>j===i?{...p,...campos}:p));
  const remover=(i:number)=>setPropostas(prev=>prev.filter((_,j)=>i!==j));
  const problemas=validarLote(propostas);
  const podeEnviar=!!loteId && propostas.length>0 && problemas.length===0;
  const problema=(indice:number)=>problemas.find(p=>p.indice===indice)?.campos??[];
  return <section className={`${CARD_CLASS} space-y-4 p-4 sm:p-5`}>
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><Mic size={20}/></span>
      <div>
        <h2 className="font-semibold text-ink">Distribuir demandas por voz</h2>
        <p className="mt-1 text-xs leading-5 text-ink-muted">Dite as atividades, revise cada uma e escolha os responsáveis antes de distribuir.</p>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      {!gravando?<button type="button" onClick={iniciar}
        className={PRIMARY_BUTTON_CLASS}><Mic size={16}/> Iniciar ditado</button>:
        <button type="button" onClick={parar} className={PRIMARY_BUTTON_CLASS}><MicOff size={16}/> Parar ditado</button>}
      <span className="text-xs text-ink-muted" role="status">{gravando?"Ouvindo pelo microfone...":"Se o navegador não permitir o ditado, digite abaixo"}</span>
    </div>
    <p className="text-xs leading-5 text-ink-muted">Este modo experimental usa o reconhecimento de voz do navegador, que pode processar o áudio pelo provedor do navegador. O VITRAL não guarda a gravação nesta etapa. Não dite informações confidenciais. Você também pode digitar.</p>
    <div className="space-y-3 rounded-lg border border-border bg-background/40 p-3">
      <p className="text-sm font-semibold text-ink">Gravação para transcrição por IA</p>
      <p className="text-xs leading-5 text-ink-muted">Alternativa ao ditado do navegador. Ao enviar, o áudio será processado pelo provedor de IA configurado. A transcrição não cria demandas sem sua revisão e confirmação.</p>
      <div className="flex flex-wrap items-center gap-2">
        {!gravacaoAtiva?<button type="button" onClick={iniciarAudio} disabled={processandoIA}
          className={SECONDARY_BUTTON_CLASS}><AudioLines size={16}/> Gravar áudio</button>:
          <button type="button" onClick={pararAudio} className={SECONDARY_BUTTON_CLASS}><MicOff size={16}/> Parar gravação</button>}
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-ink">
          <Upload size={16}/> Escolher arquivo
          <input type="file" className="sr-only" accept="audio/*" onChange={e=>{setAudio(e.target.files?.[0]??null);setErro("");}}/>
        </label>
        {gravacaoAtiva&&<span className="text-xs font-semibold text-rose-700">Gravando...</span>}
      </div>
      {audio&&<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
        <span>Pronto: {audio.name} ({Math.ceil(audio.size/1024)} KB)</span>
        <button type="button" onClick={()=>analisarIA("audio")} disabled={processandoIA||audio.size>8*1024*1024}
          className={PRIMARY_BUTTON_CLASS}>{processandoIA?"Processando...":"Transcrever e organizar com IA"}</button>
      </div>}
    </div>
    <label className="block text-xs font-medium text-ink-muted">Texto do áudio (editável)
      <textarea className={`${INPUT_CLASS} mt-1`} value={texto} onChange={e=>setTexto(e.target.value)}
        rows={4} maxLength={12000} placeholder="Ex.: Amanda, finalizar a avaliação do Guará amanhã; João, conferir documentação do cliente hoje."/>
    </label>
    <p className="text-xs text-ink-muted">Separe atividades por ponto e vírgula ou linha. O sistema apenas sugere nome e prazo quando encontra indicação clara; sempre revise.</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={preparar}><Sparkles size={16}/> Preparar prévia das tarefas</button>
      <button type="button" disabled={processandoIA} className={SECONDARY_BUTTON_CLASS}
        onClick={()=>analisarIA("texto")}><Sparkles size={16}/>{processandoIA?"Analisando...":"Organizar texto com IA"}</button>
    </div>
    {erro&&<p role="alert" className="flex items-center gap-2 text-xs text-rose-700"><AlertTriangle size={15}/>{erro}</p>}
    {!!propostas.length&&<form action={criarDemandasEmLote} className="space-y-3 border-t border-border pt-4">
      <input type="hidden" name="lote_id" value={loteId}/>
      <input type="hidden" name="tarefas_json" value={JSON.stringify(propostas)}/>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{propostas.length} {propostas.length===1?"demanda identificada":"demandas identificadas"}</h3>
        <span className="text-xs text-ink-muted">{problemas.length?"Faltam informações em "+problemas.length+" demanda(s)":"Todas prontas para distribuir"}</span>
      </div>
      {propostas.map((p,i)=><div key={i} className={`space-y-3 rounded-xl border p-3 sm:p-4 ${problema(i).length?"border-amber-400 bg-amber-50/50":"border-border bg-background/60"}`} >
        <div className="flex items-center justify-between">
          <div><h4 className="text-xs font-semibold text-ink">Demanda {i+1}</h4>
          {!!problema(i).length&&<p className="mt-1 text-xs text-amber-800">{problema(i).join(" · ")}</p>}</div>
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
      {!!problemas.length&&<p role="alert" className="text-xs text-amber-800">Antes de distribuir, escolha um responsável e confira o título e a data nas tarefas destacadas acima. As tarefas não serão enviadas enquanto houver pendências.</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={()=>setPropostas(p=>p.length<10?[...p,{titulo:"",descricao:"",responsavel_id:"",prazo:"",prioridade:"normal"}]:p)}
          disabled={propostas.length>=10}><Plus size={15}/> Adicionar tarefa</button>
        <button type="submit" disabled={!podeEnviar}
          className={`${PRIMARY_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-40`}><Send size={15}/> Distribuir {propostas.length} demanda(s)</button>
      </div>
    </form>}
  </section>;
}
