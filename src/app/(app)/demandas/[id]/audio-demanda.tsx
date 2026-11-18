"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Upload, AlertCircle, FileAudio } from "lucide-react";

const MAX=4*1024*1024;
const formatar=(v:number)=>`${Math.round(v/1024)} KB`;
type Gravador={stop():void;state:string;ondataavailable:((e:BlobEvent)=>void)|null;onstop:(()=>void)|null;onerror:((e:Event)=>void)|null;start():void;};

export function AudioDemanda({demandaId}:{demandaId:string}){
  const recorder=useRef<MediaRecorder|null>(null);
  const stream=useRef<MediaStream|null>(null);
  const [gravando,setGravando]=useState(false);
  const [arquivo,setArquivo]=useState<File|null>(null);
  const [salvando,setSalvando]=useState(false);
  const [erro,setErro]=useState("");
  const [concluido,setConcluido]=useState(false);
  useEffect(()=>()=>{if(recorder.current?.state==="recording")recorder.current.stop();stream.current?.getTracks().forEach(t=>t.stop());},[]);
  const iniciar=async()=>{
    setErro("");setConcluido(false);
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){
      setErro("Este navegador não permite gravação direta. Use o botão para selecionar um arquivo de áudio.");
      return;
    }
    try{
      const mic=await navigator.mediaDevices.getUserMedia({audio:true});
      stream.current=mic;
      const preferred=["audio/webm;codecs=opus","audio/mp4","audio/webm","audio/ogg"];
      const tipo=preferred.find(t=>MediaRecorder.isTypeSupported(t));
      const chunks:Blob[]=[];
      const r=new MediaRecorder(mic,tiposOuPadrao(tipo));
      recorder.current=r;
      r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      r.onerror=()=>{setErro("Não foi possível concluir a gravação.");setGravando(false);mic.getTracks().forEach(t=>t.stop());};
      r.onstop=()=>{
        const mime=r.mimeType.split(";")[0];
        const formato=mime.includes("mp4")?"m4a":mime.includes("ogg")?"ogg":"webm";
        const blob=new Blob(chunks,{type:mime});
        if(blob.size>MAX)setErro("Gravação grande demais. Grave um áudio menor que 4 MB.");
        else if(blob.size)setArquivo(new File([blob],`demanda-${Date.now()}.${formato}`,{type:mime}));
        setGravando(false);
        mic.getTracks().forEach(t=>t.stop());
      };
      r.start();
      setGravando(true);
      setArquivo(null);
    }catch(e){
      const nome=e instanceof DOMException?e.name:"";
      setErro(nome==="NotAllowedError"||nome==="PermissionDeniedError"
        ?"O microfone foi bloqueado. Clique no cadeado ao lado do endereço do VITRAL, permita o microfone e recarregue. Se preferir, anexe um áudio gravado no celular."
        :nome==="NotFoundError"?"Nenhum microfone disponível neste dispositivo. Anexe um arquivo de áudio."
        :"Não foi possível iniciar a gravação. Você pode anexar um arquivo de áudio.");
    }
  };
  const parar=()=>{if(recorder.current?.state==="recording")recorder.current.stop();};
  const enviar=async()=>{
    if(!arquivo)return;
    setErro("");setSalvando(true);setConcluido(false);
    try{
      const dados=new FormData();dados.set("audio",arquivo);
      const res=await fetch(`/demandas/${demandaId}/audios`,{method:"POST",body:dados});
      const retorno=await res.json() as {ok?:boolean;erro?:string};
      if(!res.ok||!retorno.ok){setErro(retorno.erro||"Não foi possível salvar o áudio.");return;}
      setArquivo(null);setConcluido(true);
      window.location.reload();
    }catch{setErro("Erro de conexão ao enviar o áudio. Tente novamente.");}
    finally{setSalvando(false);}
  };
  return <div className="space-y-3 rounded-xl border border-border bg-background/40 p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 className="text-sm font-semibold text-ink">Responder por áudio</h3>
        <p className="mt-1 text-xs text-ink-muted">O áudio fica privado nesta demanda. Só o responsável e gestores podem ouvi-lo.</p>
      </div>
      {gravando?
        <button type="button" onClick={parar} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white"><Square size={15}/> Parar gravação</button>
        :<button type="button" onClick={iniciar} disabled={salvando} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white"><Mic size={16}/> Gravar áudio</button>}
    </div>
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-sm font-medium text-ink">
      <Upload size={17}/> Ou selecionar áudio do dispositivo
      <input type="file" accept="audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav,audio/x-wav,audio/x-m4a,audio/aac"
        className="sr-only" onChange={e=>{const f=e.target.files?.[0]??null;setArquivo(f);setErro("");setConcluido(false);}}/>
    </label>
    {arquivo&&<div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface p-3">
      <span className="flex min-w-0 items-center gap-2 text-xs text-ink"><FileAudio size={16}/>{arquivo.name} · {formatar(arquivo.size)}</span>
      <button type="button" disabled={salvando||arquivo.size>MAX} onClick={enviar}
        className="min-h-10 rounded-lg border border-brand px-3 text-xs font-semibold text-brand disabled:opacity-40">
        {salvando?"Enviando...":"Salvar áudio"}
      </button>
    </div>}
    {arquivo&&arquivo.size>MAX&&<p className="text-xs text-rose-700">O arquivo ultrapassa o limite de 4 MB.</p>}
    {concluido&&<p role="status" className="text-xs text-emerald-700">Áudio salvo com segurança.</p>}
    {erro&&<p role="alert" className="flex items-start gap-2 text-xs leading-5 text-rose-700"><AlertCircle className="mt-0.5 shrink-0" size={15}/>{erro}</p>}
    <p className="text-xs text-ink-muted">A gravação é opcional. Para que a equipe localize as informações rapidamente, registre também um comentário com o andamento.</p>
  </div>;
}
function tiposOuPadrao(tipo:string|undefined):MediaRecorderOptions{return tipo?{mimeType:tipo}:{audioBitsPerSecond:64000};}
