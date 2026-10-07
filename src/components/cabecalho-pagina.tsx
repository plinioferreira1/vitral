import type { ReactNode } from "react";
import { PAGE_TITLE_CLASS } from "@/components/ui/styles";

export function CabecalhoPagina({ titulo, descricao, acao }: { titulo: ReactNode; descricao?: ReactNode; acao?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className={PAGE_TITLE_CLASS}>{titulo}</h1>
        {descricao && <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">{descricao}</p>}
      </div>
      {acao && <div className="flex shrink-0 flex-wrap items-center gap-2">{acao}</div>}
    </header>
  );
}
