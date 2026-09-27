"use client";
import { BotaoEnviar } from "@/components/botao-enviar";

export function BotaoComConfirmacao({
  mensagem,
  children,
  className,
}: {
  mensagem: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <BotaoEnviar
      className={className}
      onClick={(e) => {
        if (!window.confirm(mensagem)) {
          e.preventDefault();
        }
      }}
    >
      {children}
    </BotaoEnviar>
  );
}
