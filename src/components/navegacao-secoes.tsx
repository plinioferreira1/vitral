"use client";

import { useEffect, useState } from "react";

export function NavegacaoSecoes({ secoes }: { secoes: { id: string; label: string }[] }) {
  const [ativa, setAtiva] = useState(secoes[0]?.id);
  useEffect(() => {
    const elementos = secoes.map(({ id }) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const observer = new IntersectionObserver((entradas) => {
      const visivel = entradas.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visivel) setAtiva(visivel.target.id);
    }, { rootMargin: "-10% 0px -65% 0px", threshold: 0 });
    elementos.forEach((e) => observer.observe(e));
    return () => observer.disconnect();
  }, [secoes]);
  return (
    <nav aria-label="Seções deste registro" className="sticky top-0 z-10 flex flex-wrap gap-1 rounded-xl border border-border/70 bg-surface/95 p-1.5 shadow-sm backdrop-blur">
      {secoes.map(({ id, label }) => (
        <a key={id} href={`#${id}`} aria-current={ativa === id ? "location" : undefined}
          onClick={() => {
            const alvo = document.getElementById(id);
            if (alvo instanceof HTMLDetailsElement) alvo.open = true;
            setAtiva(id);
          }}
          className={`rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${ativa === id ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-background hover:text-ink"}`}>
          {label}
        </a>
      ))}
    </nav>
  );
}
