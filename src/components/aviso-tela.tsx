"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import type { Aviso } from "@/lib/aviso";

const COOKIE_AVISO = "vitral_aviso";

// Notificação no canto da tela para o aviso deixado pela última ação.
// Apaga o cookie assim que aparece (pra não repetir na próxima página).
export function AvisoTela({ aviso }: { aviso: Aviso | null }) {
  const [visivel, setVisivel] = useState<Aviso | null>(aviso);

  useEffect(() => {
    if (!aviso) return;
    setVisivel(aviso);
    document.cookie = `${COOKIE_AVISO}=; Max-Age=0; path=/`;
    // Erro fica mais tempo na tela que sucesso.
    const t = setTimeout(() => setVisivel(null), aviso.tipo === "erro" ? 10_000 : 4_000);
    return () => clearTimeout(t);
    // O id muda a cada aviso novo — é o que dispara de novo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aviso?.id]);

  if (!visivel) return null;
  const erro = visivel.tipo === "erro";

  return (
    <div
      role={erro ? "alert" : "status"}
      className={`fixed right-4 top-4 z-[60] flex max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${
        erro ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {erro ? (
        <AlertTriangle size={18} strokeWidth={2} className="mt-0.5 shrink-0" />
      ) : (
        <CheckCircle2 size={18} strokeWidth={2} className="mt-0.5 shrink-0" />
      )}
      <p className="flex-1">{visivel.mensagem}</p>
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={() => setVisivel(null)}
        className="shrink-0 opacity-60 hover:opacity-100"
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
