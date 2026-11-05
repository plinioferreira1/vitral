"use client";
import { FileUp } from "lucide-react";
import { LIMITE_ARQUIVOS } from "@/lib/ficha-locacao/campos";
import type { DocumentoFicha, ItemChecklist } from "@/lib/ficha-locacao/documentos";

export function DocumentosFicha({checklist,documentos,ocupado,enviar,abrir,retirar}:{
 checklist:ItemChecklist[]; documentos:DocumentoFicha[]; ocupado:boolean;
 enviar:(files:FileList|null,tipo:string)=>void;
 abrir:(id:string)=>void; retirar:(id:string)=>void;
}) {
 return <div className="space-y-5">
  <div><h2 className="text-xl font-bold">Envio de documentos</h2>
   <p className="mt-2 text-sm leading-6 text-stone-600">Selecione todos os arquivos de uma só vez. Pode misturar RG, CPF, comprovantes de renda e outros documentos. Não precisa separar por categoria.</p>
  </div>
  <label className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-7 text-center hover:border-[#731515] ${ocupado?"opacity-50":""}`}>
   <FileUp className="h-9 w-9 text-[#731515]"/>
   <span className="font-semibold text-stone-800">Selecionar vários documentos</span>
   <span className="text-xs text-stone-500">PDF, JPG, PNG ou WebP · até 10 MB cada · máximo de {LIMITE_ARQUIVOS} arquivos</span>
   <input type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" aria-label="Selecionar documentos" disabled={ocupado||documentos.length>=LIMITE_ARQUIVOS} onChange={e=>{enviar(e.target.files,"Documentos enviados");e.target.value="";}} />
  </label>
  <p className="text-xs text-stone-600">{documentos.length} de {LIMITE_ARQUIVOS} anexos enviados. A equipe da SACRA fará a conferência de cada arquivo.</p>
  <details className="rounded-lg border border-stone-200 p-4 text-sm"><summary className="cursor-pointer font-semibold">Ver documentos recomendados</summary><ul className="mt-3 list-disc space-y-1 pl-5 text-stone-600">{checklist.filter(i=>i.tipo!=="Outros documentos").map(i=><li key={i.tipo}>{i.tipo}</li>)}</ul></details>
  {!!documentos.length && <div className="rounded-xl bg-stone-50 p-4"><h3 className="font-semibold">Arquivos enviados</h3><ul className="mt-3 divide-y divide-stone-200">{documentos.map(d=><li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span className="min-w-0 flex-1 break-words text-sm">{d.nome_arquivo}</span><div className="flex gap-3 text-xs font-semibold"><button type="button" disabled={ocupado} onClick={()=>abrir(d.id)} className="text-[#731515]">Ver</button><button type="button" disabled={ocupado} onClick={()=>retirar(d.id)} className="text-red-700">Retirar</button></div></li>)}</ul></div>}
 </div>;
}
