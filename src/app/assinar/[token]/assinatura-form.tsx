"use client";

import { useState } from "react";
import { CanvasAssinatura } from "@/components/canvas-assinatura";
import { registrarAssinatura } from "./actions";

export function AssinaturaForm({ token }: { token: string }) {
  const [nome, setNome] = useState("");
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);

  async function enviar() {
    setErro(null);
    setEnviando(true);
    const resultado = await registrarAssinatura(token, nome, assinatura ?? "");
    setEnviando(false);
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível registrar a assinatura.");
      return;
    }
    setConcluido(true);
  }

  if (concluido) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-base font-semibold text-emerald-800">Assinatura registrada!</p>
        <p className="mt-1 text-sm text-emerald-700">
          Obrigado, {nome.split(" ")[0]}. Já pode fechar esta página.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <label className="mb-1 block text-xs font-medium text-ink-muted">Nome completo</label>
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Digite seu nome completo"
        className="mb-4 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />

      <label className="mb-1 block text-xs font-medium text-ink-muted">Assinatura</label>
      <CanvasAssinatura onChange={setAssinatura} />

      {erro && <p className="mt-3 text-sm text-rose-600">{erro}</p>}

      <button
        type="button"
        onClick={enviar}
        disabled={enviando || !nome.trim() || !assinatura}
        className="mt-4 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {enviando ? "Enviando..." : "Confirmar assinatura"}
      </button>
      <p className="mt-3 text-center text-[11px] text-ink-muted">
        Ao assinar, você concorda com os termos descritos acima. Data, hora e IP ficam
        registrados como comprovação.
      </p>
    </div>
  );
}
