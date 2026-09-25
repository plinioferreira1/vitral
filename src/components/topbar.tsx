"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Bell, Calendar } from "lucide-react";

export function TopBar({
  dataFormatada,
  contagemAtrasados = 0,
}: {
  dataFormatada: string;
  contagemAtrasados?: number;
}) {
  const router = useRouter();
  const [termo, setTermo] = useState("");

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    if (termo.trim().length < 2) return;
    router.push(`/buscar?q=${encodeURIComponent(termo.trim())}`);
  }

  return (
    <div className="flex items-center gap-3">
      <form onSubmit={buscar} className="relative flex-1">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          type="text"
          placeholder="Buscar processo, imóvel, cliente..."
          className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-ink outline-none focus:border-brand focus:bg-surface focus:ring-1 focus:ring-brand"
        />
      </form>

      <div className="relative shrink-0 rounded-lg border border-border bg-surface p-2.5 text-ink-muted">
        <Bell size={17} strokeWidth={2} />
        {contagemAtrasados > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
            {contagemAtrasados > 9 ? "9+" : contagemAtrasados}
          </span>
        )}
      </div>

      <div className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink-muted sm:flex">
        <Calendar size={15} strokeWidth={2} />
        <span>{dataFormatada}</span>
      </div>
    </div>
  );
}
