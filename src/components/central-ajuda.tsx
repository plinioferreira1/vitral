"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, FileDown, Link2, ListOrdered, MessageSquareText, PlayCircle, Search, X, type LucideIcon } from "lucide-react";
import { BotaoCopiarLink } from "@/components/botao-copiar-link";
import { INPUT_CLASS } from "@/components/ui/styles";
import { assuntosComTopicos, buscarTopicos, type Assunto, type Topico, type TipoTopico } from "@/lib/ajuda/topicos";

const TIPOS: Record<TipoTopico, { rotulo: string; icone: LucideIcon }> = {
  video: { rotulo: "Vídeo", icone: PlayCircle },
  guia: { rotulo: "Guia", icone: BookOpen },
  "passo-a-passo": { rotulo: "Passo a passo", icone: ListOrdered },
  mensagem: { rotulo: "Mensagem", icone: MessageSquareText },
  documento: { rotulo: "Documento", icone: FileDown },
  links: { rotulo: "Links", icone: Link2 },
};

const LINK_CLASS = "text-brand hover:underline";
const BOTAO_CLASS =
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90";

function urlEmbed(link: string): string | null {
  try {
    const url = new URL(link);
    if (url.hostname.includes("youtube.com") && url.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${url.searchParams.get("v")}`;
    }
    if (url.hostname === "youtu.be") return `https://www.youtube.com/embed${url.pathname}`;
    if (url.hostname.includes("loom.com") && url.pathname.startsWith("/share/")) {
      return `https://www.loom.com/embed${url.pathname.replace("/share", "")}`;
    }
    return null;
  } catch {
    return null;
  }
}

function Video({ link, titulo }: { link: string; titulo: string }) {
  const embed = urlEmbed(link);
  if (embed) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-background">
        <iframe
          src={embed}
          title={titulo}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (/\.(mp4|webm|mov)(\?|$)/i.test(link)) {
    // vídeos curtos guardados no próprio Vitral (ex.: gravações de tela do celular, em pé)
    return <video src={link} controls playsInline preload="metadata" className="max-h-[70vh] w-auto max-w-full rounded-lg bg-background" />;
  }
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
      Assistir vídeo →
    </a>
  );
}

function Corpo({ t }: { t: Topico }) {
  const c = t.corpo;
  switch (c.tipo) {
    case "lista": {
      const Lista = c.ordenada ? "ol" : "ul";
      return (
        <Lista className={`${c.ordenada ? "list-decimal" : "list-disc"} space-y-1.5 pl-5`}>
          {c.itens.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </Lista>
      );
    }
    case "definicoes":
      return (
        <div className="space-y-3">
          {c.itens.map((d) => (
            <p key={d.termo}>
              <strong>{d.termo}</strong> — {d.texto}
            </p>
          ))}
        </div>
      );
    case "links":
      return (
        <ul className="space-y-1.5">
          {c.itens.map((l) => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                {l.rotulo}
              </a>
            </li>
          ))}
        </ul>
      );
    case "mensagem":
      return (
        <div className="space-y-3">
          <p className="whitespace-pre-line rounded-lg bg-background p-3 text-ink-muted">{c.texto}</p>
          <BotaoCopiarLink texto={c.texto} rotulo="Copiar mensagem" />
        </div>
      );
    case "download":
      return (
        <a href={c.href} download className={BOTAO_CLASS}>
          <FileDown size={16} /> Baixar {c.formato}
        </a>
      );
    case "video":
      return <Video link={c.link} titulo={t.titulo} />;
    case "texto":
      return (
        <div className="space-y-3">
          {c.texto && <p className="whitespace-pre-line text-ink-muted">{c.texto}</p>}
          {c.link && (
            <a href={c.link} target="_blank" rel="noopener noreferrer" className={BOTAO_CLASS}>
              Abrir guia ilustrado →
            </a>
          )}
        </div>
      );
  }
}

