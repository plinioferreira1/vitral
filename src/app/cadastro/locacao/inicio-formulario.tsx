"use client";
import { useState } from "react";
import { iniciarFichaPublica } from "./actions";

export function InicioFicha() {
 const [papel,setPapel]=useState("titular");
 const precisaCodigo = papel !== "titular";
 return <form action={iniciarFichaPublica} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
   <label className="block text-sm font-semibold text-stone-800">Quem vai preencher esta ficha?
     <select name="papel" value={papel} onChange={e=>setPapel(e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-base">
       <option value="titular">Locatário(a) / titular</option>
       <option value="corresponsavel">Corresponsável pela locação</option>
       <option value="fiador_1">Fiador(a) 1</option>
       <option value="fiador_2">Fiador(a) 2</option>
     </select>
   </label>
   {precisaCodigo && <label className="block text-sm font-semibold text-stone-800">Código da proposta fornecido pelo locatário
      <input name="codigo_proposta" required maxLength={12} minLength={12} autoComplete="off" placeholder="Ex.: A12B34C56D78" className="mt-2 min-h-12 w-full rounded-lg border border-stone-300 px-3 text-base uppercase" />
      <span className="mt-2 block text-xs font-normal leading-5 text-stone-600">Para reunir as fichas da mesma locação com segurança, peça ao titular o código de 12 caracteres exibido na ficha dele. Não precisa receber um link individual.</span>
   </label>}
   <p className="text-sm leading-6 text-stone-600">{papel==="titular"?"Você preencherá sua ficha e poderá compartilhar o código da proposta para que o fiador 1, o fiador 2 e o corresponsável preencham suas próprias fichas neste mesmo endereço.": "Seus dados, anexos e assinatura ficarão na sua ficha individual, vinculada à proposta do titular."}</p>
   <button type="submit" className="min-h-12 w-full rounded-lg bg-[#731515] px-5 py-3 text-sm font-semibold text-white">Começar minha ficha</button>
 </form>;
}
