"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export type LinkContexto = { href: string; label: string };
export function NavegacaoContexto({ links, nome }: { links: LinkContexto[]; nome: string }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const atual = links.filter(({ href }) => pathname === href || pathname.startsWith(`${href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  useEffect(() => {
    const nav = navRef.current;
    const link = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && link && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = link.offsetLeft - nav.offsetLeft - 8;
  }, [atual]);
  return (
    <nav ref={navRef} aria-label={nome} className="flex min-w-0 gap-1 overflow-x-auto overscroll-x-contain rounded-xl border border-border/70 bg-surface p-1.5 sm:flex-wrap">
      {links.map(({ href, label }) => (
        <Link key={href} href={href} aria-current={atual === href ? "page" : undefined}
          className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${atual === href ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-background hover:text-ink"}`}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
