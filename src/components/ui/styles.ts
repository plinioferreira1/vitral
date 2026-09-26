/**
 * Primitivos visuais compartilhados do Vitral.
 * Centralizam decisões de densidade, borda, foco e ações para evitar
 * pequenas variações entre telas implementadas por agentes diferentes.
 */
export const INPUT_CLASS =
  "w-full rounded-lg border border-border/80 bg-surface px-3 py-2.5 text-sm text-ink shadow-[0_1px_0_rgba(28,25,23,0.02)] outline-none transition placeholder:text-ink-muted/70 focus:border-brand/70 focus:ring-2 focus:ring-brand/10";

export const CARD_CLASS =
  "rounded-2xl border border-border/70 bg-surface shadow-[0_1px_2px_rgba(28,25,23,0.04)]";

export const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-92 focus:outline-none focus:ring-2 focus:ring-brand/20";

export const SECONDARY_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-surface px-3.5 py-2.5 text-sm font-medium text-ink-muted transition hover:bg-background hover:text-ink";
