import Link from "next/link";
import { URGENCIA_COR } from "@/lib/alertas";
import { CATEGORIA_LABEL, type CategoriaProcesso } from "@/lib/types";
import type { EventoCalendario } from "@/lib/queries";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";

const CATEGORIA_PONTO: Record<CategoriaProcesso, string> = {
  venda: "bg-brand",
  financiamento: "bg-gold",
  locacao: "bg-stone-500",
};

export function CalendarioGrid({
  eventos,
  referencia,
  compacto = false,
  maxPorDia = 3,
}: {
  eventos: EventoCalendario[];
  referencia: Date;
  compacto?: boolean;
  maxPorDia?: number;
}) {
  const inicioMes = startOfMonth(referencia);
  const fimMes = endOfMonth(referencia);
  const inicioGrade = startOfWeek(inicioMes, { weekStartsOn: 0 });
  const fimGrade = endOfWeek(fimMes, { weekStartsOn: 0 });
  const dias = eachDayOfInterval({ start: inicioGrade, end: fimGrade });

  const porDia = new Map<string, EventoCalendario[]>();
  eventos.forEach((e) => {
    const chave = e.data;
    if (!porDia.has(chave)) porDia.set(chave, []);
    porDia.get(chave)!.push(e);
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="grid grid-cols-7 border-b border-border bg-background text-center text-xs font-medium text-ink-muted">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((dia) => {
          const chave = format(dia, "yyyy-MM-dd");
          const eventosDoDia = porDia.get(chave) ?? [];
          const foraDoMes = !isSameMonth(dia, referencia);

          return (
            <div
              key={chave}
              className={`border-b border-r border-border p-1.5 last:border-r-0 ${
                compacto ? "min-h-[74px]" : "min-h-[110px]"
              } ${foraDoMes ? "bg-background/50" : ""}`}
            >
              <p
                className={`mb-1 text-xs ${
                  isToday(dia)
                    ? "flex h-5 w-5 items-center justify-center rounded-full bg-brand font-medium text-white"
                    : foraDoMes
                      ? "text-ink-muted/50"
                      : "text-ink-muted"
                }`}
              >
                {format(dia, "d")}
              </p>
              <div className="space-y-1">
                {eventosDoDia.slice(0, maxPorDia).map((e) => (
                  <Link
                    key={e.id}
                    href={e.href}
                    className={`flex items-center gap-1 truncate rounded border px-1 py-0.5 text-[10px] leading-tight ${
                      e.concluida
                        ? "border-stone-200 bg-stone-100 text-stone-500"
                        : URGENCIA_COR[e.urgencia]
                    }`}
                    title={`${CATEGORIA_LABEL[e.categoria]} — ${e.titulo}`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${CATEGORIA_PONTO[e.categoria]}`} />
                    <span className="truncate">{e.titulo}</span>
                  </Link>
                ))}
                {eventosDoDia.length > maxPorDia && (
                  <p className="text-[10px] text-ink-muted">+{eventosDoDia.length - maxPorDia} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