function CartaoTopico({ t, aberto, alternar }: { t: Topico; aberto: boolean; alternar: () => void }) {
  const { rotulo, icone: Icone } = TIPOS[t.tipo];
  return (
    <li id={t.slug} className="scroll-mt-24 rounded-xl border border-border/60 bg-surface shadow-sm">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        className="flex w-full min-h-11 items-start gap-3 p-4 text-left"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Icone size={18} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ink">{t.titulo}</span>
          {t.descricao && <span className="mt-0.5 block text-sm text-ink-muted">{t.descricao}</span>}
          <span className="mt-1 block text-xs text-ink-muted">
            {rotulo} · {t.assunto}
          </span>
        </span>
        <ChevronDown size={18} aria-hidden className={`mt-2 shrink-0 text-ink-muted transition ${aberto ? "rotate-180" : ""}`} />
      </button>
      {aberto && (
        <div className="space-y-3 border-t border-border p-4 text-sm text-ink">
          {t.intro && <p className="text-ink-muted">{t.intro}</p>}
          <Corpo t={t} />
          <div className="pt-1">
            <BotaoCopiarLink url={`${location.origin}${location.pathname}#${t.slug}`} rotulo="Copiar link deste tópico" />
          </div>
        </div>
      )}
    </li>
  );
}

export function CentralAjuda({ topicos }: { topicos: Topico[] }) {
  const [busca, setBusca] = useState("");
  const [assunto, setAssunto] = useState<Assunto | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  const assuntos = useMemo(() => assuntosComTopicos(topicos), [topicos]);
  const resultado = useMemo(() => buscarTopicos(topicos, busca, assunto), [topicos, busca, assunto]);

  // Link direto (#slug): abre o tópico e rola até ele.
  useEffect(() => {
    const abrirDoEndereco = () => {
      const slug = decodeURIComponent(location.hash.slice(1));
      if (!slug || !topicos.some((t) => t.slug === slug)) return;
      setBusca("");
      setAssunto(null);
      setAberto(slug);
      requestAnimationFrame(() => document.getElementById(slug)?.scrollIntoView({ block: "start" }));
    };
    const quadro = requestAnimationFrame(abrirDoEndereco);
    window.addEventListener("hashchange", abrirDoEndereco);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("hashchange", abrirDoEndereco);
    };
  }, [topicos]);

  const alternar = (slug: string) => {
    const novo = aberto === slug ? null : slug;
    setAberto(novo);
    history.replaceState(null, "", novo ? `#${novo}` : location.pathname + location.search);
  };

  const chip = (ativo: boolean) =>
    `min-h-11 shrink-0 rounded-full border px-4 text-sm transition ${
      ativo ? "border-brand bg-brand text-white" : "border-border/80 bg-surface text-ink-muted hover:bg-background hover:text-ink"
    }`;

  return (
    <section className="space-y-4" aria-label="Tutoriais e materiais">
      <div className="relative">
        <Search size={18} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="O que você procura? Ex.: captação, CredSign, IPTU"
          aria-label="Buscar na Central de ajuda"
          className={`${INPUT_CLASS} pl-10 text-base sm:text-sm`}
        />
        {busca && (
          <button
            type="button"
            onClick={() => setBusca("")}
            aria-label="Limpar busca"
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-ink-muted hover:text-ink"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Assuntos">
        <button type="button" aria-pressed={assunto === null} onClick={() => setAssunto(null)} className={chip(assunto === null)}>
          Todos
        </button>
        {assuntos.map((a) => (
          <button key={a} type="button" aria-pressed={assunto === a} onClick={() => setAssunto(a)} className={chip(assunto === a)}>
            {a}
          </button>
        ))}
      </div>

      <p className="text-xs text-ink-muted" aria-live="polite">
        {resultado.length === 1 ? "1 tópico" : `${resultado.length} tópicos`}
        {busca && ` para "${busca}"`}
        {assunto && ` em ${assunto}`}
      </p>

      {resultado.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-surface p-6 text-center text-sm text-ink-muted shadow-sm">
          <p>Nada encontrado. Tente outra palavra ou veja todos os assuntos.</p>
          <button
            type="button"
            onClick={() => {
              setBusca("");
              setAssunto(null);
            }}
            className="mt-3 min-h-11 text-sm font-medium text-brand hover:underline"
          >
            Limpar busca
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {resultado.map((t) => (
            <CartaoTopico key={t.slug} t={t} aberto={aberto === t.slug} alternar={() => alternar(t.slug)} />
          ))}
        </ul>
      )}
    </section>
  );
}
