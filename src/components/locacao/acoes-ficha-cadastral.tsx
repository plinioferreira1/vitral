"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";

export const URL_FICHA_CADASTRAL =
  "https://forms.zohopublic.com/sacraimoveis/form/FichaCadastraldeLocaoSACRA/formperma/KcngXbS94wI6jiyShJtAkRw-j0V5xdaZM0l9mFdUXa0";

export function AcoesFichaCadastral() {
  const [copiado, setCopiado] = useState(false);

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(URL_FICHA_CADASTRAL);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2200);
    } catch {
      window.open(URL_FICHA_CADASTRAL, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={copiarLink}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-amber-300 hover:text-amber-700"
      >
        {copiado ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        {copiado ? "Link copiado" : "Copiar link"}
      </button>

      <a
        href={URL_FICHA_CADASTRAL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
      >
        Abrir em nova guia
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
