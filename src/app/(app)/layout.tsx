import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { sair } from "@/app/login/actions";
import { AppShell } from "./app-shell";
import { getPermissoesUsuario } from "@/lib/permissoes";

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

  const { ehCorretor, podeConfigurar, temVenda, temFinanciamento, temLocacao } =
    await getPermissoesUsuario(supabase, user.id, usuario.nivel_acesso);

  type ItemMenu = { href: string; label: string } | { label: string; children: { href: string; label: string }[] };

  const navItems: ItemMenu[] = ehCorretor
    ? [
        { href: "/", label: "Início" },
        { href: "/calculadora", label: "Calculadora de Proporcionalidade" },
        { href: "/cartorio", label: "Simulação de Custas" },
        { href: "/avaliacao-imovel", label: "Avaliação de Imóvel" },
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
                  { href: "/financiamentos?aba=processos", label: "Checklists" },
                  { href: "/financiamentos?aba=custas", label: "Custas de Financiamento" },
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
        { href: "/avaliacao-imovel", label: "Avaliação de Imóvel" },
        { href: "/corretor", label: "Corretor" },
        ...(podeConfigurar
          ? [
              {
                label: "Configurações",
                children: [
                  { href: "/etapas-padrao", label: "Etapas padrão" },
                  { href: "/tarefas-recorrentes", label: "Tarefas recorrentes" },
                  { href: "/onboarding-corretor", label: "Onboarding do Corretor" },
                  { href: "/checklists-financiamento", label: "Checklists de Financiamento" },
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
