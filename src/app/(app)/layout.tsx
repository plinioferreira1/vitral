import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { sair } from "@/app/login/actions";
import { AppShell } from "./app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nome, perfil, tenant_id, cargo, foto_url, nivel_acesso")
    .eq("id", user.id)
    .single();

  if (!usuario?.tenant_id) redirect("/onboarding");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("nome")
    .eq("id", usuario.tenant_id)
    .single();

  const ehCorretor = usuario.nivel_acesso === "corretor";

  const navItems = ehCorretor
    ? [
        { href: "/", label: "Início" },
        { href: "/calculadora", label: "Calculadora de Proporcionalidade" },
        { href: "/cartorio", label: "Simulação de Custas" },
        { href: "/termos-visita", label: "Termo de Visita" },
        { href: "/autorizacoes", label: "Autorização de Venda" },
      ]
    : [
        { href: "/", label: "Início" },
        {
          label: "Processos",
          children: [
            { href: "/processos?categoria=venda", label: "Vendas" },
            { href: "/processos?categoria=financiamento", label: "Financiamentos" },
          ],
        },
        { href: "/termos-visita", label: "Termo de Visita" },
        { href: "/autorizacoes", label: "Autorização de Venda" },
        {
          label: "Locação",
          children: [
            { href: "/locacao?aba=resumo", label: "Resumo" },
            { href: "/locacao?aba=contratos", label: "Contratos" },
            { href: "/locacao?aba=inadimplencias", label: "Inadimplências" },
          ],
        },
        { href: "/calendario", label: "Calendário" },
        { href: "/calculadora", label: "Calculadora de Proporcionalidade" },
        { href: "/cartorio", label: "Simulação de Custas" },
        {
          label: "Configurações",
          children: [
            { href: "/etapas-padrao", label: "Etapas padrão" },
            { href: "/membros", label: "Membros/Permissões" },
          ],
        },
      ];

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <AppShell
        navItems={navItems}
        tenantName={tenant?.nome ?? "Vitral"}
        userName={usuario.nome}
        userPerfil={usuario.perfil}
        userCargo={usuario.cargo}
        userFoto={usuario.foto_url}
        sairAction={sair}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
