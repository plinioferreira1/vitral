import Link from "next/link";
import { SearchX } from "lucide-react";

// Usado quando um processo, contrato, proposta etc. não existe (ou foi
// apagado) — em vez da página 404 genérica em inglês.
export default function NaoEncontrado() {
  return (
    <div className="mx-auto mt-10 max-w-lg rounded-xl border border-border/60 bg-surface p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background text-ink-muted">
        <SearchX size={22} strokeWidth={2} />
      </div>
      <h1 className="text-lg font-semibold text-ink">Não encontramos o que você procurava</h1>
      <p className="mt-2 text-sm text-ink-muted">
        O registro pode ter sido apagado ou o endereço está incorreto.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Ir para o início
      </Link>
    </div>
  );
}
