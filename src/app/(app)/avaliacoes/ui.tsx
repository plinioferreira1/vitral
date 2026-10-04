import type { ReactNode } from "react";
import { CARD_CLASS, INPUT_CLASS } from "@/components/ui/styles";
import { ROTULO_STATUS, type Finalidade, type StatusAvaliacao } from "@/lib/avaliacao/tipos";

export const ROTULO_CLASS = "mb-1 block text-xs font-medium text-ink-muted";

export function Campo({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  required,
  ajuda,
  inputMode,
  className = "",
  step,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  placeholder?: string;
  required?: boolean;
  ajuda?: string;
  inputMode?: "decimal" | "numeric" | "text" | "url";
  className?: string;
  step?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={ROTULO_CLASS}>
        {label}
        {required && <span className="text-brand"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        inputMode={inputMode}
        step={step}
        className={INPUT_CLASS}
      />
      {ajuda && <span className="mt-1 block text-[11px] leading-4 text-ink-muted">{ajuda}</span>}
    </label>
  );
}

export function AreaTexto({
  label,
  name,
  defaultValue,
  rows = 3,
  placeholder,
  ajuda,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  placeholder?: string;
  ajuda?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={ROTULO_CLASS}>{label}</span>
      <textarea name={name} defaultValue={defaultValue ?? ""} rows={rows} placeholder={placeholder} className={INPUT_CLASS} />
      {ajuda && <span className="mt-1 block text-[11px] leading-4 text-ink-muted">{ajuda}</span>}
    </label>
  );
}

export function Selecao({
  label,
  name,
  defaultValue,
  opcoes,
  ajuda,
  className = "",
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  opcoes: { valor: string; rotulo: string }[];
  ajuda?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={ROTULO_CLASS}>{label}</span>
      <select name={name} defaultValue={defaultValue ?? ""} className={INPUT_CLASS}>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      {ajuda && <span className="mt-1 block text-[11px] leading-4 text-ink-muted">{ajuda}</span>}
    </label>
  );
}

export function Cartao({ titulo, descricao, children, acao }: { titulo?: string; descricao?: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <section className={`${CARD_CLASS} p-4 sm:p-5`}>
      {(titulo || acao) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {titulo && <h2 className="text-base font-semibold text-ink">{titulo}</h2>}
            {descricao && <p className="mt-0.5 max-w-3xl text-sm text-ink-muted">{descricao}</p>}
          </div>
          {acao}
        </div>
      )}
      {children}
    </section>
  );
}

const COR_STATUS: Record<StatusAvaliacao, string> = {
  rascunho: "bg-stone-100 text-stone-700",
  em_revisao: "bg-amber-100 text-amber-800",
  aprovado: "bg-sky-100 text-sky-800",
  emitido: "bg-emerald-100 text-emerald-800",
  arquivado: "bg-stone-200 text-stone-500",
};

export function SeloStatus({ status }: { status: StatusAvaliacao }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${COR_STATUS[status]}`}>
      {ROTULO_STATUS[status]}
    </span>
  );
}

export function Aviso({ tom, children }: { tom: "alerta" | "bloqueio" | "info"; children: ReactNode }) {
  const classe =
    tom === "bloqueio"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : tom === "alerta"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-border bg-background text-ink-muted";
  return <div className={`rounded-lg border px-3 py-2 text-xs leading-5 ${classe}`}>{children}</div>;
}

export function moeda(v: number | null | undefined, finalidade: Finalidade): string {
  if (v === null || v === undefined) return "—";
  return `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}${finalidade === "locacao" ? "/mês" : ""}`;
}

export function moedaM2(v: number | null | undefined, finalidade: Finalidade): string {
  if (v === null || v === undefined) return "—";
  return finalidade === "locacao"
    ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/m²/mês`
    : `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}/m²`;
}

export function dataBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}
