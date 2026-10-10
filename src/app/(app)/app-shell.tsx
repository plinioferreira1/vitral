"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
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
  Scale,
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
  HelpCircle,
  X,
  ChevronRight,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { hrefAtivoMenu } from "@/lib/menu";
import { BotaoEnviar } from "@/components/botao-enviar";

interface SubNavItem {
  href?: string;
  label: string;
  // Um subitem pode ele mesmo ser um subgrupo (ex: "Movimentações" dentro
  // de "Financeiro"), daí ter os próprios filhos em vez de um href direto.
  children?: SubNavItem[];
}

interface NavItem {
  href?: string;
  label: string;
  children?: SubNavItem[];
}

// Algum item, no nível informado ou em qualquer subgrupo abaixo dele, bate
// com a rota atual — usado pra manter o grupo/subgrupo certo destacado e
// aberto mesmo quando a rota ativa está dois níveis abaixo.
function algumDescendenteAtivo(itens: SubNavItem[] | undefined, hrefAtivo: string | undefined): boolean {
  return !!hrefAtivo && !!itens?.some((item) => item.href === hrefAtivo || algumDescendenteAtivo(item.children, hrefAtivo));
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
  { prefixo: "/avaliacoes", Icone: Scale },
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
  if (hrefOuLabel === "/corretor") return HelpCircle;
  if (hrefOuLabel === "/calendario") return CalendarDays;
  const porLabel: Record<string, LucideIcon> = {
    Vendas: Tag,
    Financiamentos: Landmark,
    Locação: Building2,
    Documentos: FileSignature,
    Ferramentas: Calculator,
    Financeiro: Wallet,
    Configurações: Settings,
    Relatórios: BarChart3,
  };
  if (porLabel[hrefOuLabel]) return porLabel[hrefOuLabel];
  const achado = ICONES.find((i) => hrefOuLabel.startsWith(i.prefixo));
  return achado?.Icone ?? FileText;
}

