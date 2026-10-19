"use client";

import { useState } from "react";
import { BotaoEnviar } from "@/components/botao-enviar";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from "@/components/ui/styles";
import { validadeSugerida } from "@/lib/certidoes/catalogo";
import { salvarCertidao } from "./certidoes-actions";

/** Anexar ou substituir uma certidão. A validade é sugerida pela emissão; confira a data impressa no documento. */
export function FormCertidao({ processoId, parte, tipo, hoje }: { processoId: string; parte: string; tipo: string; hoje: string }) {
  const [emitida, setEmitida] = useState(hoje);
  const [validade, setValidade] = useState(validadeSugerida(tipo, hoje) ?? "");
  const [validadeEditada, setValidadeEditada] = useState(false);

  return (
    <form action={salvarCertidao} className="mt-3 grid gap-3 rounded-lg border border-border/70 bg-background/60 p-3 sm:grid-cols-2">
      <input type="hidden" name="processo_id" value={processoId} />
      <input type="hidden" name="parte" value={parte} />
      <input type="hidden" name="tipo" value={tipo} />
      <label className="grid gap-1 text-xs font-medium text-ink-muted sm:col-span-2">
        Arquivo da certidão (PDF ou imagem, até 3 MB)
        <input type="file" name="arquivo" accept="application/pdf,image/jpeg,image/png,image/webp" required className="text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-2 file:text-sm file:font-medium" />
      </label>
      <label className="grid gap-1 text-xs font-medium text-ink-muted">
        Emitida em
        <input type="date" name="emitida_em" required value={emitida} className={INPUT_CLASS}
          onChange={(e) => {
            setEmitida(e.target.value);
            if (!validadeEditada && e.target.value) setValidade(validadeSugerida(tipo, e.target.value) ?? "");
          }} />
      </label>
      <label className="grid gap-1 text-xs font-medium text-ink-muted">
        Válida até (confira no documento)
        <input type="date" name="valida_ate" required value={validade} className={INPUT_CLASS}
          onChange={(e) => { setValidade(e.target.value); setValidadeEditada(true); }} />
      </label>
      <fieldset className="flex flex-wrap gap-4 text-sm text-ink sm:col-span-2">
        <legend className="mb-1 text-xs font-medium text-ink-muted">Resultado</legend>
        <label className="flex min-h-11 items-center gap-2"><input type="radio" name="resultado" value="nada_consta" defaultChecked /> Nada consta</label>
        <label className="flex min-h-11 items-center gap-2"><input type="radio" name="resultado" value="positiva" /> Consta algo (positiva)</label>
      </fieldset>
      <div className="sm:col-span-2">
        <BotaoEnviar className={PRIMARY_BUTTON_CLASS} textoEnviando="Anexando…">Anexar certidão</BotaoEnviar>
      </div>
    </form>
  );
}
