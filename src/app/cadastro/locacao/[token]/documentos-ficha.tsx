"use client";

import { FileUp } from "lucide-react";
import { LIMITE_ARQUIVOS } from "@/lib/ficha-locacao/campos";
import type { DocumentoFicha, ItemChecklist } from "@/lib/ficha-locacao/documentos";

const ROTULOS = { anexado: "Anexado — sujeito à conferência", pendente: "Pendente", nao_aplicavel: "Não aplicável — motivo informado", opcional: "Opcional" };

export function DocumentosFicha({ checklist, documentos, ocupado, enviar, abrir, retirar }: {
  checklist: ItemChecklist[]; documentos: DocumentoFicha[]; ocupado: boolean;
  enviar: (files: FileList | null, tipo: string) => void;
  abrir: (id: string) => void; retirar: (id: string) => void;
}) {
  const necessarios = checklist.filter((item) => item.situacao !== "opcional");
  const atendidos = necessarios.filter((item) => item.situacao !== "pendente").length;
  return <div className="space-y-5">
    <div><h2 className="text-xl font-bold">Documentos</h2>
      <p className="mt-1 text-sm text-stone-500">Anexe cada documento na categoria correspondente. A equipe conferirá o conteúdo após o envio.</p>
      <div role="progressbar" aria-label="Categorias de documentos atendidas" aria-valuemin={0} aria-valuemax={necessarios.length} aria-valuenow={atendidos} className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full bg-[#731515]" style={{ width: `${necessarios.length ? atendidos / necessarios.length * 100 : 0}%` }} /></div>
      <p className="mt-2 text-xs text-stone-600">{atendidos} de {necessarios.length} categorias atendidas · {documentos.length} de {LIMITE_ARQUIVOS} arquivos. PDF ou imagem, até 10 MB por arquivo.</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">{checklist.map((item) => <div key={item.tipo} className={`rounded-xl border p-4 ${item.situacao === "pendente" ? "border-amber-200 bg-amber-50/30" : "border-stone-200"}`}>
      <p className="text-sm font-semibold">{item.tipo}</p><p className="mt-1 text-xs text-stone-600">{ROTULOS[item.situacao]}</p>
      {item.justificativa && <p className="mt-2 break-words text-xs text-stone-600">{item.justificativa}</p>}
      <label className={`mt-3 inline-flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold ${ocupado || documentos.length >= LIMITE_ARQUIVOS ? "opacity-50" : "cursor-pointer hover:border-[#731515]"}`}>
        <FileUp className="h-4 w-4" /> Adicionar arquivo
        <input type="file" multiple aria-label={`Adicionar ${item.tipo}`} className="sr-only" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={ocupado || documentos.length >= LIMITE_ARQUIVOS} onChange={(e) => { enviar(e.target.files, item.tipo); e.target.value = ""; }} />
      </label>
    </div>)}</div>
    {documentos.length > 0 && <div className="rounded-xl bg-stone-50 p-4"><h3 className="text-sm font-semibold">Arquivos enviados</h3><ul className="mt-3 divide-y divide-stone-200">{documentos.map((doc) => <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1"><p className="break-words text-sm">{doc.nome_arquivo}</p><p className="text-xs text-stone-500">{doc.tipo}</p></div>
      <div className="flex gap-3 text-xs font-semibold"><button type="button" disabled={ocupado} onClick={() => abrir(doc.id)} className="text-[#731515] disabled:opacity-50" aria-label={`Visualizar ${doc.nome_arquivo}`}>Visualizar</button><button type="button" disabled={ocupado} onClick={() => retirar(doc.id)} className="text-rose-700 disabled:opacity-50" aria-label={`Retirar ${doc.nome_arquivo}`}>Retirar</button></div>
    </li>)}</ul><p className="mt-2 text-xs text-stone-500">Para substituir um arquivo incorreto, retire-o e adicione o correto na mesma categoria.</p></div>}
  </div>;
}
