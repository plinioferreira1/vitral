"use client";

import { FileDown } from "lucide-react";

export function ImprimirRelatorio() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-brand hover:bg-rose-100 print:hidden"
    >
      <FileDown size={16} /> Salvar relatório em PDF
    </button>
  );
}
