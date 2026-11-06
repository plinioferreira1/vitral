"use client";
import { useState } from "react";
import { iniciarFichaPublica } from "./actions";

export function InicioFicha() {
 const [papel,setPapel]=useState("titular");
 const precisaNome = papel !== "titular";
 return <form action={iniciarFichaPublica} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
   <label className="block text-sm font-semibold text-stone-800">Quem vai preencher esta ficha?
     <select name="papel" value={papel} onChange={e=>setPapel(e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-base">
       <option value="titular">Locatário(a) / titular</option>
       <option value="corresponsavel">Corresponsável pela locação</option>
       <option value="fiador_1">Fiador(a) 1</option>
       <option value="fiador_2">Fiador(a) 2</option>
     </select>
   </label>
   <p role="note" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium leading-6 text-amber-900">Se você estiver preenchendo como fiador, marque a opção <strong>Fiador(a) 1</strong> ou <strong>Fiador(a) 2</strong>.</p>
   {precisaNome && <label className="block text-sm font-semibold text-stone-800">Nome completo do locatário titular
      <input name="nome_titular" required maxLength={200} minLength={5} autoComplete="off" placeholder="Nome e sobrenome do locatário" className="mt-2 min-h-12 w-full rounded-lg border border-stone-300 px-3 text-base" />
      <span className="mt-2 block text-xs font-normal leading-5 text-stone-600">Informe o nome completo de quem está solicitando a locação. Se houver pessoas com o mesmo nome, a Sacra confirmará o vínculo internamente.</span>
   </label>}
   <p className="text-sm leading-6 text-stone-600">{papel==="titular"?"Você preencherá sua ficha e poderá informar seu nome completo ao fiador 1, ao fiador 2 e ao corresponsável, para que cada pessoa preencha sua ficha neste mesmo endereço.": "Seus dados, anexos e assinatura ficarão na sua ficha individual, associada à proposta após a conferência do nome do titular."}</p>
   <button type="submit" className="min-h-12 w-full rounded-lg bg-[#731515] px-5 py-3 text-sm font-semibold text-white">Começar minha ficha</button>
 </form>;
}
