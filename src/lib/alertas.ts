import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Etapa } from "@/lib/types";
import { hojeISO } from "@/lib/data-br";

/**
 * Urgência calculada de uma etapa, nunca persistida — sempre
 * derivada de data_prevista vs. hoje. Esse é o "motor de alertas"
 * descrito na especificação (seção 4 / seção 6.4).
 */
export type Urgencia =
  | "concluida"
  | "atrasada"
  | "vence_hoje"
  | "vence_em_breve" // <= 7 dias
  | "no_prazo" // > 7 dias
  | "sem_data";

export interface EtapaComUrgencia extends Etapa {
  urgencia: Urgencia;
  dias_para_vencer: number | null;
}

export function calcularUrgencia(etapa: Pick<Etapa, "status" | "data_prevista">): {
  urgencia: Urgencia;
  dias_para_vencer: number | null;
} {
  if (etapa.status === "concluida") {
    return { urgencia: "concluida", dias_para_vencer: null };
  }

  if (!etapa.data_prevista) {
    return { urgencia: "sem_data", dias_para_vencer: null };
  }

  const hoje = new Date(`${hojeISO()}T00:00:00`);
  const dias = differenceInCalendarDays(parseISO(etapa.data_prevista), hoje);

  if (dias < 0) return { urgencia: "atrasada", dias_para_vencer: dias };
  if (dias === 0) return { urgencia: "vence_hoje", dias_para_vencer: dias };
  if (dias <= 7) return { urgencia: "vence_em_breve", dias_para_vencer: dias };
  return { urgencia: "no_prazo", dias_para_vencer: dias };
}

export function anexarUrgencia(etapas: Etapa[]): EtapaComUrgencia[] {
  return etapas.map((e) => ({ ...e, ...calcularUrgencia(e) }));
}

export const URGENCIA_LABEL: Record<Urgencia, string> = {
  concluida: "Concluída",
  atrasada: "Atrasada",
  vence_hoje: "Vence hoje",
  vence_em_breve: "Vence em breve",
  no_prazo: "No prazo",
  sem_data: "Sem data definida",
};

export const URGENCIA_COR: Record<Urgencia, string> = {
  concluida: "bg-stone-100 text-stone-500 border-stone-200",
  atrasada: "bg-rose-50 text-rose-700 border-rose-200",
  vence_hoje: "bg-amber-50 text-amber-800 border-amber-200",
  vence_em_breve: "bg-amber-50 text-amber-700 border-amber-100",
  no_prazo: "bg-emerald-50 text-emerald-700 border-emerald-100",
  sem_data: "bg-stone-50 text-stone-500 border-stone-200",
};

export function formatarPrazo(dias: number | null): string {
  if (dias === null) return "";
  if (dias === 0) return "vence hoje";
  if (dias > 0) return `vence em ${dias} dia${dias > 1 ? "s" : ""}`;
  return `atrasada há ${Math.abs(dias)} dia${Math.abs(dias) > 1 ? "s" : ""}`;
}
