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
  const nivelComAcessoTotal = ["diretor", "gerente", "auxiliar"].includes(usuario.nivel_acesso);
  const podeConfigurar = ["diretor", "gerente"].includes(usuario.nivel_acesso);

  let categorias: string[] = [];
  if (!ehCorretor && !nivelComAcessoTotal) {
    const { data: cats } = await supabase
      .from("usuario_categorias")
      .select("categoria")
      .eq("usuario_id", user.id);
    categorias = (cats ?? []).map((c) => c.categoria);
  }

  const temVenda = nivelComAcessoTotal || categorias.includes("venda");
  const temFinanciamento = nivelComAcessoTotal || categorias.includes("financiamento");
  const temLocacao = nivelComAcessoTotal || categorias.includes("locacao");

  type ItemMenu = { href: string; label: string } | { label: string; children: { href: string; label: string }[] };

  const navItems: ItemMenu[] = ehCorretor
    ? [
        { href: "/", label: "Início" },
        { href: "/calculadora", label: "Calculadora de Proporcionalidade" },
        { href: "/cartorio", label: "Simulação de Custas" },
        { href: "/termos-visita", label: "Termo de Visita" },
        { href: "/autorizacoes", label: "Autorização de Venda" },
      ]
    : [
        { href: "/", label: "Início" },
        ...(temVenda
          ? [
              {
                label: "Vendas",
                children: [
                  { href: "/vendas?aba=resumo", label: "Resumo" },
                  { href: "/vendas?aba=andamento", label: "Em andamento" },
                ],
              },
            ]
          : []),
        ...(temFinanciamento
          ? [
              {
                label: "Financiamentos",
                children: [
                  { href: "/financiamentos?aba=resumo", label: "Resumo" },
                  { href: "/financiamentos?aba=andamento", label: "Em andamento" },
                  { href: "/financiamentos?aba=processos", label: "Processos" },
                ],
              },
            ]
          : []),
        ...(temLocacao
          ? [
              {
                label: "Locação",
                children: [
                  { href: "/locacao?aba=resumo", label: "Resumo" },
                  { href: "/locacao?aba=contratos", label: "Contratos" },
                  { href: "/locacao?aba=inadimplencias", label: "Inadimplências" },
                  { href: "/locacao?aba=multa", label: "Multa Rescisória" },
                ],
              },
            ]
          : []),
        { href: "/autorizacoes", label: "Autorização de Venda" },
        { href: "/termos-visita", label: "Termo de Visita" },
        { href: "/calculadora", label: "Calculadora de Proporcionalidade" },
        { href: "/cartorio", label: "Simulação de Custas" },
        { href: "/corretor", label: "Corretor" },
        ...(podeConfigurar
          ? [
              {
                label: "Configurações",
                children: [
                  { href: "/etapas-padrao", label: "Etapas padrão" },
                  { href: "/tarefas-recorrentes", label: "Tarefas recorrentes" },
                  { href: "/onboarding-corretor", label: "Onboarding do Corretor" },
                  { href: "/membros", label: "Membros/Permissões" },
                ],
              },
            ]
          : []),
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
