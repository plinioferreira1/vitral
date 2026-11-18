"use client";

import {useEffect,useState} from "react";

/** O subtotal acompanha apenas os checkboxes atualmente marcados na página. */
export function ResumoSelecionadosLancamentos({formId="form-acoes-lote"}:{formId?:string}){
  const [resumo,setResumo]=useState({quantidade:0,centavos:0});
  useEffect(()=>{
    const seletor=`input[type="checkbox"][name="ids"][form="${formId}"]`;
    const atualizar=()=>{
      const itens=document.querySelectorAll<HTMLInputElement>(seletor);
      let quantidade=0;
      let centavos=0;
      itens.forEach(input=>{
        if(!input.checked)return;
        quantidade++;
        centavos+=Number(input.dataset.valorCentavos??0);
      });
      setResumo({quantidade,centavos});
    };
    const aoAlterar=(event:Event)=>{
      if(event.target instanceof HTMLInputElement && event.target.matches(seletor)){
        atualizar();
      }
    };
    document.addEventListener("change",aoAlterar);
    atualizar();
    return ()=>document.removeEventListener("change",aoAlterar);
  },[formId]);
  return <div aria-live="polite" aria-atomic="true" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-brand/20 bg-brand/5 px-3 py-2">
    <span className="text-xs font-semibold text-ink">{resumo.quantidade} {resumo.quantidade===1?"selecionado":"selecionados"}</span>
    <span className="text-base font-bold tabular-nums text-brand">{(resumo.centavos/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</span>
    <span className="text-xs text-ink-muted">Total dos marcados nesta página</span>
  </div>;
}
