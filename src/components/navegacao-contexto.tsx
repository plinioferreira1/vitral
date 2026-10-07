"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type LinkContexto = { href: string; label: string };
export function NavegacaoContexto({ links, nome }: { links: LinkContexto[]; nome: string }) {
  const pathname = usePathname();
  const atual = links.filter(({ href }) => pathname === href || pathname.startsWith(`${href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav aria-label={nome} className="flex flex-wrap gap-1 rounded-xl border border-border/70 bg-surface p-1.5">
      {links.map(({ href, label }) => (
        <Link key={href} href={href} aria-current={atual === href ? "page" : undefined}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${atual === href ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-background hover:text-ink"}`}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
