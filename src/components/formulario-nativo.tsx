"use client";

import { createContext, useEffect, useRef, useState, type ComponentProps } from "react";

export const EnvioNativoContext = createContext(false);

/** POST de documento: o retorno 303 abre a página salva sem uma transição RSC. */
export function FormularioNativo({ children, ...props }: Omit<ComponentProps<"form">, "action" | "method" | "onSubmit"> & { action: string }) {
  const [enviando, setEnviando] = useState(false);
  const bloqueado = useRef(false);

  useEffect(() => {
    // Ao voltar pelo histórico, o navegador pode restaurar a página do cache.
    const restaurar = () => {
      bloqueado.current = false;
      setEnviando(false);
    };
    window.addEventListener("pageshow", restaurar);
    return () => window.removeEventListener("pageshow", restaurar);
  }, []);

  return (
    <form {...props} method="post" onSubmit={(event) => {
      if (bloqueado.current) {
        event.preventDefault();
        return;
      }
      bloqueado.current = true;
      setEnviando(true);
    }}>
      <EnvioNativoContext value={enviando}>{children}</EnvioNativoContext>
    </form>
  );
}
