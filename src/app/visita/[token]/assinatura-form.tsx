"use client";

import { useState } from "react";
import { CanvasAssinatura } from "@/components/canvas-assinatura";
import { registrarAssinaturaVisita } from "./actions";

export function AssinaturaVisitaForm({ token }: { token: string }) {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [concordo, setConcordo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);

  async function enviar() {
    setErro(null);
    setEnviando(true);
    const resultado = await registrarAssinaturaVisita(token, nome, cpf, rg, assinatura ?? "");
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
        className="mb-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">CPF (opcional)</label>
          <input
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">RG (opcional)</label>
          <input
            value={rg}
            onChange={(e) => setRg(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
          />
        </div>
      </div>

      <label className="mb-1 block text-xs font-medium text-ink-muted">Assinatura</label>
      <CanvasAssinatura onChange={setAssinatura} />

      <label className="mt-4 flex items-start gap-2 text-xs text-ink">
        <input
          type="checkbox"
          checked={concordo}
          onChange={(e) => setConcordo(e.target.checked)}
          className="mt-0.5 accent-brand"
        />
        <span>
          Li e concordo com os termos descritos acima, e reconheço que esta ação constitui
          minha assinatura eletrônica, válida nos termos do art. 10, §2º da MP 2.200-2/2001.
          Data, hora e IP ficam registrados como comprovação.
        </span>
      </label>

      {erro && <p className="mt-3 text-sm text-rose-600">{erro}</p>}

      <button
        type="button"
        onClick={enviar}
        disabled={enviando || !nome.trim() || !assinatura || !concordo}
        className="mt-4 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {enviando ? "Enviando..." : "Confirmar assinatura"}
      </button>
    </div>
  );
}
