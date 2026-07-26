import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { sair } from "@/app/login/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nome, perfil, tenant_id")
    .eq("id", user.id)
    .single();

  if (!usuario?.tenant_id) redirect("/onboarding");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("nome")
    .eq("id", usuario.tenant_id)
    .single();

  const navItems = [
    { href: "/", label: "Início" },
    { href: "/processos", label: "Processos" },
    { href: "/calendario", label: "Calendário" },
    { href: "/membros", label: "Membros" },
  ];

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="flex w-56 flex-col border-r border-border bg-surface px-3 py-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand">
            <img
              src="/brand/icone-sacra.svg"
              alt=""
              aria-hidden="true"
              className="h-4 w-auto"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-ink">
              {tenant?.nome ?? "Vitral"}
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-2.5 py-1.5 text-sm text-ink-muted transition hover:bg-background hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border pt-3">
          <p className="truncate px-2.5 text-xs font-medium text-ink">{usuario.nome}</p>
          <p className="px-2.5 text-xs capitalize text-ink-muted">{usuario.perfil}</p>
          <form action={sair}>
            <button
              type="submit"
              className="mt-2 w-full rounded-md px-2.5 py-1.5 text-left text-xs text-ink-muted transition hover:bg-background hover:text-ink"
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
