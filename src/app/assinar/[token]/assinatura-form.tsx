"use client";

import { useRef, useState } from "react";
import { CARD_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { Loader2, PenLine, CheckCircle2 } from "lucide-react";
import { CanvasAssinatura } from "@/components/canvas-assinatura";
import { registrarAssinatura } from "./actions";

export function AssinaturaForm({
  token,
  nomeEsperado,
}: {
  token: string;
  nomeEsperado: string;
}) {
  const envioEmCurso = useRef(false);
  const [nome, setNome] = useState("");
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [concordo, setConcordo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);

  async function enviar() {
    if (envioEmCurso.current) return;
    envioEmCurso.current = true;
    setErro(null);
    setEnviando(true);
    try {
    const resultado = await registrarAssinatura(token, nome, assinatura ?? "");
    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível registrar a assinatura.");
      return;
    }
    setConcluido(true);
    } catch {
      setErro("Não foi possível confirmar o retorno da assinatura. Reabra este link para conferir se ela foi registrada antes de tentar novamente.");
    } finally {
      envioEmCurso.current = false;
      setEnviando(false);
    }
  }

  if (concluido) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 size={28} className="mx-auto mb-3 text-emerald-700" /><p className="text-base font-semibold text-emerald-800">Assinatura registrada!</p>
        <p className="mt-1 text-sm text-emerald-700">
          Obrigado, {nome.split(" ")[0]}. Já pode fechar esta página.
        </p>
      </div>
    );
  }

  return (
    <div className={`${CARD_CLASS} p-5 sm:p-7`}>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-ink"><PenLine size={20} className="text-brand" /> Sua assinatura</h2>
      <p className="mb-4 text-xs text-ink-muted">
        Assinando como: <span className="font-medium text-ink">{nomeEsperado}</span>
      </p>

      <label htmlFor="nome-assinatura" className="mb-1.5 block text-sm font-medium text-ink">Nome completo</label>
      <input
        id="nome-assinatura" autoComplete="name" disabled={enviando}
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Digite seu nome completo"
        className={`${INPUT_CLASS} mb-4 min-h-11 text-base`}
      />

      <label className="mb-1.5 block text-sm font-medium text-ink">Assinatura</label>
      <CanvasAssinatura onChange={setAssinatura} />

      <label className="mt-5 flex min-h-11 items-start gap-3 rounded-xl border border-border bg-background/50 p-4 text-sm leading-6 text-ink">
        <input
          type="checkbox"
          disabled={enviando}
          checked={concordo}
          onChange={(e) => setConcordo(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-brand"
        />
        <span>
          Li e concordo com os termos descritos acima, e reconheço que esta ação constitui
          minha assinatura eletrônica, válida nos termos do art. 10, §2º da MP 2.200-2/2001.
          Data, hora e IP ficam registrados como comprovação.
        </span>
      </label>

      {erro && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{erro}</p>}

      <button
        type="button"
        onClick={enviar}
        disabled={enviando || !nome.trim() || !assinatura || !concordo}
        aria-busy={enviando || undefined}
        className={`${PRIMARY_BUTTON_CLASS} mt-5 min-h-12 w-full disabled:opacity-50`}
      >
        {enviando ? <><Loader2 size={17} className="animate-spin" /> Registrando assinatura…</> : "Confirmar assinatura"}
      </button>
    </div>
  );
}
