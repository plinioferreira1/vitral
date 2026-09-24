import Link from "next/link";
import type { LucideIcon } from "lucide-react";

const TONS = {
  neutro: { bg: "bg-surface", iconBg: "bg-background", iconText: "text-ink-muted", valor: "text-ink" },
  perigo: { bg: "bg-rose-50", iconBg: "bg-rose-100", iconText: "text-rose-700", valor: "text-rose-700" },
  alerta: { bg: "bg-amber-50", iconBg: "bg-amber-100", iconText: "text-amber-700", valor: "text-amber-700" },
  sucesso: { bg: "bg-emerald-50", iconBg: "bg-emerald-100", iconText: "text-emerald-700", valor: "text-emerald-700" },
} as const;

/**
 * Cartão de indicador numérico (KPI) — ícone à esquerda, número
 * grande, rótulo embaixo, com link opcional "ver mais". Mesmo
 * padrão usado nos painéis de Vendas/Financiamentos/Locação da
 * referência visual.
 */
export function CartaoIndicador({
  icon: Icon,
  valor,
  label,
  href,
  tom = "neutro",
}: {
  icon: LucideIcon;
  valor: string | number;
  label: string;
  href?: string;
  tom?: keyof typeof TONS;
}) {
  const cores = TONS[tom];

  const conteudo = (
    <div className={`flex items-center gap-3 rounded-xl border border-border/60 p-4 shadow-sm transition ${cores.bg} ${href ? "hover:opacity-80" : ""}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cores.iconBg} ${cores.iconText}`}>
        <Icon size={19} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className={`num text-2xl font-bold leading-tight ${cores.valor}`}>{valor}</p>
        <p className="truncate text-xs text-ink-muted">{label}</p>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{conteudo}</Link>;
  }
  return conteudo;
}
