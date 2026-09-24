"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Home,
  Tag,
  Landmark,
  Building2,
  FileSignature,
  FileText,
  ClipboardCheck,
  Calculator,
  CalendarDays,
  TrendingUp,
  Search,
  BookOpen,
  BarChart3,
  Settings,
  ListChecks,
  Repeat,
  GraduationCap,
  ClipboardList,
  CalendarClock,
  BookMarked,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

interface SubNavItem {
  href: string;
  label: string;
}

interface NavItem {
  href?: string;
  label: string;
  children?: SubNavItem[];
}

interface Props {
  navItems: NavItem[];
  tenantName: string;
  userName: string;
  userPerfil: string;
  userCargo: string | null;
  userFoto: string | null;
  sairAction: () => Promise<void>;
}

// Ícone por prefixo de rota — cobre os itens de nível superior do
// menu (os subitens dentro de um grupo não têm ícone próprio, igual
// na referência visual).
const ICONES: { prefixo: string; Icone: LucideIcon }[] = [
  { prefixo: "/vendas", Icone: Tag },
  { prefixo: "/financiamentos", Icone: Landmark },
  { prefixo: "/locacao", Icone: Building2 },
  { prefixo: "/autorizacoes", Icone: FileSignature },
  { prefixo: "/propostas", Icone: FileText },
  { prefixo: "/termos-visita", Icone: ClipboardCheck },
  { prefixo: "/calculadora-data", Icone: CalendarDays },
  { prefixo: "/calculadora", Icone: Calculator },
  { prefixo: "/cartorio", Icone: TrendingUp },
  { prefixo: "/avaliacao-imovel", Icone: Search },
  { prefixo: "/corretor", Icone: BookOpen },
  { prefixo: "/relatorio-semanal", Icone: BarChart3 },
  { prefixo: "/etapas-padrao", Icone: ListChecks },
  { prefixo: "/tarefas-recorrentes", Icone: Repeat },
  { prefixo: "/onboarding-corretor", Icone: GraduationCap },
  { prefixo: "/checklists-financiamento", Icone: ClipboardList },
  { prefixo: "/google-agenda", Icone: CalendarClock },
  { prefixo: "/tutoriais", Icone: BookMarked },
  { prefixo: "/membros", Icone: Users },
  { prefixo: "/configuracoes", Icone: Settings },
];

function iconePara(hrefOuLabel: string): LucideIcon {
  if (hrefOuLabel === "/") return Home;
  if (hrefOuLabel === "Configurações") return Settings;
  const achado = ICONES.find((i) => hrefOuLabel.startsWith(i.prefixo));
  return achado?.Icone ?? FileText;
}

// Compara caminho E os parâmetros de query presentes no href (ex:
// "/locacao?aba=inadimplencias") — só comparar o caminho fazia
// "Contratos" e "Inadimplências" (mesmo /locacao, aba diferente)
// ficarem os dois marcados como ativos ao mesmo tempo.
function ehAtivo(pathname: string, href: string, queryAtual: URLSearchParams) {
  if (href === "/") return pathname === "/";
  const [caminho, queryString] = href.split("?");
  const caminhoBate = pathname === caminho || pathname.startsWith(`${caminho}/`);
  if (!caminhoBate) return false;
  if (!queryString) return true;

  const queryHref = new URLSearchParams(queryString);
  for (const [chave, valor] of queryHref.entries()) {
    if (queryAtual.get(chave) !== valor) return false;
  }
  return true;
}

