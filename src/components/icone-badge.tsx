const TONS = {
  brand: { bg: "#F6E8E8", fg: "#731515" },
  gold: { bg: "#F3E6CC", fg: "#B9822C" },
  rose: { bg: "#FDE8E8", fg: "#B91C1C" },
  amber: { bg: "#FEF3D9", fg: "#92600A" },
  emerald: { bg: "#DFF4EA", fg: "#0F7A4E" },
} as const;

export type TomBadge = keyof typeof TONS;

export function IconeBadge({ tom, icone }: { tom: TomBadge; icone: React.ReactNode }) {
  const cores = TONS[tom];
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: cores.bg, color: cores.fg }}
    >
      {icone}
    </div>
  );
}

// Ícones simples, sem depender de biblioteca externa
export const Icones = {
  relogio: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  alerta: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3.5 21.5 20h-19L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M12 9.5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17.2" r="0.9" fill="currentColor" />
    </svg>
  ),
  calendario: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5" width="17" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  casa: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 11 12 4l8 7v8.5a1 1 0 0 1-1 1h-4.5V15h-5v5.5H5a1 1 0 0 1-1-1V11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  ),
  cifrao: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.4-4.5 3.2 2 2.7 4.5 3.3 4.5 1.5 4.5 3.3-2 3.2-4.5 3.2-4.5-1.3-4.5-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  check: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};
