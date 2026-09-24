import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Cabeçalho de seção/cartão com um selo circular colorido à
 * esquerda (ícone + fundo suave), título e descrição opcional.
 * Esse é o padrão repetido em quase toda tela da referência visual
 * (ex: "Linha do tempo", "Comissão", "Dados do imóvel" etc).
 */
export function CabecalhoSecao({
  icon: Icon,
  titulo,
  descricao,
  acao,
  tom = "brand",
}: {
  icon: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  tom?: "brand" | "neutro";
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            tom === "brand" ? "bg-brand-soft text-brand" : "bg-background text-ink-muted"
          }`}
        >
          <Icon size={18} strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-ink">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-sm text-ink-muted">{descricao}</p>}
        </div>
      </div>
      {acao}
    </div>
  );
}
