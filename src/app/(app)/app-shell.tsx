"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

function ehAtivo(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  const [caminho] = href.split("?");
  return pathname === caminho || pathname.startsWith(`${caminho}/`);
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

  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(() => {
    const abertos = new Set<string>();
    navItems.forEach((item) => {
      if (item.children?.some((c) => ehAtivo(pathname, c.href))) abertos.add(item.label);
    });
    return abertos;
  });

  const alternarGrupo = (label: string) => {
    setGruposAbertos((prev) => {
      const novo = new Set(prev);
      if (novo.has(label)) novo.delete(label);
      else novo.add(label);
      return novo;
    });
  };

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
    <nav className="flex-1 space-y-0.5">
      {navItems.map((item) => {
        if (!item.children) {
          const ativo = ehAtivo(pathname, item.href!);
          return (
            <Link
              key={item.label}
              href={item.href!}
              onClick={() => setMenuAberto(false)}
              className={`block rounded-md px-2.5 py-2 text-sm transition ${
                ativo
                  ? "bg-brand-soft font-medium text-brand"
                  : "text-ink-muted hover:bg-background hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        }

        const aberto = gruposAbertos.has(item.label);
        const algumFilhoAtivo = item.children.some((c) => ehAtivo(pathname, c.href));

        return (
          <div key={item.label}>
            <button
              type="button"
              onClick={() => alternarGrupo(item.label)}
              className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm transition ${
                algumFilhoAtivo ? "font-medium text-brand" : "text-ink-muted hover:bg-background hover:text-ink"
              }`}
            >
              {item.label}
              <svg
                width="10"
                height="10"
                viewBox="0 0 12 12"
                className={`transition-transform ${aberto ? "rotate-90" : ""}`}
              >
                <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {aberto && (
              <div className="ml-2 space-y-0.5 border-l border-border pl-2">
                {item.children.map((child) => {
                  const ativo = ehAtivo(pathname, child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setMenuAberto(false)}
                      className={`block rounded-md px-2.5 py-1.5 text-sm transition ${
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
        className="flex items-center gap-2 rounded-md px-2.5 py-1.5 transition hover:bg-background"
      >
        {userFoto ? (
          <img src={userFoto} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-serif font-semibold text-white">
            {iniciais || "?"}
          </div>
        )}
        <span className="min-w-0">
          <p className="truncate text-xs font-medium text-ink">{userName}</p>
          <p className="truncate text-xs text-ink-muted">{userCargo || userPerfil}</p>
        </span>
      </Link>
      <form action={sairAction}>
        <button
          type="submit"
          className="mt-1 w-full rounded-md px-2.5 py-1.5 text-left text-xs text-ink-muted transition hover:bg-background hover:text-ink"
        >
          Sair
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Desktop: sidebar fixa */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface px-3 py-4 md:flex">
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
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M2.5 5h15M2.5 10h15M2.5 15h15"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
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
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 2l12 12M14 2L2 14"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
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
