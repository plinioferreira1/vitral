import Link from "next/link";

export function VoltarLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink"
    >
      <svg width="10" height="10" viewBox="0 0 12 12">
        <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </Link>
  );
}
