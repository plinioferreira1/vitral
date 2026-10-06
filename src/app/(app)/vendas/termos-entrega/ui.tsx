import { ROTULO_STATUS, type StatusTermo } from "@/lib/termo-entrega/conteudo";

const TOM: Record<StatusTermo, string> = {
  rascunho: "bg-stone-100 text-stone-700 ring-stone-200",
  gerado: "bg-sky-50 text-sky-800 ring-sky-200",
  aguardando_assinatura: "bg-amber-50 text-amber-800 ring-amber-200",
  parcialmente_assinado: "bg-violet-50 text-violet-800 ring-violet-200",
  assinado: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  cancelado: "bg-rose-50 text-rose-800 ring-rose-200",
};

export function SeloStatusTermo({ status }: { status: StatusTermo }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TOM[status]}`}>{ROTULO_STATUS[status]}</span>;
}

export const ROTULO = "mb-1 block text-xs font-medium text-ink-muted";
export const BOTAO_MINI = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-surface px-3 py-2 text-xs font-medium text-ink-muted transition hover:bg-background hover:text-ink";

export function dataCurta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}
