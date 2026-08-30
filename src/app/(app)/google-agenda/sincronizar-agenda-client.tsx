"use client";

import { useState } from "react";
import { sincronizarUmProcesso } from "./actions";

interface ProcessoParaSincronizar {
  id: string;
  identificador: string;
}

export function SincronizarAgendaClient({
  processos,
}: {
  processos: ProcessoParaSincronizar[];
}) {
  const [rodando, setRodando] = useState(false);
  const [feitos, setFeitos] = useState(0);
  const [falhas, setFalhas] = useState<string[]>([]);
  const [concluido, setConcluido] = useState(false);

  async function sincronizarTudo() {
    setRodando(true);
    setFeitos(0);
    setFalhas([]);
    setConcluido(false);

    const comFalha: string[] = [];
    for (let i = 0; i < processos.length; i++) {
      const processo = processos[i];
      const resultado = await sincronizarUmProcesso(processo.id);
      if (!resultado.ok) comFalha.push(processo.identificador);
      setFeitos(i + 1);
    }

    setFalhas(comFalha);
    setRodando(false);
    setConcluido(true);
  }

  return (
    <div className="space-y-3">
      <button
        onClick={sincronizarTudo}
        disabled={rodando || processos.length === 0}
        className="rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {rodando
          ? `Sincronizando... (${feitos}/${processos.length})`
          : "Sincronizar tudo agora"}
      </button>

      {rodando && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${(feitos / Math.max(processos.length, 1)) * 100}%` }}
          />
        </div>
      )}

      {concluido && (
        <p className="text-sm text-ink-muted">
          {falhas.length === 0
            ? `Pronto! ${feitos} processo${feitos === 1 ? "" : "s"} sincronizado${feitos === 1 ? "" : "s"} com sucesso.`
            : `${feitos - falhas.length} de ${feitos} sincronizados. Tiveram problema: ${falhas.join(", ")}.`}
        </p>
      )}
    </div>
  );
}
