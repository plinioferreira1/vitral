"use client";

import { useFormStatus } from "react-dom";

export function BotaoSubmit({
  children,
  className,
  textoEnviando,
}: {
  children: React.ReactNode;
  className?: string;
  textoEnviando?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? (textoEnviando ?? "Enviando...") : children}
    </button>
  );
}
