"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
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

  const iniciais = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const logo = (
    <div className="flex items-center gap-2 px-2">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center">
        <img
          src="/brand/vitral-icone.png"
          alt=""
          aria-hidden="true"
          className="h-8 w-8 object-contain"
        />
      </div>
      <p className="truncate text-sm font-serif font-semibold leading-tight text-ink">{tenantName}</p>
    </div>
  );

  const nav = (
    <nav className="flex-1 space-y-0.5">
      {navItems.map((item) => {
        const ativo = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuAberto(false)}
            className={`block rounded-md px-2.5 py-2 text-sm transition ${
              ativo
                ? "bg-background font-medium text-ink"
                : "text-ink-muted hover:bg-background hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
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
