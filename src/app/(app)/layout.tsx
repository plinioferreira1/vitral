import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { sair } from "@/app/login/actions";
import { AppShell } from "./app-shell";
import { getPermissoesUsuario } from "@/lib/permissoes";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { cookies } from "next/headers";
import { COOKIE_AVISO, lerAviso } from "@/lib/aviso";
import { AvisoTela } from "@/components/aviso-tela";
import { TopBar, type NotificacaoTopBar } from "@/components/topbar";
import { hojeISO } from "@/lib/data-br";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { limparTodasNotificacoes } from "./notificacoes/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { user, usuario } = await getUsuarioAtual();

  if (!user) redirect("/login");
  if (!usuario?.tenant_id) redirect("/onboarding");

  const hoje = hojeISO();
  const limiteNotificacoes = format(addDays(parseISO(hoje), 7), "yyyy-MM-dd");

  // Empresa, permissões e notificações não dependem um do outro.
  const [{ data: tenant }, permissoes, { data: etapasNotificacao }] = await Promise.all([
    supabase.from("tenants").select("nome").eq("id", usuario.tenant_id).single(),
    getPermissoesUsuario(supabase, user.id, usuario.nivel_acesso),
    supabase
      .from("etapas")
      .select(
        "id, nome, data_prevista, processo_id, processos!inner(id, status, numero_processo, imoveis(endereco))"
      )
      .in("status", ["pendente", "em_andamento"])
      .lte("data_prevista", limiteNotificacoes)
      .not("processos.status", "in", "(concluido,cancelado,arquivado)")
      .order("data_prevista", { ascending: true })
      .limit(100),
  ]);

  const { data: notificacoesDispensadas } = await supabase
    .from("notificacoes_dispensadas")
    .select("etapa_id, data_prevista");

  const chavesDispensadas = new Set(
    (notificacoesDispensadas ?? []).map(
      (notificacao) => `${notificacao.etapa_id}:${notificacao.data_prevista}`
    )
  );

  const notificacoes: NotificacaoTopBar[] = (etapasNotificacao ?? [])
    .filter(
      (etapa) =>
        !chavesDispensadas.has(`${etapa.id}:${etapa.data_prevista}`)
    )
    .map((etapa) => {
    const processo = etapa.processos as unknown as {
      id: string;
      numero_processo: string;
      imoveis: { endereco: string } | null;
    };
    const dias = differenceInCalendarDays(parseISO(etapa.data_prevista!), parseISO(hoje));
    return {
      id: etapa.id,
      processoId: processo.id,
      etapa: etapa.nome,
      contexto: processo.imoveis?.endereco ?? processo.numero_processo,
      prazo:
        dias < 0
          ? `Venceu há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? "" : "s"} · ${format(parseISO(etapa.data_prevista!), "dd/MM/yyyy")}`
          : dias === 0
            ? `Vence hoje · ${format(parseISO(etapa.data_prevista!), "dd/MM/yyyy")}`
            : `Vence em ${dias} dia${dias === 1 ? "" : "s"} · ${format(parseISO(etapa.data_prevista!), "dd/MM/yyyy")}`,
      tipo: dias < 0 ? "atrasada" : dias === 0 ? "hoje" : "proxima",
    };
  });

  const { ehCorretor, ehSocialMedia, podeConfigurar, temVenda, temFinanciamento, temLocacao } = permissoes;

  type SubItemMenu = { href: string; label: string } | { label: string; children: { href: string; label: string }[] };
  type ItemMenu = { href: string; label: string } | { label: string; children: SubItemMenu[] };

  const navItems: ItemMenu[] = ehSocialMedia
    ? [
        { href: "/", label: "Início" },
        { href: "/corretor", label: "Onboarding" },
        {
          label: "Ferramentas",
          children: [
            { href: "/calculadora", label: "Proporcionalidade" },
            { href: "/calculadora-data", label: "Datas" },
            { href: "/cartorio", label: "Simulação de Custas" },
            { href: "/avaliacao-imovel", label: "Calculadora de Avaliação" },
          ],
        },
      ]
    : ehCorretor
    ? [
        { href: "/", label: "Início" },
        { href: "/corretor", label: "Onboarding" },
        {
          label: "Documentos",
          children: [
            { href: "/autorizacoes", label: "Autorização de Venda" },
            { href: "/propostas", label: "Carta Proposta" },
            { href: "/termos-visita", label: "Termo de Visita" },
            { href: "/avaliacoes", label: "Avaliação de Imóveis" },
          ],
        },
        {
          label: "Ferramentas",
          children: [
            { href: "/calculadora", label: "Proporcionalidade" },
            { href: "/calculadora-data", label: "Datas" },
            { href: "/cartorio", label: "Simulação de Custas" },
            { href: "/avaliacao-imovel", label: "Calculadora de Avaliação" },
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
                  { href: "/locacao/ficha-cadastral", label: "Ficha Cadastral" },
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
            { href: "/avaliacoes", label: "Avaliação de Imóveis" },
          ],
        },
        {
          label: "Ferramentas",
          children: [
            { href: "/calculadora", label: "Proporcionalidade" },
            { href: "/calculadora-data", label: "Datas" },
            { href: "/cartorio", label: "Simulação de Custas" },
            { href: "/avaliacao-imovel", label: "Calculadora de Avaliação" },
          ],
        },
        { href: "/corretor", label: "Onboarding" },
        ...(podeConfigurar
          ? [
              {
                label: "Financeiro",
                children: [
                  { href: "/financeiro", label: "Resumo" },
                  { href: "/financeiro/contas-a-pagar", label: "A Pagar" },
                  { href: "/financeiro/contas-a-receber", label: "A Receber" },
                  { href: "/financeiro/transferencias", label: "Transferências" },
                  {
                    label: "Cadastros",
                    children: [
                      { href: "/financeiro/contas-bancarias", label: "Bancos" },
                      { href: "/financeiro/cartao-corporativo", label: "Cartões" },
                      { href: "/financeiro/pessoas", label: "Contatos" },
                      { href: "/financeiro/categorias", label: "Categorias" },
                      { href: "/financeiro/configuracoes-email", label: "E-mails" },
                    ],
                  },
                  { href: "/financeiro/relatorios", label: "Relatórios" },
                ],
              },
            ]
          : []),
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

  // Aviso deixado pela última ação (sucesso/erro), se houver.
  const aviso = lerAviso((await cookies()).get(COOKIE_AVISO)?.value);

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

      <AvisoTela aviso={aviso} />

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8 sm:py-8">
          <div className="mb-6">
            <TopBar
              dataFormatada={dataHojeFormatada}
              notificacoes={notificacoes}
              totalNotificacoes={notificacoes.length}
              limparTodasAction={limparTodasNotificacoes}
            />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
