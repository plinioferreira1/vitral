"use client";
import { BotaoEnviar } from "@/components/botao-enviar";
import type { ButtonHTMLAttributes } from "react";

export function BotaoComConfirmacao({
  mensagem,
  children,
  className,
  textoEnviando,
  ...resto
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  mensagem: string;
  textoEnviando?: string;
}) {
  return (
    <BotaoEnviar
      {...resto}
      className={className}
      textoEnviando={textoEnviando}
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
