import Link from "next/link";
import { CircleHelp } from "lucide-react";
import type { Assunto } from "@/lib/ajuda/topicos";

/**
 * Orientação contextual: leva ao guia da Central de ajuda (por link direto
 * do tópico) ou aos tópicos de um assunto. Discreto, para ficar no
 * cabeçalho ou ao lado do título da seção.
 */
export function LinkAjuda({ slug, assunto, rotulo = "Como usar" }: { slug?: string; assunto?: Assunto; rotulo?: string }) {
  const href = slug ? `/corretor#${slug}` : `/corretor?assunto=${encodeURIComponent(assunto ?? "")}#biblioteca`;
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-brand hover:underline sm:min-h-0">
      <CircleHelp size={14} aria-hidden="true" />
      {rotulo}
    </Link>
  );
}