export function AppShell({
  navItems,
  tenantName,
  userName,
  userPerfil,
  userCargo,
  userFoto,
  sairAction,
}: Props) {
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(() => {
    const abertos = new Set<string>();
    navItems.forEach((item) => {
      if (item.children?.some((c) => ehAtivo(pathname, c.href, searchParams))) abertos.add(item.label);
    });
    return abertos;
  });

  const alternarGrupo = (label: string) => {
    setGruposAbertos((prev) => (prev.has(label) ? new Set() : new Set([label])));
  };

  // Fecha qualquer grupo aberto ao clicar fora do menu de navegação
  // (em qualquer outro lugar da página).
  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      const alvo = e.target as Element;
      if (!alvo.closest("[data-nav-root]")) {
        setGruposAbertos(new Set());
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  const iniciais = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const logo = (
    <Link
      href="/"
      onClick={() => setMenuAberto(false)}
      className="flex w-full items-center justify-center rounded-md px-2 py-1 transition hover:bg-background"
      aria-label={tenantName}
    >
      <img
        src="/brand/sacra-logo-bordo.png"
        alt={tenantName}
        className="h-9 w-auto object-contain"
      />
    </Link>
  );

  const nav = (
    <nav data-nav-root className="flex-1 space-y-0.5">
      {navItems.map((item) => {
        if (!item.children) {
          const ativo = ehAtivo(pathname, item.href!, searchParams);
          const Icone = iconePara(item.href!);
          return (
            <Link
              key={item.label}
              href={item.href!}
              onClick={() => {
                setMenuAberto(false);
                setGruposAbertos(new Set());
              }}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                ativo
                  ? "bg-brand-soft font-medium text-brand"
                  : "text-ink-muted hover:bg-background hover:text-ink"
              }`}
            >
              <Icone size={17} strokeWidth={2} className="shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        }

        const aberto = gruposAbertos.has(item.label);
        const algumFilhoAtivo = item.children.some((c) => ehAtivo(pathname, c.href, searchParams));
        const Icone = iconePara(item.label);

        return (
          <div key={item.label}>
            <button
              type="button"
              onClick={() => alternarGrupo(item.label)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                algumFilhoAtivo
                  ? "bg-brand-soft font-medium text-brand"
                  : "text-ink-muted hover:bg-background hover:text-ink"
              }`}
            >
              <Icone size={17} strokeWidth={2} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
              <ChevronRight
                size={14}
                strokeWidth={2}
                className={`shrink-0 transition-transform ${aberto ? "rotate-90" : ""}`}
              />
            </button>
            {aberto && (
              <div className="ml-[1.15rem] space-y-0.5 border-l border-border pl-3.5 pt-0.5">
                {item.children.map((child) => {
                  const ativo = ehAtivo(pathname, child.href, searchParams);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setMenuAberto(false)}
                      className={`block rounded-lg px-2.5 py-1.5 text-sm transition ${
                        ativo
                          ? "bg-brand-soft font-medium text-brand"
                          : "text-ink-muted hover:bg-background hover:text-ink"
                      }`}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  const rodape = (
    <div className="border-t border-border pt-3">
      <Link
        href="/perfil"
        onClick={() => setMenuAberto(false)}
        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition hover:bg-background"
      >
        {userFoto ? (
          <img src={userFoto} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
            {iniciais || "?"}
          </div>
        )}
        <span className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{userName}</p>
          <p className="truncate text-xs text-ink-muted">{userCargo || userPerfil}</p>
        </span>
      </Link>
      <form action={sairAction}>
        <button
          type="submit"
          className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs text-ink-muted transition hover:bg-background hover:text-ink"
        >
          <LogOut size={14} strokeWidth={2} />
          Sair
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Desktop: sidebar fixa */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-4 md:flex">
        <div className="mb-6">{logo}</div>
        {nav}
        {rodape}
      </aside>

      {/* Mobile: barra superior + menu deslizante */}
      <div className="flex flex-1 flex-col md:hidden">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          {logo}
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMenuAberto(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-background"
          >
            <Menu size={20} strokeWidth={1.75} />
          </button>
        </header>

        {menuAberto && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setMenuAberto(false)}
              aria-hidden="true"
            />
            <div className="relative flex w-64 max-w-[80%] flex-col bg-surface px-3 py-4 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                {logo}
                <button
                  type="button"
                  aria-label="Fechar menu"
                  onClick={() => setMenuAberto(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-background"
                >
                  <X size={16} strokeWidth={1.75} />
                </button>
              </div>
              {nav}
              {rodape}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
