"use client";

import { useMemo, useState } from "react";
import { salvarDocumentoPDF } from "./actions";
import { extrairLinhasPDF, interpretarExtratoInter, interpretarFaturaInter } from "@/lib/financeiro/pdf-inter";
import type { ExtratoInter, FaturaInter } from "@/lib/financeiro/pdf-inter";

type Opcao={id:string;nome:string};
type Tipo="extrato"|"fatura";
type Resultado=ExtratoInter|FaturaInter;
const dinheiro=(n:number)=>(n/100).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const formatar=(n:number)=>(n/100).toFixed(2).replace(".",",");
const linhaCSV=(p:string[])=>p.map(x=>x.replace(/[;\r\n]+/g," ")).join(";");
const numero=(t:string)=>{
  const s=t.trim().replace(/^R\$\s*/,"").replace(/\s/g,"");
  if(!/^-?[\d.]+,\d{2}$/.test(s)&&!/^-?\d+\.\d{2}$/.test(s))return NaN;
  return Math.round(Number(s.includes(",")?s.replace(/\./g,"").replace(",","."):s)*100);
};
function interpretarEdicao(texto:string,tipo:Tipo) {
  const linhas=texto.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const erros:string[]=[];
  const resultados:Record<string,unknown>[]=[];
  linhas.forEach((t,i)=>{
    const partes=t.split(";").map(x=>x.trim());
    if(partes.length!==(tipo==="extrato"?3:4)){erros.push("Linha "+(i+1)+": use os campos separados por ponto e vírgula.");return;}
    const [data,descricao,quantia,parcela]=partes;
    const valorCentavos=numero(quantia);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(data)||!descricao||!Number.isSafeInteger(valorCentavos)||!valorCentavos){
      erros.push("Linha "+(i+1)+": confira data, descrição e valor.");return;
    }
    if(tipo==="fatura"){
      if(valorCentavos<0){erros.push("Linha "+(i+1)+": compra negativa.");return;}
      const p=/^(\d+)\/(\d+)$/.exec(parcela||"1/1");
      if(!p||Number(p[1])<1||Number(p[1])>Number(p[2])||Number(p[2])>60){
        erros.push("Linha "+(i+1)+": parcela inválida.");return;
      }
      resultados.push({data,estabelecimento:descricao,valorCentavos,
        parcelaAtual:Number(p[1]),parcelaTotal:Number(p[2])});
    }else{
      resultados.push({data,descricao,valorCentavos});
    }
  });
  return {linhas:resultados,erros};
}
export function EntradaPDF({contas,cartoes}:{contas:Opcao[];cartoes:Opcao[]}) {
  const [tipo,setTipo]=useState<Tipo>("extrato");
  const [resultado,setResultado]=useState<Resultado|null>(null);
  const [editor,setEditor]=useState("");
  const [lendo,setLendo]=useState(false);
  const [erro,setErro]=useState("");
  const [conferido,setConferido]=useState(false);
  const lista=tipo==="extrato"?contas:cartoes;
  const revisao=useMemo(()=>interpretarEdicao(editor,tipo),[editor,tipo]);
  const soma=revisao.linhas.reduce((n,x)=>n+Number(x.valorCentavos),0);
  const totalOriginal=resultado ? (resultado.tipo==="fatura"?resultado.totalCentavos:resultado.movimentos.reduce((n,x)=>n+x.valorCentavos,0)):0;
  const quantidadeOriginal=resultado ? (resultado.tipo==="fatura"?resultado.compras.length:resultado.movimentos.length):0;
  const inconsistencias=[
    ...revisao.erros,
    ...(resultado&&revisao.linhas.length!==quantidadeOriginal?["A quantidade de linhas foi alterada. Revise os registros."]:[]),
    ...(resultado&&soma!==totalOriginal?["A soma das movimentações não corresponde ao PDF original."]:[]),
    ...(resultado?.tipo==="extrato"&&resultado.divergencias>0?["O extrato contém divergências entre saldos consecutivos."]:[]),
    ...(resultado?.tipo==="fatura"&&!resultado.confere?["A fatura original tem diferença entre compras e total cobrado."]:[])
  ];
  const valido=!!resultado&&inconsistencias.length===0&&conferido&&!lendo&&lista.length>0;
  const dados=resultado?JSON.stringify({
    tipo,
    linhas:revisao.linhas,
    totalCentavos:tipo==="fatura"?totalOriginal:soma,
    vencimento:resultado.tipo==="fatura"?resultado.vencimento:null,
    divergencias:resultado.tipo==="extrato"?resultado.divergencias:null
  }):"";
  async function aoArquivo(f:File|null){
    setResultado(null);setEditor("");setErro("");setConferido(false);
    if(!f)return;
    setLendo(true);
    try{
      const linhas=await extrairLinhasPDF(f);
      const r=tipo==="extrato"?interpretarExtratoInter(linhas):interpretarFaturaInter(linhas);
      setResultado(r);
      const registros=r.tipo==="extrato"?r.movimentos.map(x=>linhaCSV([x.data,x.descricao,formatar(x.valorCentavos)])):
        r.compras.map(x=>linhaCSV([x.data,x.estabelecimento+" (final "+x.finalCartao+")",formatar(x.valorCentavos),x.parcelaAtual+"/"+x.parcelaTotal]));
      setEditor(registros.join("\n"));
    }catch(e){setErro(e instanceof Error?e.message:"Falha ao ler o documento.");}
    finally{setLendo(false);}
  }
  return <form action={salvarDocumentoPDF} className="space-y-5 rounded-xl border border-border bg-surface p-4 sm:p-6">
    <div><h2 className="text-lg font-semibold">Novo PDF para conferência</h2>
      <p className="mt-1 text-sm text-ink-muted">Extraia, corrija e anexe o documento original. Nenhuma baixa ou lançamento é criado nesta etapa.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Documento
        <select name="tipo" value={tipo} onChange={e=>{setTipo(e.target.value as Tipo);setResultado(null);setEditor("");setErro("");setConferido(false);const a=document.getElementById("arquivo-financeiro") as HTMLInputElement|null;if(a)a.value="";}} className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-background px-3">
          <option value="extrato">Extrato bancário</option><option value="fatura">Fatura de cartão</option>
        </select>
      </label>
      <label className="text-sm font-medium">{tipo==="extrato"?"Conta bancária":"Cartão"}
        <select name="referencia" required className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-background px-3">
          <option value="">Selecione</option>
          {lista.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium sm:col-span-2">Arquivo original (PDF de até 3 MB)
        <input id="arquivo-financeiro" type="file" name="arquivo" required accept="application/pdf,.pdf"
          onChange={e=>aoArquivo(e.target.files?.[0]||null)}
          className="mt-1.5 block w-full rounded-lg border border-border bg-background p-3 text-sm"/>
      </label>
    </div>
    {lendo&&<p className="text-sm text-ink-muted" role="status">Lendo o PDF e identificando os lançamentos…</p>}
    {erro&&<p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">{erro}</p>}
    {resultado&&<div className="space-y-4">
      <div className="grid gap-3 rounded-lg bg-background p-4 sm:grid-cols-3">
        <div><span className="text-xs text-ink-muted">Linhas identificadas</span><p className="text-xl font-semibold">{quantidadeOriginal}</p></div>
        <div><span className="text-xs text-ink-muted">{tipo==="fatura"?"Total da fatura":"Valor líquido do extrato"}</span><p className="text-xl font-semibold">{dinheiro(totalOriginal)}</p></div>
        <div><span className="text-xs text-ink-muted">Soma revisada</span><p className="text-xl font-semibold">{dinheiro(soma)}</p></div>
      </div>
      {resultado.tipo==="extrato"&&resultado.movimentos.some(x=>x.pagamentoFatura)&&<p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Identificado pagamento de fatura de cartão. Ele deverá ser conciliado com o cartão existente, sem gerar uma segunda despesa.</p>}
      <label className="block text-sm font-medium">Revisão dos lançamentos (editável)
        <span className="mt-1 block text-xs font-normal text-ink-muted">
          {tipo==="fatura"?"Data; estabelecimento; valor; parcela":"Data; descrição; valor negativo para saída"} — uma linha por movimentação.
        </span>
        <textarea value={editor} onChange={e=>{setEditor(e.target.value);setConferido(false);}}
          rows={12} spellCheck={false} className="mt-2 w-full rounded-lg border border-border bg-background p-3 font-mono text-xs leading-relaxed"/>
      </label>
      {inconsistencias.length>0?<div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
        {inconsistencias.slice(0,5).map((x,i)=><p key={i}>{x}</p>)}
      </div>:<p className="text-sm text-emerald-700">Prévia consistente: quantidade e valores conferem com o PDF.</p>}
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={conferido} onChange={e=>setConferido(e.target.checked)} className="mt-1"/>
        Conferi a conta ou cartão, datas, valores, parcelas e possíveis duplicidades. Quero salvar como documento pendente de conferência.
      </label>
      <input type="hidden" name="dados" value={dados}/>
    </div>}
    <button type="submit" disabled={!valido} className="min-h-11 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Salvar PDF e prévia para conferência</button>
  </form>;
}
