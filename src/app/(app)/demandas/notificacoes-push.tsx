"use client";
import {useState} from "react";
import {BellRing,BellOff,CheckCircle2} from "lucide-react";

function decodificarChave(base64url:string):Uint8Array<ArrayBuffer>{
  const base64=base64url.replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(base64.padEnd(Math.ceil(base64.length/4)*4,"="));
  const bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  return bytes;
}
export function NotificacoesPush(){
  const [carregando,setCarregando]=useState(false);
  const [ativado,setAtivado]=useState(false);
  const [msg,setMsg]=useState("");
  const habilitar=async()=>{
    setMsg("");setCarregando(true);
    try{
      if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)){
        setMsg("Seu navegador não oferece notificações push. Os avisos continuam disponíveis dentro do VITRAL.");return;
      }
      const permission=await Notification.requestPermission();
      if(permission!=="granted"){
        setMsg("Notificações não autorizadas. Abra as permissões do site para permitir, ou continue usando o sino do VITRAL.");return;
      }
      const res=await fetch("/api/demandas/push",{cache:"no-store"});
      const json=await res.json() as {publicKey:string|null};
      if(!json.publicKey)throw new Error("Chaves push não estão configuradas no servidor.");
      const registration=await navigator.serviceWorker.register("/sw-demandas.js",{scope:"/"});
      await navigator.serviceWorker.ready;
      let sub=await registration.pushManager.getSubscription();
      if(!sub)sub=await registration.pushManager.subscribe({
        userVisibleOnly:true,applicationServerKey:decodificarChave(json.publicKey),
      });
      const salvo=await fetch("/api/demandas/push",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(sub.toJSON()),
      });
      if(!salvo.ok){
        const erro=await salvo.json().catch(()=>({})) as {erro?:string};
        throw new Error(erro.erro||"Não foi possível registrar o dispositivo.");
      }
      setAtivado(true);setMsg("Avisos deste dispositivo ativados. Você receberá alertas mesmo com a aba fechada, conforme as permissões do sistema.");
    }catch(e){setMsg(e instanceof Error?e.message:"Não foi possível ativar os avisos.");}
    finally{setCarregando(false);}
  };
  const desativar=async()=>{
    setCarregando(true);
    try{
      const registro=await navigator.serviceWorker.ready;
      const sub=await registro.pushManager.getSubscription();
      if(sub){
        await fetch("/api/demandas/push",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({endpoint:sub.endpoint})});
        await sub.unsubscribe();
      }
      setAtivado(false);setMsg("Alertas deste dispositivo desativados.");
    }catch{setMsg("Não foi possível desativar os alertas.");}
    finally{setCarregando(false);}
  };
  return <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 sm:p-4">
    <div className="min-w-0 flex-1">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><BellRing size={17}/> Avisos de novas demandas</h2>
      <p className="mt-1 text-xs leading-5 text-ink-muted">Receba notificações no celular ou computador quando chegar uma tarefa ou uma atualização. Ative somente se desejar.</p>
      {msg&&<p role="status" className="mt-2 text-xs leading-5 text-ink-muted">{ativado&&<CheckCircle2 size={14} className="mr-1 inline text-emerald-700"/>}{msg}</p>}
    </div>
    {ativado?<button type="button" onClick={desativar} disabled={carregando}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold text-ink disabled:opacity-50"><BellOff size={15}/> Desativar neste dispositivo</button>
      :<button type="button" onClick={habilitar} disabled={carregando}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-3 text-sm font-semibold text-white disabled:opacity-50"><BellRing size={15}/> {carregando?"Aguarde...":"Ativar notificações"}</button>}
  </section>;
}
