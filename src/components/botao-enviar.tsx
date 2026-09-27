"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

/**
 * Botão de envio de formulário que fica desabilitado e mostra um
 * indicador enquanto a ação roda — evita cliques repetidos e a sensação
 * de "cliquei e nada aconteceu". Aceita os mesmos atributos de <button>.
 */
export function BotaoEnviar({
  children,
  className = "",
  disabled,
  textoEnviando,
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { textoEnviando?: string }) {
  const { pending, data } = useFormStatus();
  // Em formulários com vários botões (ex: com name/value), só o botão
  // clicado mostra o indicador.
  const esteBotao =
    pending && (!resto.name || data?.get(resto.name) === String(resto.value ?? ""));

  return (
    <button
      type="submit"
      {...resto}
      disabled={disabled || pending}
      aria-busy={esteBotao || undefined}
      className={`${className} disabled:cursor-wait disabled:opacity-70`}
    >
      {esteBotao ? (
        <span className="inline-flex items-center justify-center gap-1.5">
          <Loader2 size={14} strokeWidth={2.25} className="animate-spin" />
          {textoEnviando ?? children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
