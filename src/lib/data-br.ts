// Utilitários de data/hora fixados no fuso de Brasília — o servidor
// (Vercel) roda em UTC, então "hoje"/"agora" sem fuso explícito bate
// errado, principalmente à noite (21h-23h59 em Brasília já é o dia
// seguinte em UTC).

export const FUSO_BR = "America/Sao_Paulo";

/** Data de hoje em Brasília, formato "YYYY-MM-DD". */
export function hojeISO(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: FUSO_BR });
}

/** Formata uma data (string "YYYY-MM-DD" ou Date) no padrão brasileiro, sempre no fuso de Brasília. */
export function formatarDataBR(
  data: string | Date,
  opcoes?: Intl.DateTimeFormatOptions
): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR", { timeZone: FUSO_BR, ...opcoes });
}

/** Formata data + hora no padrão brasileiro, sempre no fuso de Brasília. */
export function formatarDataHoraBR(
  data: string | Date,
  opcoes?: Intl.DateTimeFormatOptions
): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleString("pt-BR", { timeZone: FUSO_BR, ...opcoes });
}
