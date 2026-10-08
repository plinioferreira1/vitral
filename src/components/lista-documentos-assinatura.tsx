"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { FileSignature, PencilLine, Trash2 } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CARD_CLASS } from "@/components/ui/styles";

export type DocumentoAssinaturaLista = {
  id: string; titulo: string; pessoa: string; status: string;
  detalhe: string; detalheRotulo: string; href: string; editarHref?: string;
};

const STATUS: Record<string, { rotulo: string; classe: string }> = {
  pendente: { rotulo: "Aguardando assinatura", classe: "border-amber-200 bg-amber-50 text-amber-800" },
  assinado: { rotulo: "Assinado", classe: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  cancelado: { rotulo: "Cancelado", classe: "border-border bg-background text-ink-muted" },
};

export function ListaDocumentosAssinatura({ documentos, acao, pessoaRotulo, novoHref, vazio }: {
  documentos: DocumentoAssinaturaLista[]; acao: (dados: FormData) => Promise<void>;
  pessoaRotulo: string; novoHref: string; vazio: string;
}) {
  return <SelecaoDocumentos key={documentos.map((d) => d.id).join(",")} documentos={documentos} acao={acao} pessoaRotulo={pessoaRotulo} novoHref={novoHref} vazio={vazio} />;
}

function SelecaoDocumentos({ documentos, acao, pessoaRotulo, novoHref, vazio }: Parameters<typeof ListaDocumentosAssinatura>[0]) {
  const [selecionados, setSelecionados] = useState<string[]>([]);
  return <form action={acao} onSubmit={(evento) => {
    if (!selecionados.length || !window.confirm(`Excluir ${selecionados.length} documento(s) selecionado(s)? Esta ação não pode ser desfeita.`)) evento.preventDefault();
  }} className={`${CARD_CLASS} overflow-hidden`}>
    <Conteudo documentos={documentos} pessoaRotulo={pessoaRotulo} novoHref={novoHref} vazio={vazio} selecionados={selecionados} setSelecionados={setSelecionados} />
  </form>;
}

function Conteudo({ documentos, pessoaRotulo, novoHref, vazio, selecionados, setSelecionados }: Omit<Parameters<typeof ListaDocumentosAssinatura>[0], "acao"> & {
  selecionados: string[]; setSelecionados: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const { pending } = useFormStatus();
  if (!documentos.length) return <div className="flex flex-col items-center px-6 py-14 text-center"><FileSignature size={32} className="text-brand" /><h2 className="mt-4 font-semibold text-ink">{vazio}</h2><Link href={novoHref} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">Criar o primeiro documento</Link></div>;
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/50 px-4 py-3 sm:px-5">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-brand" checked={selecionados.length === documentos.length} disabled={pending} onChange={(e) => setSelecionados(e.target.checked ? documentos.map((d) => d.id) : [])} /> Selecionar todos</label>
      <div className="flex flex-wrap items-center gap-3"><span aria-live="polite" className="text-xs text-ink-muted">{selecionados.length} selecionado(s)</span><BotaoEnviar disabled={!selecionados.length} textoEnviando="Excluindo…" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700 disabled:opacity-40"><Trash2 size={16} /> Excluir selecionados</BotaoEnviar></div>
    </div>
    <div className="divide-y divide-border">{documentos.map((d) => {
      const status = STATUS[d.status] ?? { rotulo: d.status, classe: "border-border text-ink-muted" };
      return <div key={d.id} className={`flex items-start gap-2 px-3 py-4 sm:items-center sm:gap-3 sm:px-5 ${selecionados.includes(d.id) ? "bg-brand-soft/40" : "hover:bg-background/60"}`}>
        <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center"><input aria-label={`Selecionar documento de ${d.titulo}`} type="checkbox" name="ids" value={d.id} className="h-4 w-4 accent-brand" checked={selecionados.includes(d.id)} disabled={pending} onChange={(e) => setSelecionados((antes) => e.target.checked ? [...antes, d.id] : antes.filter((id) => id !== d.id))} /></label>
        <div className="min-w-0 flex-1"><Link href={d.href} className="inline-flex min-h-11 items-center break-words text-sm font-semibold text-ink hover:text-brand">{d.titulo}</Link><div className="grid gap-x-8 gap-y-2 sm:grid-cols-2"><p className="text-sm text-ink-muted"><span className="block text-[11px] font-medium uppercase tracking-wide">{pessoaRotulo}</span><span className="break-words text-ink">{d.pessoa}</span></p><p className="text-sm text-ink-muted"><span className="block text-[11px] font-medium uppercase tracking-wide">{d.detalheRotulo}</span><span className="break-words text-ink">{d.detalhe}</span></p></div>
          <div className="mt-3 flex flex-wrap items-center gap-3 sm:hidden"><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${status.classe}`}>{status.rotulo}</span>{d.editarHref && <Link href={d.editarHref} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-brand"><PencilLine size={13} /> Editar</Link>}</div>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex"><span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${status.classe}`}>{status.rotulo}</span>{d.editarHref && <Link href={d.editarHref} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-brand"><PencilLine size={13} /> Editar</Link>}</div>
      </div>;
    })}</div>
  </>;
}
