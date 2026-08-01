import type { EventoCalendario } from "@/lib/queries";
import { DiaCelula } from "./dia-celula";
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
    <div className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
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
            <DiaCelula
              key={chave}
              dia={format(dia, "d")}
              isToday={isToday(dia)}
              foraDoMes={foraDoMes}
              eventos={eventosDoDia}
              compacto={compacto}
              maxPorDia={maxPorDia}
            />
          );
        })}
      </div>
    </div>
  );
}
