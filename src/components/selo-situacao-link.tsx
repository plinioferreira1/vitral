import { ROTULO_SITUACAO, type SituacaoLink } from "@/lib/assinaturas/link";

const COR: Record<SituacaoLink, string> = {
  assinado: "border-emerald-200 bg-emerald-50 text-emerald-700",
  valido: "border-sky-200 bg-sky-50 text-sky-800",
  vencido: "border-amber-200 bg-amber-50 text-amber-800",
  revogado: "border-rose-200 bg-rose-50 text-rose-700",
  encerrado: "border-stone-200 bg-stone-100 text-stone-600",
};

/** Etiqueta da situação de um link de assinatura. */
export function SeloSituacaoLink({ situacao }: { situacao: SituacaoLink }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${COR[situacao]}`}>
      {ROTULO_SITUACAO[situacao]}
    </span>
  );
}
