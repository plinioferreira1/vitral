import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

const TONS = {
  marca: { iconBg: "bg-brand/10", iconText: "text-brand" },
  perigo: { iconBg: "bg-rose-100", iconText: "text-rose-700" },
  info: { iconBg: "bg-blue-100", iconText: "text-blue-700" },
  sucesso: { iconBg: "bg-emerald-100", iconText: "text-emerald-700" },
} as const;

/**
 * Cartão de KPI no formato "rótulo em cima, valor embaixo", com
 * selo de ícone quadrado, seta opcional pra navegação e uma linha
 * de rodapé livre (usada pra variação % em relação ao mês anterior).
 * Usado nos painéis de lançamentos (Contas a Pagar/Receber).
 */
export function CartaoKpi({
  icon: Icon,
  label,
  valor,
  tom,
  href,
  rodape,
}: {
  icon: LucideIcon;
  label: string;
  valor: string | number;
  tom: keyof typeof TONS;
  href?: string;
  rodape?: ReactNode;
}) {
  const cores = TONS[tom];

  const conteudo = (
    <div className="rounded-xl border border-border/60 bg-surface p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${cores.iconBg} ${cores.iconText}`}
        >
          <Icon size={19} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-ink-muted">{label}</p>
          <p className="num break-words text-xl font-bold leading-tight text-ink">{valor}</p>
        </div>
        {href && <ChevronRight size={16} className="shrink-0 text-ink-muted" />}
      </div>
      {rodape}
    </div>
  );

  if (href) {
    return <Link href={href}>{conteudo}</Link>;
  }
  return conteudo;
}
