"use client"; // Limites de erro precisam ser Client Components

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

// Mostrado no lugar da página quando algo falha ao carregá-la. O menu
// lateral continua funcionando, então a pessoa pode tentar de novo ou
// ir pra outra tela, em vez de ver uma página quebrada.
export default function ErroPagina({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto mt-10 max-w-lg rounded-xl border border-border/60 bg-surface p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
        <AlertTriangle size={22} strokeWidth={2} />
      </div>
      <h1 className="text-lg font-semibold text-ink">Não foi possível carregar esta tela</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Pode ter sido uma instabilidade momentânea. Tente de novo — se continuar, avise informando o
        código abaixo.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-ink-muted">Código: {error.digest}</p>
      )}
      <div className="mt-6 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <RotateCw size={14} strokeWidth={2} />
          Tentar de novo
        </button>
        <Link
          href="/"
          className="rounded-md border border-border px-4 py-2 text-sm text-ink-muted hover:bg-background"
        >
          Ir para o início
        </Link>
      </div>
    </div>
  );
}
