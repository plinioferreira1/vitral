"use client";

import { BotaoEnviar } from "@/components/botao-enviar";

// Mantido por compatibilidade — hoje é só um atalho para <BotaoEnviar />.
export function BotaoSubmit({
  children,
  className,
  textoEnviando,
}: {
  children: React.ReactNode;
  className?: string;
  textoEnviando?: string;
}) {
  return (
    <BotaoEnviar className={className} textoEnviando={textoEnviando ?? "Enviando..."}>
      {children}
    </BotaoEnviar>
  );
}
