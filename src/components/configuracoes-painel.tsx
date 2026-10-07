"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { filtrarConfiguracoes } from "@/lib/configuracoes-menu";
import { CARD_CLASS, INPUT_CLASS } from "@/components/ui/styles";

export function ConfiguracoesPainel() {
  const id = useId();
  const [busca, setBusca] = useState("");
  const grupos = filtrarConfiguracoes(busca);
  return (
    <div className="space-y-5">
      <div className="max-w-xl">
        <label htmlFor={id} className="mb-2 block text-sm font-medium text-ink">Buscar uma configuração</label>
        <div className="relative"><Search size={17} className="pointer-events-none absolute left-3 top-3 text-ink-muted" />
          <input id={id} type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: e-mail, usuários, categorias ou jornada" className={`${INPUT_CLASS} pl-10`} />
        </div>
      </div>
      <p role="status" className="text-xs text-ink-muted">{grupos.reduce((n, g) => n + g.links.length, 0)} configurações disponíveis{busca && " para esta busca"}.</p>
      {grupos.length ? <div className="grid items-start gap-5 lg:grid-cols-2">
        {grupos.map((grupo) => <section key={grupo.titulo} className={`${CARD_CLASS} p-5`}>
          <h2 className="text-base font-semibold text-ink">{grupo.titulo}</h2>
          <p className="mt-1 text-sm text-ink-muted">{grupo.descricao}</p>
          <div className="mt-4 divide-y divide-border/70">
            {grupo.links.map((link) => <Link key={link.href} href={link.href} className="group flex items-center justify-between gap-4 rounded-lg py-3 outline-offset-4 hover:text-brand">
              <span><span className="block text-sm font-semibold">{link.label}</span><span className="mt-1 block text-xs leading-5 text-ink-muted">{link.descricao}</span></span>
              <ArrowRight size={17} className="shrink-0 text-ink-muted group-hover:text-brand" />
            </Link>)}
          </div>
        </section>)}
      </div> : <div className={`${CARD_CLASS} p-8`}><p className="text-sm text-ink-muted">Nenhuma configuração encontrada.</p><button type="button" onClick={() => setBusca("")} className="mt-3 text-sm font-semibold text-brand hover:underline">Limpar busca</button></div>}
    </div>
  );
}