// Links do menu usam navegação de documento para que o conteúdo e a URL
// sejam carregados juntos, sem depender de uma transição RSC pendente.
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
  const menuRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menuAberto || !menu) return;
    menu.showModal();
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 768px)");
    const fecharNoDesktop = () => { if (desktop.matches) setMenuAberto(false); };
    desktop.addEventListener("change", fecharNoDesktop);
    return () => {
      menu.close();
      document.body.style.overflow = overflowAnterior;
      desktop.removeEventListener("change", fecharNoDesktop);
    };
  }, [menuAberto]);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hrefAtivo = hrefAtivoMenu(navItems as import("@/lib/menu").ItemMenu[], pathname, searchParams);

  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(() => {
    const abertos = new Set<string>();
    navItems.forEach((item) => {
      if (algumDescendenteAtivo(item.children, hrefAtivo)) abertos.add(item.label);
    });
    return abertos;
  });

  // Subgrupos (2º nível, ex: "Movimentações" dentro de "Financeiro"),
  // identificados por "Pai>Subgrupo" já que o mesmo label de subgrupo
  // pode em tese existir sob pais diferentes.
  const [subGruposAbertos, setSubGruposAbertos] = useState<Set<string>>(() => {
    const abertos = new Set<string>();
    navItems.forEach((item) => {
      item.children?.forEach((filho) => {
        if (filho.children && algumDescendenteAtivo(filho.children, hrefAtivo)) {
          abertos.add(`${item.label}>${filho.label}`);
        }
      });
    });
    return abertos;
  });

  const alternarGrupo = (label: string) => {
    setGruposAbertos((prev) => (prev.has(label) ? new Set() : new Set([label])));
    setSubGruposAbertos(new Set());
  };

  const alternarSubGrupo = (chave: string) => {
    setSubGruposAbertos((prev) => (prev.has(chave) ? new Set() : new Set([chave])));
  };

  // Fecha qualquer grupo aberto ao clicar fora do menu de navegação
  // (em qualquer outro lugar da página).
  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      const alvo = e.target as Element;
      if (!alvo.closest("[data-nav-root]")) {
        setGruposAbertos(new Set());
        setSubGruposAbertos(new Set());
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
    // eslint-disable-next-line @next/next/no-html-link-for-pages -- Navegação completa intencional para evitar transições presas no menu.
    <a
      href="/"
      onClick={() => setMenuAberto(false)}
      className="flex w-full items-center justify-center rounded-md px-2 py-1 transition hover:bg-background"
      aria-label={tenantName}
    >
      <Image
        src="/brand/sacra-logo-bordo.png"
        alt={tenantName}
        width={121}
        height={36}
        priority
        className="h-9 w-auto object-contain"
      />
    </a>
  );

  const nav = (
    <nav data-nav-root aria-label="Menu principal" className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain pr-1 [&_a]:min-h-11 [&_a]:content-center [&_button]:min-h-11 md:[&_a]:min-h-0 md:[&_button]:min-h-0">
      {navItems.map((item) => {
        if (!item.children) {
          const ativo = item.href === hrefAtivo;
          const Icone = iconePara(item.href!);
          return (
            <a
              key={item.label}
              aria-current={ativo ? "page" : undefined}
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
              <span className="min-w-0 flex-1">{item.label}</span>
            </a>
          );
        }

        const aberto = gruposAbertos.has(item.label);
        const algumFilhoAtivo = algumDescendenteAtivo(item.children, hrefAtivo);
        const Icone = iconePara(item.label);

        return (
          <div key={item.label}>
            <button
              type="button"
              aria-expanded={aberto}
              onClick={() => alternarGrupo(item.label)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                algumFilhoAtivo
                  ? "bg-brand-soft font-medium text-brand"
                  : "text-ink-muted hover:bg-background hover:text-ink"
              }`}
            >
              <Icone size={17} strokeWidth={2} className="shrink-0" />
              <span className="min-w-0 flex-1 text-left">{item.label}</span>
              <ChevronRight
                size={14}
                strokeWidth={2}
                className={`shrink-0 transition-transform ${aberto ? "rotate-90" : ""}`}
              />
            </button>
            {aberto && (
              <div className="ml-[1.15rem] space-y-0.5 border-l border-border pl-3.5 pt-0.5">
                {item.children.map((child) => {
                  // Subgrupo de 2º nível (ex: "Movimentações"/"Cadastros"
                  // dentro de "Financeiro") — tem os próprios filhos em vez
                  // de um href direto.
                  if (child.children) {
                    const chaveSubgrupo = `${item.label}>${child.label}`;
                    const subAberto = subGruposAbertos.has(chaveSubgrupo);
                    const algumNetoAtivo = algumDescendenteAtivo(child.children, hrefAtivo);
                    return (
                      <div key={child.label}>
                        <button
                          type="button"
                          aria-expanded={subAberto}
                          onClick={() => alternarSubGrupo(chaveSubgrupo)}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition ${
                            algumNetoAtivo
                              ? "font-medium text-brand"
                              : "text-ink-muted hover:text-ink"
                          }`}
                        >
                          <span className="min-w-0 flex-1 text-left">{child.label}</span>
                          <ChevronRight
                            size={12}
                            strokeWidth={2}
                            className={`shrink-0 transition-transform ${subAberto ? "rotate-90" : ""}`}
                          />
                        </button>
                        {subAberto && (
                          <div className="ml-2 space-y-0.5 border-l border-border pl-3">
                            {child.children.map((neto) => {
                              const ativo = neto.href === hrefAtivo;
                              return (
                                <a
                                  key={neto.href}
                                  aria-current={ativo ? "page" : undefined}
                                  href={neto.href!}
                                  onClick={() => setMenuAberto(false)}
                                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition ${
                                    ativo
                                      ? "bg-brand-soft font-medium text-brand"
                                      : "text-ink-muted hover:bg-background hover:text-ink"
                                  }`}
                                >
                                  <span className="min-w-0 flex-1">{neto.label}</span>
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const ativo = child.href === hrefAtivo;
                  return (
                    <a
                      key={child.href}
                      aria-current={ativo ? "page" : undefined}
                      href={child.href!}
                      onClick={() => setMenuAberto(false)}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition ${
                        ativo
                          ? "bg-brand-soft font-medium text-brand"
                          : "text-ink-muted hover:bg-background hover:text-ink"
                      }`}
                    >
                      <span className="min-w-0 flex-1">{child.label}</span>
                    </a>
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
    <div className="shrink-0 border-t border-border bg-surface pt-3">
      <a
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
      </a>
      <form action={sairAction}>
        <BotaoEnviar
          className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs text-ink-muted transition hover:bg-background hover:text-ink"
        >
          <LogOut size={14} strokeWidth={2} />
          Sair
        </BotaoEnviar>
      </form>
    </div>
  );

  return (
    <>
      {/* Desktop: sidebar fixa */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-hidden border-r border-border bg-surface px-3 py-4 md:flex">
        <div className="mb-4 shrink-0">{logo}</div>
        {nav}
        {rodape}
      </aside>

      {/* Mobile: barra superior + menu deslizante */}
      <div className="shrink-0 md:hidden">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          {logo}
          <button
            type="button"
            aria-label="Abrir menu"
            aria-haspopup="dialog"
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink hover:bg-background"
          >
            <Menu size={20} strokeWidth={1.75} />
          </button>
        </header>

        <dialog
          ref={menuRef}
          aria-label="Menu principal"
          onCancel={() => setMenuAberto(false)}
          onClose={() => setMenuAberto(false)}
          onClick={(event) => { if (event.target === menuRef.current) setMenuAberto(false); }}
          className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-black/35"
        >
          {menuAberto && <div className="flex h-full w-[min(320px,88vw)] flex-col overflow-hidden bg-surface px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-xl">
            <div className="mb-4 flex shrink-0 items-center justify-between gap-2">
              {logo}
              <button type="button" autoFocus aria-label="Fechar menu" onClick={() => setMenuAberto(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-background">
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>
            {nav}
            {rodape}
          </div>}
        </dialog>
      </div>
    </>
  );
}
