import { montarMenu } from "@/lib/menu";
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
import { liberadoParaNivel } from "@/lib/em-finalizacao";
import { Suspense } from "react";

async function TopBarComDados({ hoje, nivelAcesso }: { hoje: string; nivelAcesso: string }) {
  const supabase = await createClient();
  const limiteNotificacoes = format(addDays(parseISO(hoje), 7), "yyyy-MM-dd");
  const [{ data: etapasNotificacao }, { data: avisosFerias }, { data: notificacoesDispensadas }] =
    await Promise.all([
      supabase
        .from("etapas")
        .select(
          "id, nome, data_prevista, processo_id, processos!inner(id, status, numero_processo, imoveis(endereco))",
        )
        .in("status", ["pendente", "em_andamento"])
        .lte("data_prevista", limiteNotificacoes)
        .not("processos.status", "in", "(concluido,cancelado,arquivado)")
        .order("data_prevista", { ascending: true })
        .limit(100),
      liberadoParaNivel("ferias", nivelAcesso)
        ? supabase
            .from("ferias_notificacoes")
            .select("id, solicitacao_id, titulo, mensagem, criado_em")
            .is("lida_em", null)
            .order("criado_em", { ascending: false })
            .limit(20)
        : Promise.resolve({
            data: [] as {
              id: string;
              solicitacao_id: string | null;
              titulo: string;
              mensagem: string;
              criado_em: string;
            }[],
          }),
      supabase.from("notificacoes_dispensadas").select("etapa_id, data_prevista"),
    ]);

  const chavesDispensadas = new Set(
    (notificacoesDispensadas ?? []).map(
      (notificacao) => `${notificacao.etapa_id}:${notificacao.data_prevista}`,
    ),
  );

  const notificacoes: NotificacaoTopBar[] = (etapasNotificacao ?? [])
    .filter(
      (etapa) => !chavesDispensadas.has(`${etapa.id}:${etapa.data_prevista}`),
    )
    .map((etapa) => {
      const processo = etapa.processos as unknown as {
        id: string;
        numero_processo: string;
        imoveis: { endereco: string } | null;
      };
      const dias = differenceInCalendarDays(
        parseISO(etapa.data_prevista!),
        parseISO(hoje),
      );
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
      } as NotificacaoTopBar;
    });

  for (const aviso of [...(avisosFerias ?? [])].reverse()) {
    notificacoes.unshift({
      id: aviso.id,
      processoId: "",
      etapa: aviso.titulo,
      contexto: aviso.mensagem,
      prazo: `Férias · ${format(new Date(aviso.criado_em), "dd/MM/yyyy")}`,
      tipo: "proxima",
      href: aviso.solicitacao_id ? `/ferias/${aviso.solicitacao_id}` : "/ferias",
    });
  }

  const dataHojeBruta = format(
    new Date(`${hoje}T00:00:00`),
    "EEEE, d 'de' MMMM 'de' yyyy",
    { locale: ptBR },
  );
  const dataHojeFormatada =
    dataHojeBruta.charAt(0).toUpperCase() + dataHojeBruta.slice(1);

  return (
    <TopBar
      dataFormatada={dataHojeFormatada}
      notificacoes={notificacoes}
      totalNotificacoes={notificacoes.length}
      limparTodasAction={limparTodasNotificacoes}
    />
  );
}

function TopBarCarregando() {
  return (
    <div className="flex h-11 items-center gap-3" aria-label="Carregando cabeçalho" aria-busy="true">
      <div className="h-11 min-w-0 flex-1 animate-pulse rounded-lg bg-border/45" />
      <div className="h-11 w-11 animate-pulse rounded-lg bg-border/45" />
      <div className="hidden h-11 w-56 animate-pulse rounded-lg bg-border/45 sm:block" />
    </div>
  );
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { user, usuario } = await getUsuarioAtual();

  if (!user) redirect("/login");
  if (usuario?.ativo === false) redirect("/acesso-desativado");
  if (!usuario?.tenant_id) redirect("/onboarding");

  const hoje = hojeISO();

  // O menu depende destes dois dados. As notificações são carregadas em uma
  // Suspense separada abaixo, para não atrasarem a navegação nem o conteúdo.
  const [{ data: tenant }, permissoes] = await Promise.all([
    supabase
      .from("tenants")
      .select("nome")
      .eq("id", usuario.tenant_id)
      .single(),
    getPermissoesUsuario(supabase, user.id, usuario.nivel_acesso),
  ]);

  const navItems = montarMenu(permissoes);

  // Aviso deixado pela última ação (sucesso/erro), se houver.
  const aviso = lerAviso((await cookies()).get(COOKIE_AVISO)?.value);

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

      <main className="min-w-0 flex-1">
        <div className="app-content mx-auto max-w-[1600px] px-4 py-5 sm:px-8 sm:py-8">
          <div className="mb-6">
            <Suspense fallback={<TopBarCarregando />}>
              <TopBarComDados hoje={hoje} nivelAcesso={usuario.nivel_acesso} />
            </Suspense>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
