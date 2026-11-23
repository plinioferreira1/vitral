"use client";

import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {Mic,Square,Upload,AlertCircle,FileAudio,Trash2,PlayCircle} from "lucide-react";

const MAX=4*1024*1024;
const formatar=(v:number)=>v>=1024*1024?`${(v/1024/1024).toFixed(1)} MB`:`${Math.round(v/1024)} KB`;
const tempo=(s:number)=>`${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;
const tiposOuPadrao=(mime:string|undefined):MediaRecorderOptions=>mime?{mimeType:mime,audioBitsPerSecond:48000}:{audioBitsPerSecond:48000};

export function AudioDemanda({demandaId}:{demandaId:string}){
  const router=useRouter();
  const gravador=useRef<MediaRecorder|null>(null);
  const fluxo=useRef<MediaStream|null>(null);
  const iniciou=useRef<number>(0);
  const [gravando,setGravando]=useState(false);
  const [segundos,setSegundos]=useState(0);
  const [arquivo,setArquivo]=useState<File|null>(null);
  const [previa,setPrevia]=useState("");
  const [enviando,setEnviando]=useState(false);
  const [erro,setErro]=useState("");
  const [sucesso,setSucesso]=useState(false);

  useEffect(()=>{
    if(!gravando)return;
    const timer=window.setInterval(()=>setSegundos(Math.floor((Date.now()-iniciou.current)/1000)),500);
    return ()=>window.clearInterval(timer);
  },[gravando]);

  useEffect(()=>{
    const url=arquivo ? URL.createObjectURL(arquivo) : "";
    let ativo=true;
    // Atualiza após o efeito para evitar uma atualização síncrona em cascata.
    queueMicrotask(()=>{if(ativo)setPrevia(url);});
    return ()=>{ativo=false;if(url)URL.revokeObjectURL(url);};
  },[arquivo]);

  useEffect(()=>()=>{if(gravador.current?.state==="recording")gravador.current.stop();fluxo.current?.getTracks().forEach(t=>t.stop());},[]);

  const iniciar=async()=>{
    setErro("");setSucesso(false);setArquivo(null);setSegundos(0);
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){
      setErro("Seu navegador não permite gravação. Selecione um áudio gravado no aparelho.");return;
    }
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      fluxo.current=stream;
      const tipo=["audio/webm;codecs=opus","audio/mp4","audio/webm","audio/ogg"].find(t=>MediaRecorder.isTypeSupported(t));
      const gravacao=new MediaRecorder(stream,tiposOuPadrao(tipo));
      const blocos:Blob[]=[];
      gravador.current=gravacao;
      gravacao.ondataavailable=e=>{if(e.data.size)blocos.push(e.data);};
      gravacao.onerror=()=>{
        setErro("Falha na gravação. Você pode tentar novamente ou anexar um arquivo.");
        setGravando(false);stream.getTracks().forEach(t=>t.stop());
      };
      gravacao.onstop=()=>{
        const mime=gravacao.mimeType.split(";")[0]||"audio/webm";
        const ext=mime.includes("mp4")?"m4a":mime.includes("ogg")?"ogg":"webm";
        const blob=new Blob(blocos,{type:mime});
        if(blob.size>MAX)setErro("Áudio maior que 4 MB. Grave uma mensagem mais curta ou compacte o arquivo.");
        else if(blob.size>0)setArquivo(new File([blob],`resposta-${Date.now()}.${ext}`,{type:mime}));
        else setErro("O microfone não capturou áudio. Tente novamente.");
        setGravando(false);stream.getTracks().forEach(t=>t.stop());
      };
      iniciou.current=Date.now();
      gravacao.start(1000);
      setGravando(true);
    }catch(e){
      const nome=e instanceof DOMException?e.name:"";
      setErro(nome==="NotAllowedError"||nome==="PermissionDeniedError"
        ?"Autorize o microfone nas permissões do navegador ou anexe um áudio já gravado."
        :nome==="NotFoundError"?"Nenhum microfone encontrado. Você pode anexar um áudio."
        :"Não foi possível acessar o microfone. Tente novamente ou selecione um arquivo.");
    }
  };

  const parar=()=>{if(gravador.current?.state==="recording")gravador.current.stop();};
  const descartar=()=>{setArquivo(null);setErro("");setSucesso(false);setSegundos(0);};
  const enviar=async()=>{
    if(!arquivo||arquivo.size>MAX)return;
    setErro("");setEnviando(true);setSucesso(false);
    try{
      const dados=new FormData();dados.set("audio",arquivo);
      const resposta=await fetch(`/demandas/${demandaId}/audios`,{method:"POST",body:dados});
      const json=await resposta.json() as {ok?:boolean;erro?:string};
      if(!resposta.ok||!json.ok){setErro(json.erro||"Falha ao enviar o áudio.");return;}
      setArquivo(null);setSegundos(0);setSucesso(true);
      router.refresh();
    }catch{setErro("Conexão interrompida. O áudio continua disponível para tentar novamente.");}
    finally{setEnviando(false);}
  };

  return <div className="space-y-3 rounded-xl border border-border bg-background/40 p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-ink">Responder por áudio</h3>
        <p className="mt-1 text-xs leading-5 text-ink-muted">Grave, ouça antes de enviar e salve no histórico privado da demanda.</p>
      </div>
      {gravando?
        <button type="button" onClick={parar} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white">
          <Square size={15}/> Parar · {tempo(segundos)}
        </button>:
        <button type="button" onClick={iniciar} disabled={enviando} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">
          <Mic size={16}/> Gravar mensagem
        </button>}
    </div>
    {gravando&&<p role="status" className="flex items-center gap-2 text-xs font-medium text-rose-700"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-600"/> Gravando · {tempo(segundos)} · toque em Parar para revisar</p>}
    <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-sm font-medium text-ink">
      <Upload size={17}/> Ou escolher áudio do dispositivo
      <input type="file" accept="audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav,audio/x-wav,audio/x-m4a,audio/aac"
        className="sr-only" disabled={gravando||enviando} onChange={e=>{const f=e.target.files?.[0]??null;setArquivo(f);setErro("");setSucesso(false);e.target.value="";}}/>
    </label>
    {arquivo&&<div className="space-y-3 rounded-xl border border-border bg-surface p-3">
      <p className="flex min-w-0 items-center gap-2 break-all text-xs font-medium text-ink"><FileAudio size={16} className="shrink-0"/>{arquivo.name} · {formatar(arquivo.size)}</p>
      {previa&&<div><p className="mb-1 flex items-center gap-1 text-xs text-ink-muted"><PlayCircle size={14}/> Ouça antes de enviar</p>
        <audio className="w-full" controls preload="metadata" src={previa}/></div>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={enviar} disabled={enviando||arquivo.size>MAX}
          className="min-h-11 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-50">{enviando?"Enviando...":"Enviar áudio"}</button>
        <button type="button" onClick={descartar} disabled={enviando}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm text-ink-muted disabled:opacity-50"><Trash2 size={15}/> Descartar</button>
      </div>
    </div>}
    {arquivo&&arquivo.size>MAX&&<p className="text-xs text-rose-700">Limite de 4 MB por mensagem. Selecione um áudio menor.</p>}
    {sucesso&&<p role="status" className="text-xs text-emerald-700">Áudio enviado e registrado no histórico.</p>}
    {erro&&<p role="alert" className="flex items-start gap-2 text-xs leading-5 text-rose-700"><AlertCircle className="mt-0.5 shrink-0" size={15}/>{erro}</p>}
    <p className="text-xs leading-5 text-ink-muted">Áudio privado: disponível apenas para o responsável e os gestores. Se precisar de algo pesquisável, registre também uma atualização por texto.</p>
  </div>;
}
