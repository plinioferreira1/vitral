"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/** Modal grande aberto pela URL (?detalhe=…); fechar volta ao painel com os mesmos filtros. */
export function ModalDetalhe({ titulo, subtitulo, hrefFechar, children }: { titulo: string; subtitulo?: string; hrefFechar: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const dialogo = ref.current;
    if (dialogo && !dialogo.open) dialogo.showModal();
  }, []);

  const fechar = () => router.push(hrefFechar, { scroll: false });

  return (
    <dialog
      ref={ref}
      onClose={fechar}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto max-h-[calc(100dvh-1.5rem)] w-[min(96vw,980px)] overflow-hidden rounded-2xl border border-border bg-surface p-0 shadow-2xl backdrop:bg-black/45"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-6">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-ink sm:text-lg">{titulo}</h2>
          {subtitulo && <p className="mt-0.5 text-xs text-ink-muted">{subtitulo}</p>}
        </div>
        <button type="button" onClick={() => ref.current?.close()} aria-label="Fechar" className="rounded-lg p-2 text-ink-muted hover:bg-background">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="max-h-[calc(100dvh-6.5rem)] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
    </dialog>
  );
}
