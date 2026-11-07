"use client";
import { useState } from "react";
import { documentosParaSeparar, GARANTIAS_INICIO } from "@/lib/ficha-locacao/campos";
import { iniciarFichaPublica } from "./actions";

export function InicioFicha() {
 const [papel,setPapel]=useState("titular");
 const [garantia,setGarantia]=useState<string>("Seguro Fiança");
 const precisaNome = papel !== "titular";
 const fiador = papel.startsWith("fiador");
 const docs = documentosParaSeparar(fiador ? "fiador" : papel === "corresponsavel" ? "corresponsavel" : "titular", garantia);
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
   {!fiador && <label className="block text-sm font-semibold text-stone-800">Garantia da locação
     <select value={garantia} onChange={e=>setGarantia(e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-stone-300 bg-white px-3 text-base">
       {GARANTIAS_INICIO.map(g=><option key={g} value={g}>{g}</option>)}
     </select>
     <span className="mt-2 block text-xs font-normal leading-5 text-stone-600">Só para mostrar os documentos. A garantia é confirmada dentro da ficha.</span>
   </label>}
   <section aria-labelledby="docs-titulo" className="rounded-xl border border-stone-200 bg-[#f7f5f2] p-4 sm:p-5">
     <h2 id="docs-titulo" className="text-sm font-bold text-[#731515]">Separe estes documentos antes de começar</h2>
     <p className="mt-1 text-xs text-stone-600">{fiador ? "Documentos do fiador." : garantia === "A definir" ? "Documentos básicos. Os demais dependem da garantia escolhida." : `Para ${papel === "corresponsavel" ? "corresponsável" : "titular"} com garantia ${garantia}.`}</p>
     <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-800">
       {docs.lista.map(d=><li key={d} className="flex gap-2"><span aria-hidden className="mt-[0.55rem] size-1.5 shrink-0 rounded-full bg-[#731515]"/>{d}</li>)}
     </ul>
     <p className="mt-4 text-xs font-semibold text-stone-700">Conforme a sua renda, inclua também:</p>
     <ul className="mt-1 space-y-1 text-xs leading-5 text-stone-600">
       {docs.conformeRenda.map(([quem,o_que])=><li key={quem}><strong className="font-semibold text-stone-700">{quem}:</strong> {o_que}</li>)}
     </ul>
     <p className="mt-3 text-xs text-stone-500">Arquivos em PDF ou foto legível. Você poderá anexar durante o preenchimento.</p>
   </section>
   {precisaNome && <label className="block text-sm font-semibold text-stone-800">Nome completo do locatário titular
      <input name="nome_titular" required maxLength={200} minLength={5} autoComplete="off" placeholder="Nome e sobrenome do locatário" className="mt-2 min-h-12 w-full rounded-lg border border-stone-300 px-3 text-base" />
      <span className="mt-2 block text-xs font-normal leading-5 text-stone-600">Informe o nome completo de quem está solicitando a locação. Se houver pessoas com o mesmo nome, a Sacra confirmará o vínculo internamente.</span>
   </label>}
   <p className="text-sm leading-6 text-stone-600">{papel==="titular"?"Você preencherá sua ficha e poderá informar seu nome completo ao fiador 1, ao fiador 2 e ao corresponsável, para que cada pessoa preencha sua ficha neste mesmo endereço.": "Seus dados, anexos e assinatura ficarão na sua ficha individual, associada à proposta após a conferência do nome do titular."}</p>
   <button type="submit" className="min-h-12 w-full rounded-lg bg-[#731515] px-5 py-3 text-sm font-semibold text-white">Começar minha ficha</button>
 </form>;
}
