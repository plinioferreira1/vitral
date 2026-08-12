"use client";

import { useState } from "react";
import { salvarOrdemEtapas } from "@/app/(app)/processos/[id]/actions";

interface EtapaResumo {
  id: string;
  nome: string;
  status: string;
}

export function EditorLinhaTempo({
  processoId,
  etapasIniciais,
}: {
  processoId: string;
  etapasIniciais: EtapaResumo[];
}) {
  const [etapas, setEtapas] = useState(etapasIniciais);
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function soltarSobre(idAlvo: string) {
    if (!arrastandoId || arrastandoId === idAlvo) return;

    const novaLista = [...etapas];
    const indiceOrigem = novaLista.findIndex((e) => e.id === arrastandoId);
    const indiceAlvo = novaLista.findIndex((e) => e.id === idAlvo);
    if (indiceOrigem === -1 || indiceAlvo === -1) return;

    const [item] = novaLista.splice(indiceOrigem, 1);
    novaLista.splice(indiceAlvo, 0, item);
    setEtapas(novaLista);
  }

  async function salvar(evento: React.MouseEvent<HTMLButtonElement>) {
    setSalvando(true);
    try {
      await salvarOrdemEtapas(
        processoId,
        etapas.map((e) => e.id)
      );
      evento.currentTarget.closest("details")?.removeAttribute("open");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-1">
      <p className="px-1 pb-1 text-[11px] text-ink-muted">Arraste pra reordenar as etapas desse processo.</p>
      {etapas.map((e) => (
        <div
          key={e.id}
          draggable
          onDragStart={() => setArrastandoId(e.id)}
          onDragOver={(ev) => ev.preventDefault()}
          onDrop={() => soltarSobre(e.id)}
          onDragEnd={() => setArrastandoId(null)}
          className={`flex cursor-grab items-center gap-2 rounded-md border px-2 py-1.5 text-xs active:cursor-grabbing ${
            arrastandoId === e.id
              ? "border-brand bg-background opacity-60"
              : "border-transparent text-ink hover:bg-background"
          }`}
        >
          <span className="select-none text-ink-muted">⠿</span>
          <span className="truncate">{e.nome}</span>
        </div>
      ))}
      <button
        type="button"
        onClick={salvar}
        disabled={salvando}
        className="mt-2 w-full rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {salvando ? "Salvando..." : "Salvar ordem"}
      </button>
    </div>
  );
}
