"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { TabelaProcessos, type ProcessoRow } from "@/components/tabela-processos";

export function BuscaTabelaProcessos({
  rows,
  ehFinanciamento,
  atrasosPorProcesso,
}: {
  rows: ProcessoRow[];
  ehFinanciamento: boolean;
  atrasosPorProcesso?: Map<string, number>;
}) {
  const [busca, setBusca] = useState("");

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return rows;
    return rows.filter((p) => {
      const campos = [
        p.imoveis?.endereco,
        p.comprador?.nome,
        p.vendedor?.nome,
        p.codigo_san,
        p.numero_processo,
      ];
      return campos.some((c) => c?.toLowerCase().includes(termo));
    });
  }, [rows, busca]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={16}
          strokeWidth={2}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={
            ehFinanciamento
              ? "Buscar por imóvel, cliente ou código..."
              : "Buscar por imóvel, comprador, vendedor ou código..."
          }
          className="w-full rounded-md border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
        {filtradas.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">
            Nenhum processo encontrado pra &quot;{busca}&quot;.
          </p>
        ) : (
          <TabelaProcessos
            rows={filtradas}
            ehFinanciamento={ehFinanciamento}
            atrasosPorProcesso={atrasosPorProcesso}
          />
        )}
      </div>
    </div>
  );
}
