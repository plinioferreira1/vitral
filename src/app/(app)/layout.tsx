import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { sair } from "@/app/login/actions";
import { AppShell } from "./app-shell";
import { getPermissoesUsuario } from "@/lib/permissoes";
import { TopBar } from "@/components/topbar";
import { hojeISO } from "@/lib/data-br";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  const { ehCorretor, ehSocialMedia, podeConfigurar, temVenda, temFinanciamento, temLocacao } =
    await getPermissoesUsuario(supabase, user.id, usuario.nivel_acesso);

  type ItemMenu = { href: string; label: string } | { label: string; children: { href: string; label: string }[] };

  const navItems: ItemMenu[] = ehSocialMedia
    ? [
        { href: "/", label: "Início" },
        {
          label: "Ferramentas",
          children: [
            { href: "/calculadora", label: "Proporcionalidade" },
            { href: "/calculadora-data", label: "Datas" },
            { href: "/cartorio", label: "Simulação de Custas" },
            { href: "/avaliacao-imovel", label: "Avaliação de Imóvel" },
          ],
        },
        { href: "/corretor", label: "Onboarding" },
      ]
    : ehCorretor
    ? [
        { href: "/", label: "Início" },
        {
          label: "Documentos",
          children: [
            { href: "/autorizacoes", label: "Autorização de Venda" },
            { href: "/propostas", label: "Carta Proposta" },
            { href: "/termos-visita", label: "Termo de Visita" },
          ],
        },
        {
          label: "Ferramentas",
          children: [
            { href: "/calculadora", label: "Proporcionalidade" },
            { href: "/calculadora-data", label: "Datas" },
            { href: "/cartorio", label: "Simulação de Custas" },
            { href: "/avaliacao-imovel", label: "Avaliação de Imóvel" },
          ],
        },
      ]
    : [
        { href: "/", label: "Início" },
        ...(temVenda
          ? [
              {
                label: "Vendas",
                children: [
                  { href: "/vendas?aba=resumo", label: "Visão Geral" },
                  { href: "/vendas?aba=andamento", label: "Processos" },
                ],
              },
            ]
          : []),
        ...(temFinanciamento
          ? [
              {
                label: "Financiamentos",
                children: [
                  { href: "/financiamentos?aba=resumo", label: "Visão Geral" },
                  { href: "/financiamentos?aba=andamento", label: "Processos" },
                  { href: "/financiamentos?aba=processos", label: "Checklists" },
                  { href: "/financiamentos?aba=custas", label: "Simulação de Custas" },
                ],
              },
            ]
          : []),
        ...(temLocacao
          ? [
              {
                label: "Locação",
                children: [
                  { href: "/locacao?aba=resumo", label: "Visão Geral" },
                  { href: "/locacao?aba=contratos", label: "Contratos" },
                  { href: "/locacao?aba=inadimplencias", label: "Inadimplências" },
                  { href: "/locacao?aba=multa", label: "Multa Rescisória" },
                ],
              },
            ]
          : []),
        {
          label: "Documentos",
          children: [
            { href: "/autorizacoes", label: "Autorização de Venda" },
            { href: "/propostas", label: "Carta Proposta" },
            { href: "/termos-visita", label: "Termo de Visita" },
          ],
        },
        {
          label: "Ferramentas",
          children: [
            { href: "/calculadora", label: "Proporcionalidade" },
            { href: "/calculadora-data", label: "Datas" },
            { href: "/cartorio", label: "Simulação de Custas" },
            { href: "/avaliacao-imovel", label: "Avaliação de Imóvel" },
          ],
        },
        { href: "/corretor", label: "Onboarding" },
        ...(podeConfigurar ? [{ href: "/relatorio-semanal", label: "Relatório Semanal" }] : []),
        ...(podeConfigurar
          ? [
              {
                label: "Configurações",
                children: [
                  { href: "/etapas-padrao", label: "Etapas padrão" },
                  { href: "/tarefas-recorrentes", label: "Tarefas recorrentes" },
                  { href: "/onboarding-corretor", label: "Onboarding do Corretor" },
                  { href: "/checklists-financiamento", label: "Checklists de Financiamento" },
                  { href: "/google-agenda", label: "Google Agenda" },
                  { href: "/tutoriais", label: "Tutoriais" },
                  { href: "/membros", label: "Membros/Permissões" },
                ],
              },
            ]
          : []),
      ];

  const hoje = hojeISO();
  const { count: contagemAtrasados } = await supabase
    .from("etapas")
    .select("id, processos!inner(status)", { count: "exact", head: true })
    .in("status", ["pendente", "em_andamento"])
    .lt("data_prevista", hoje)
    .not("processos.status", "in", "(concluido,cancelado)");

  const dataHojeBruta = format(new Date(`${hoje}T00:00:00`), "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });
  const dataHojeFormatada = dataHojeBruta.charAt(0).toUpperCase() + dataHojeBruta.slice(1);

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
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8 sm:py-8">
          <div className="mb-6">
            <TopBar dataFormatada={dataHojeFormatada} contagemAtrasados={contagemAtrasados ?? 0} />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
