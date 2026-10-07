"use client";

import { useRef } from "react";
import { Pencil, X } from "lucide-react";

export function ModalEdicaoProcesso({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  return <>
    <button type="button" onClick={() => ref.current?.showModal()} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-xs font-semibold text-ink transition hover:border-border-strong hover:bg-background">
      <Pencil className="h-3.5 w-3.5" />
      Editar processo
    </button>
    <dialog ref={ref} onClick={(e) => { if (e.target === ref.current) ref.current.close(); }} className="app-content m-auto max-h-[calc(100dvh-2rem)] w-[min(94vw,560px)] overflow-hidden rounded-2xl border border-border bg-surface p-0 shadow-2xl backdrop:bg-black/45">
      <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-semibold text-ink">Editar processo</h2><p className="text-xs text-ink-muted">Atualize os dados e salve as alterações.</p></div><button type="button" onClick={() => ref.current?.close()} aria-label="Fechar" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg p-2 text-ink-muted hover:bg-background"><X className="h-5 w-5" /></button></div>
      <div className="max-h-[calc(100dvh-7rem)] overflow-y-auto p-5">{children}</div>
    </dialog>
  </>;
}
