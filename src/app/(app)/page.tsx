import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEventosCalendario } from "@/lib/queries";
import { KanbanComAbas } from "@/components/kanban-com-abas";
import type { CardKanban, CardPrazo } from "@/components/kanban-processos";
import { colunasKanban, etapaAtualPorProcesso } from "@/lib/kanban";
import { getPermissoesUsuario } from "@/lib/permissoes";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { hojeISO } from "@/lib/data-br";
import { liberadoParaNivel } from "@/lib/em-finalizacao";
import { competenciaDe, montarAvisosDebitos, somarMeses, type AvisoDebitos } from "@/lib/debitos/regras";
import { ocorrenciasDaTarefa, type RegraTarefa } from "@/lib/tarefas-recorrentes";
import { alternarTarefaMensal } from "@/app/(app)/locacao/actions";
import { format } from "date-fns";
import { CATEGORIA_LABEL, type CategoriaProcesso } from "@/lib/types";
import { calcularUrgencia, type Urgencia } from "@/lib/alertas";
import { corPrazoFinal } from "@/lib/cor-prazo-final";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import {
  DashboardIndicadores,
  type DashboardIndicadorItem,
  type DashboardIndicadoresDados,
} from "@/components/dashboard-indicadores";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  ClipboardCheck,
  FileSignature,
  FileText,
  ListChecks,
  Check,
  Clock,
  Calendar,
  Plus,
  WalletCards,
  Building2,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BotaoEnviar } from "@/components/botao-enviar";
import type { ReactNode } from "react";

const COR_PRAZO_FUNDO: Record<CardPrazo["cor"], string> = {
  vermelho: "border-rose-200 bg-rose-50",
  amarelo: "border-amber-200 bg-amber-50",
  neutro: "border-border bg-background",
};

const COR_PRAZO_TEXTO: Record<CardPrazo["cor"], string> = {
  vermelho: "text-rose-700",
  amarelo: "text-amber-700",
  neutro: "text-ink-muted",
};

function saudacao(): string {
  const horaBrasilia = new Date().toLocaleString("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    hour12: false,
  });
  const hora = Number(horaBrasilia);
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function Painel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-border/70 bg-surface shadow-sm ${className}`}>
      {children}
    </section>
  );
}

function AtalhoPrincipal({
  href,
  icon: Icon,
  titulo,
  descricao,
  destaque = false,
  prefetch,
}: {
  href: string;
  icon: LucideIcon;
  titulo: string;
  descricao: string;
  destaque?: boolean;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={`group flex min-w-[210px] flex-1 items-center gap-3 rounded-lg border p-3 text-left transition ${
        destaque
          ? "border-brand bg-brand text-white hover:brightness-105"
          : "border-border/70 bg-surface hover:border-border-strong hover:bg-background"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
          destaque ? "bg-white/15 text-white" : "bg-brand-soft text-brand"
        }`}
      >
        <Icon size={18} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-semibold ${destaque ? "text-white" : "text-ink"}`}>
          {titulo}
        </span>
        <span className={`mt-0.5 block truncate text-xs ${destaque ? "text-white/75" : "text-ink-muted"}`}>
          {descricao}
        </span>
      </span>
      <ArrowRight
        size={16}
        className={`shrink-0 transition group-hover:translate-x-0.5 ${
          destaque ? "text-white/70" : "text-ink-muted"
        }`}
      />
    </Link>
  );
}

function CartaoCorretor({
  href,
  icon: Icon,
  titulo,
  descricao,
  destaque = false,
  prefetch,
}: {
  href: string;
  icon: LucideIcon;
  titulo: string;
  descricao: string;
  destaque?: boolean;
  prefetch?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={`group flex min-h-[132px] flex-col justify-between rounded-xl border p-4 shadow-sm transition hover:border-border-strong hover:shadow-md ${
        destaque ? "border-brand/20 bg-brand-soft/50" : "border-border/70 bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Icon size={18} strokeWidth={2.2} />
        </span>
        <ArrowRight size={16} className="text-ink-muted transition group-hover:translate-x-0.5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">{titulo}</p>
        <p className="mt-1 text-xs leading-5 text-ink-muted">{descricao}</p>
      </div>
    </Link>
  );
}

function LinhaVazia({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border bg-background px-4 py-5 text-center text-sm text-ink-muted">
      {children}
    </p>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  // Mesma busca já feita pelo layout nesta renderização — reaproveitada.
  const { user, usuario } = await getUsuarioAtual();

  if (!user || !usuario) return null;

  const ehAdmin = usuario.perfil === "admin";

  const { ehCorretor, temVenda, temFinanciamento, temLocacao, podeConfigurar } = await getPermissoesUsuario(
    supabase,
    user!.id,
    usuario.nivel_acesso
  );

  // Calendário, tarefas do dia e quadros do kanban não dependem um do
  // outro — carregam em paralelo em vez de um após o outro.
  const eventosPromise = getEventosCalendario();
  const referencia = new Date(`${hojeISO()}T00:00:00`);

  type TarefaHoje = {
    tarefaId: string;
    nome: string;
    competencia: string;
    statusId: string | null;
    concluida: boolean;
  };

  const tarefasPromise = (async (): Promise<TarefaHoje[]> => {
    if (!temLocacao) return [];
    const { data: tarefasRaw } = await supabase
      .from("tarefas_mensais")
      .select("id, nome, tipo_regra, dia_fixo, periodicidade");

    const ocorrenciasHoje = (tarefasRaw ?? []).flatMap((t) =>
      ocorrenciasDaTarefa(t as unknown as RegraTarefa, referencia)
        .filter((oc) => oc.data.toISOString().slice(0, 10) === hojeISO())
        .map((oc) => ({ tarefa: t, ocorrencia: oc }))
    );

    if (ocorrenciasHoje.length > 0) {
      const { data: statusRaw } = await supabase
        .from("tarefas_mensais_status")
        .select("id, tarefa_id, competencia, concluida")
        .in(
          "tarefa_id",
          ocorrenciasHoje.map((o) => o.tarefa.id)
        );

      return ocorrenciasHoje.map(({ tarefa, ocorrencia }) => {
        const status = (statusRaw ?? []).find(
          (s) => s.tarefa_id === tarefa.id && s.competencia === ocorrencia.competencia
        );
        return {
          tarefaId: tarefa.id,
          nome: tarefa.nome,
          competencia: ocorrencia.competencia,
          statusId: status?.id ?? null,
          concluida: status?.concluida ?? false,
        };
      });
    }
    return [];
  })();

  type QuadroKanban = {
    categoria: CategoriaProcesso;
    titulo: string;
    colunas: string[];
    cards: CardKanban[];
    colunaPrazos?: { titulo: string; cards: CardPrazo[] };
    stats: { total: number; atrasados: number; venceHoje: number; venceEmBreve: number };
    indicadores: {
      andamento: DashboardIndicadorItem[];
      atrasados: DashboardIndicadorItem[];
      venceHoje: DashboardIndicadorItem[];
      venceEmBreve: DashboardIndicadorItem[];
    };
  };

  const quadrosPromise = (async (): Promise<QuadroKanban[]> => {
    if (!ehAdmin || !usuario.tenant_id) return [];
    const tenantId = usuario.tenant_id;
    async function montarQuadro(categoria: "venda" | "financiamento", titulo: string) {
      const { data: processosRaw } = await supabase
        .from("processos")
        .select(
          "id, numero_processo, status, data_final_contrato, imoveis ( endereco ), comprador:clientes!processos_comprador_id_fkey ( nome ), vendedor:clientes!processos_vendedor_id_fkey ( nome )"
        )
        .eq("categoria", categoria)
        .not("status", "in", "(concluido,cancelado)");

      const processos = (processosRaw ?? []) as unknown as {
        id: string;
        numero_processo: string;
        data_final_contrato: string | null;
        imoveis: { endereco: string } | null;
        comprador: { nome: string } | null;
        vendedor: { nome: string } | null;
      }[];

      const idsProcessos = processos.map((p) => p.id);
      const { data: etapasRaw } =
        idsProcessos.length > 0
          ? await supabase
              .from("etapas")
              .select("processo_id, nome, status, data_prevista")
              .in("processo_id", idsProcessos)
          : { data: [] as { processo_id: string; nome: string; status: string; data_prevista: string | null }[] };

      const atrasosPorProcesso = new Map<string, number>();
      const etapasPorProcesso = new Map<
        string,
        {
          nome: string;
          data: string | null;
          urgencia: Urgencia;
        }[]
      >();
      (etapasRaw ?? []).forEach((e) => {
        const { urgencia } = calcularUrgencia({
          status: e.status as "pendente" | "em_andamento" | "concluida" | "bloqueada",
          data_prevista: e.data_prevista,
        });
        if (!etapasPorProcesso.has(e.processo_id)) etapasPorProcesso.set(e.processo_id, []);
        etapasPorProcesso.get(e.processo_id)!.push({
          nome: e.nome,
          data: e.data_prevista,
          urgencia,
        });
        if (urgencia === "atrasada") {
          atrasosPorProcesso.set(e.processo_id, (atrasosPorProcesso.get(e.processo_id) ?? 0) + 1);
        }
      });

      // Conta, por processo, se alguma etapa está atrasada, vence
      // hoje ou vence nos próximos 7 dias — pra alimentar os
      // indicadores do topo da tela inicial.
      const processosAtrasados = new Set<string>();
      const processosVenceHoje = new Set<string>();
      const processosVenceEmBreve = new Set<string>();
      (etapasRaw ?? []).forEach((e) => {
        const { urgencia } = calcularUrgencia({
          status: e.status as "pendente" | "em_andamento" | "concluida" | "bloqueada",
          data_prevista: e.data_prevista,
        });
        if (urgencia === "atrasada") processosAtrasados.add(e.processo_id);
        if (urgencia === "vence_hoje") processosVenceHoje.add(e.processo_id);
        if (urgencia === "vence_em_breve") processosVenceEmBreve.add(e.processo_id);
      });

      const [colunas, etapaAtualMap] = await Promise.all([
        colunasKanban(supabase, tenantId, categoria),
        etapaAtualPorProcesso(supabase, idsProcessos),
      ]);

      const cards = processos.map((p) => {
        const etapaAtual = etapaAtualMap.get(p.id) ?? null;
        const etapaComPrazo = (etapasPorProcesso.get(p.id) ?? []).find(
          (etapa) => etapa.nome === etapaAtual
        );
        const dataFormatada = etapaComPrazo?.data
          ? format(new Date(`${etapaComPrazo.data}T00:00:00`), "dd/MM/yyyy")
          : null;
        const prazoAtual: CardKanban["prazoAtual"] = !dataFormatada
          ? { texto: "Prazo não definido", tom: "neutro" }
          : etapaComPrazo?.urgencia === "atrasada"
            ? { texto: `Atrasado desde ${dataFormatada}`, tom: "atrasado" }
            : etapaComPrazo?.urgencia === "vence_hoje"
              ? { texto: "Vence hoje", tom: "hoje" }
              : etapaComPrazo?.urgencia === "vence_em_breve"
                ? { texto: `Limite: ${dataFormatada}`, tom: "proximo" }
                : { texto: `Limite: ${dataFormatada}`, tom: "normal" };

        return {
          id: p.id,
          titulo: p.imoveis?.endereco ?? p.numero_processo,
          subtitulo: `${p.comprador?.nome ?? "Não informado"} / ${p.vendedor?.nome ?? "Não informado"}`,
          etapaAtual,
          atrasos: atrasosPorProcesso.get(p.id) ?? 0,
          prazoAtual,
        };
      });

      const cardsPorId = new Map(cards.map((card) => [card.id, card]));
      const itemIndicador = (id: string, detalhe: string): DashboardIndicadorItem | null => {
        const card = cardsPorId.get(id);
        if (!card) return null;
        return {
          id: card.id,
          titulo: card.titulo,
          subtitulo: card.subtitulo,
          detalhe,
          categoria,
          href: `/processos/${card.id}`,
        };
      };

      const ordenarItens = (itens: DashboardIndicadorItem[]) =>
        itens.sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
      const formatarDataEtapa = (data: string | null) =>
        data ? format(new Date(`${data}T00:00:00`), "dd/MM/yyyy") : "sem data";
      const detalheEtapa = (
        id: string,
        urgencia: "atrasada" | "vence_hoje" | "vence_em_breve",
        fallback: string
      ) => {
        const etapa = (etapasPorProcesso.get(id) ?? [])
          .filter((e) => e.urgencia === urgencia)
          .sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""))[0];
        return etapa ? `${etapa.nome} · ${formatarDataEtapa(etapa.data)}` : fallback;
      };

      const indicadores = {
        andamento: ordenarItens(
          cards.map((card) => ({
            id: card.id,
            titulo: card.titulo,
            subtitulo: card.subtitulo,
            detalhe: card.etapaAtual ? `Etapa atual: ${card.etapaAtual}` : "Sem etapa em aberto",
            categoria,
            href: `/processos/${card.id}`,
          }))
        ),
        atrasados: ordenarItens(
          Array.from(processosAtrasados)
            .map((id) => {
              const atrasos = atrasosPorProcesso.get(id) ?? 0;
              return itemIndicador(
                id,
                detalheEtapa(
                  id,
                  "atrasada",
                  `${atrasos} etapa${atrasos === 1 ? "" : "s"} atrasada${atrasos === 1 ? "" : "s"}`
                )
              );
            })
            .filter((item): item is DashboardIndicadorItem => Boolean(item))
        ),
        venceHoje: ordenarItens(
          Array.from(processosVenceHoje)
            .map((id) => itemIndicador(id, detalheEtapa(id, "vence_hoje", "Etapa vence hoje")))
            .filter((item): item is DashboardIndicadorItem => Boolean(item))
        ),
        venceEmBreve: ordenarItens(
          Array.from(processosVenceEmBreve)
            .map((id) => itemIndicador(id, detalheEtapa(id, "vence_em_breve", "Etapa vence nos próximos 7 dias")))
            .filter((item): item is DashboardIndicadorItem => Boolean(item))
        ),
      };

      // Só pra Venda: coluna extra fixa com o prazo final do contrato
      // de cada processo, colorida por urgência.
      let colunaPrazos: { titulo: string; cards: CardPrazo[] } | undefined;
      if (categoria === "venda") {
        const hoje = new Date(`${hojeISO()}T00:00:00`);
        const cardsPrazo = processos
          .filter((p) => p.data_final_contrato)
          .map((p) => {
            const dataFinal = new Date(`${p.data_final_contrato}T00:00:00`);
            const diasRestantes = Math.round((dataFinal.getTime() - hoje.getTime()) / 86_400_000);
            const cor = corPrazoFinal(diasRestantes);
            const subtitulo =
              diasRestantes < 0
                ? `Venceu há ${Math.abs(diasRestantes)} dia${Math.abs(diasRestantes) === 1 ? "" : "s"}`
                : diasRestantes === 0
                  ? "Vence hoje"
                  : `Vence em ${diasRestantes} dia${diasRestantes === 1 ? "" : "s"}`;
            return {
              id: p.id,
              titulo: p.imoveis?.endereco ?? p.numero_processo,
              subtitulo,
              cor,
              diasRestantes,
            };
          })
          .sort((a, b) => a.diasRestantes - b.diasRestantes);

        colunaPrazos = { titulo: "Prazo final do contrato", cards: cardsPrazo };
      }

      return {
        categoria,
        titulo,
        colunas,
        cards,
        colunaPrazos,
        stats: {
          total: processos.length,
          atrasados: processosAtrasados.size,
          venceHoje: processosVenceHoje.size,
          venceEmBreve: processosVenceEmBreve.size,
        },
        indicadores,
      };
    }

    return Promise.all([
      ...(temVenda ? [montarQuadro("venda", "Vendas")] : []),
      ...(temFinanciamento ? [montarQuadro("financiamento", "Financiamento")] : []),
    ]);
  })();

  // Controle de Débitos (Locação): poucos avisos, agrupados, só do que tem pendência.
  const avisosDebitosPromise = (async (): Promise<AvisoDebitos[]> => {
    if (!temLocacao || !liberadoParaNivel("debitos", usuario.nivel_acesso)) return [];
    const competenciaAtual = competenciaDe(hojeISO());
    const desde = somarMeses(competenciaAtual, -6);
    const [{ data: verificacoes }, { data: solicitacoes }, { data: config }] = await Promise.all([
      supabase
        .from("debitos_verificacoes")
        .select("tipo, status, competencia")
        .gte("competencia", desde)
        .lte("competencia", competenciaAtual)
        .in("status", ["pendente", "aguardando_administradora", "com_debitos"]),
      supabase.from("debitos_solicitacoes").select("status, enviado_em, competencia, administradora_id").eq("competencia", competenciaAtual),
      supabase.from("debitos_config").select("dias_alerta_sem_resposta").maybeSingle(),
    ]);
    return montarAvisosDebitos(verificacoes ?? [], solicitacoes ?? [], competenciaAtual, new Date().toISOString(), config?.dias_alerta_sem_resposta ?? 7);
  })();

  const [eventos, tarefasHoje, quadrosKanban, avisosDebitos] = await Promise.all([
    eventosPromise,
    tarefasPromise,
    quadrosPromise,
    avisosDebitosPromise,
  ]);

  const quadroPrazos = quadrosKanban.find((q) => q.colunaPrazos)?.colunaPrazos ?? null;

  const totais = quadrosKanban.reduce(
    (acc, q) => ({
      total: acc.total + q.stats.total,
      atrasados: acc.atrasados + q.stats.atrasados,
      venceHoje: acc.venceHoje + q.stats.venceHoje,
      venceEmBreve: acc.venceEmBreve + q.stats.venceEmBreve,
    }),
    { total: 0, atrasados: 0, venceHoje: 0, venceEmBreve: 0 }
  );

  const juntarIndicadores = (
    chave: keyof QuadroKanban["indicadores"]
  ): DashboardIndicadorItem[] =>
    quadrosKanban
      .flatMap((q) => q.indicadores[chave])
      .sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));

  const indicadoresDashboard: DashboardIndicadoresDados = {
    andamento: {
      valor: totais.total,
      label: "Processos em andamento",
      descricao: "Todos os processos ativos de Vendas e Financiamento.",
      itens: juntarIndicadores("andamento"),
      tom: "neutro",
    },
    atrasados: {
      valor: totais.atrasados,
      label: "Atrasados",
      descricao: "Processos com pelo menos uma etapa vencida e ainda não concluída.",
      itens: juntarIndicadores("atrasados"),
      tom: totais.atrasados > 0 ? "perigo" : "neutro",
    },
    venceHoje: {
      valor: totais.venceHoje,
      label: "Vencendo hoje",
      descricao: "Processos com alguma etapa prevista para hoje.",
      itens: juntarIndicadores("venceHoje"),
      tom: totais.venceHoje > 0 ? "alerta" : "neutro",
    },
    venceEmBreve: {
      valor: totais.venceEmBreve,
      label: "Vencem em 7 dias",
      descricao: "Processos com etapas vencendo nos próximos 7 dias.",
      itens: juntarIndicadores("venceEmBreve"),
      tom: "neutro",
    },
  };

  const hrefProcessos = temVenda
    ? "/vendas?aba=andamento"
    : temFinanciamento
      ? "/financiamentos?aba=andamento"
      : temLocacao
        ? "/locacao?aba=contratos"
        : "/";

  const hoje = hojeISO();
  const limiteAgenda = new Date(`${hoje}T00:00:00`);
  limiteAgenda.setDate(limiteAgenda.getDate() + 7);
  const limiteAgendaISO = format(limiteAgenda, "yyyy-MM-dd");
  const agendaSemana = eventos
    .filter(
      (evento) =>
        !evento.concluida &&
        !evento.id.startsWith("prazo-contrato-") &&
        evento.data >= hoje &&
        evento.data <= limiteAgendaISO
    )
    .slice(0, 8);

  const corAgenda: Record<CategoriaProcesso, string> = {
    venda: "bg-rose-500",
    financiamento: "bg-indigo-400",
    locacao: "bg-blue-500",
    marketing: "bg-emerald-500",
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-brand/10 bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
              Painel de comando
            </span>
            <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-tight text-ink sm:text-[34px]">
              {saudacao()}, {usuario.nome.split(" ")[0]}.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Um resumo direto do que precisa de atenção hoje: processos em aberto, prazos,
              tarefas e os atalhos mais usados pela operação.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(temVenda || temFinanciamento) && (
              <AtalhoPrincipal
                href="/processos/novo"
                icon={Plus}
                titulo="Novo processo"
                descricao="Venda ou financiamento"
                destaque
              />
            )}
            {temLocacao && !temVenda && !temFinanciamento && (
              <AtalhoPrincipal
                href="/locacao/novo"
                icon={Plus}
                titulo="Novo contrato"
                descricao="Locação"
                destaque
              />
            )}
            {podeConfigurar && (
              <AtalhoPrincipal
                href="/financeiro/lancamentos/novo"
                icon={WalletCards}
                titulo="Lançar financeiro"
                descricao="Despesa ou receita"
              />
            )}
            {ehCorretor && (
              <AtalhoPrincipal
                href="/corretor"
                prefetch={false}
                icon={BookOpen}
                titulo="Central de ajuda"
                descricao="Guias e materiais"
              />
            )}
            <AtalhoPrincipal
              href="/calendario"
              icon={Calendar}
              titulo="Calendário"
              descricao="Prazos e agenda"
            />
            {podeConfigurar && (
              <AtalhoPrincipal
                href="/membros"
                icon={UserPlus}
                titulo="Equipe e permissões"
                descricao="Acessos e permissões"
              />
            )}
          </div>
        </div>
      </section>

      {avisosDebitos.length > 0 && (
        <Painel className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/locacao/debitos" className="text-sm font-semibold text-ink hover:text-brand">
              Controle de Débitos
            </Link>
            {avisosDebitos.map((a) => (
              <Link
                key={a.chave}
                href={a.href}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset hover:opacity-80 ${
                  a.tom === "debito" ? "bg-rose-50 text-rose-800 ring-rose-200" : "bg-amber-50 text-amber-800 ring-amber-200"
                }`}
              >
                {a.texto}
              </Link>
            ))}
          </div>
        </Painel>
      )}

      {ehAdmin && quadrosKanban.length > 0 && (
        <DashboardIndicadores indicadores={indicadoresDashboard} />
      )}

      {ehCorretor && (
        <Painel className="p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <CabecalhoSecao icon={BookOpen} titulo="Área do corretor" />
              <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">
                Atalhos para os documentos, ferramentas e materiais que mais ajudam no atendimento
                e na captação.
              </p>
            </div>
            <Link
              href="/corretor"
              prefetch={false}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-background"
            >
              Abrir onboarding <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <CartaoCorretor
              href="/corretor"
              prefetch={false}
              icon={BookOpen}
              titulo="Central de ajuda"
              descricao="Primeiros passos, tutoriais e materiais de referência."
              destaque
            />
            <CartaoCorretor
              href="/autorizacoes"
              icon={FileSignature}
              titulo="Autorizações de venda"
              descricao="Crie e acompanhe links de assinatura para captação."
            />
            <CartaoCorretor
              href="/propostas"
              icon={FileText}
              titulo="Propostas de compra"
              descricao="Monte propostas de compra para enviar ao cliente."
            />
            <CartaoCorretor
              href="/termos-visita"
              icon={ClipboardCheck}
              titulo="Termos de visita"
              descricao="Registre visitas com assinatura digital."
            />
            <CartaoCorretor
              href="/cartorio"
              icon={Calculator}
              titulo="Simulação de Custas"
              descricao="Calcule ITBI, escritura, registro e taxas para orientar o cliente."
            />
            {liberadoParaNivel("avaliacoes", usuario.nivel_acesso) && (
              <CartaoCorretor
                href="/avaliacoes"
                icon={Building2}
                titulo="Avaliações de imóveis"
                descricao="Estudo comercial de preço e PTAM, com comparáveis, ajustes e PDF."
              />
            )}
          </div>
        </Painel>
      )}

      {(!ehAdmin || quadrosKanban.length === 0) && tarefasHoje.length > 0 && (
        <Painel className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <CabecalhoSecao icon={ListChecks} titulo="Tarefas do dia" />
              <p className="mt-1 text-sm text-ink-muted">Rotinas que vencem hoje.</p>
            </div>
            <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-ink-muted">
              {tarefasHoje.length}
            </span>
          </div>
          <div className="space-y-2">
            {tarefasHoje.map((t) => (
              <form key={`${t.tarefaId}-${t.competencia}`} action={alternarTarefaMensal}>
                <input type="hidden" name="tarefa_id" value={t.tarefaId} />
                <input type="hidden" name="competencia" value={t.competencia} />
                <input type="hidden" name="concluida_atual" value={String(t.concluida)} />
                {t.statusId && <input type="hidden" name="status_id" value={t.statusId} />}
                <BotaoEnviar className="flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-background px-3 py-2 text-left text-sm hover:border-border-strong">
                  <span
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border ${
                      t.concluida ? "border-brand bg-brand text-white" : "border-border-strong bg-surface"
                    }`}
                  >
                    {t.concluida && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className={t.concluida ? "text-ink-muted line-through" : "text-ink"}>{t.nome}</span>
                </BotaoEnviar>
              </form>
            ))}
          </div>
        </Painel>
      )}

      {ehAdmin && (
        <>
          {quadrosKanban.length > 0 && (
            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              <Painel className="min-w-0 self-start p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CabecalhoSecao icon={Building2} titulo="Operação em andamento" />
                    <p className="mt-1 text-sm text-ink-muted">
                      Kanban consolidado para enxergar gargalos sem sair do Início.
                    </p>
                  </div>
                  <Link
                    href={hrefProcessos}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-background"
                  >
                    Ver processos <ArrowRight size={14} />
                  </Link>
                </div>
                <KanbanComAbas
                  quadros={quadrosKanban.map((q) => ({
                    id: q.categoria,
                    titulo: q.titulo,
                    total: q.stats.total,
                    colunas: q.colunas,
                    cards: q.cards,
                  }))}
                />
              </Painel>

              <div className="space-y-4">
                <Painel className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <CabecalhoSecao icon={ListChecks} titulo="Tarefas do dia" />
                      <p className="mt-1 text-sm text-ink-muted">
                        Rotinas que vencem hoje.
                      </p>
                    </div>
                    <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-ink-muted">
                      {tarefasHoje.length}
                    </span>
                  </div>
                  {tarefasHoje.length === 0 ? (
                    <LinhaVazia>Nenhuma tarefa recorrente para hoje.</LinhaVazia>
                  ) : (
                    <div className="space-y-2">
                      {tarefasHoje.map((t) => (
                        <form key={`${t.tarefaId}-${t.competencia}`} action={alternarTarefaMensal}>
                          <input type="hidden" name="tarefa_id" value={t.tarefaId} />
                          <input type="hidden" name="competencia" value={t.competencia} />
                          <input type="hidden" name="concluida_atual" value={String(t.concluida)} />
                          {t.statusId && <input type="hidden" name="status_id" value={t.statusId} />}
                          <BotaoEnviar className="flex w-full items-center gap-2.5 rounded-lg border border-border/60 bg-background px-3 py-2 text-left text-sm hover:border-border-strong">
                            <span
                              className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border ${
                                t.concluida ? "border-brand bg-brand text-white" : "border-border-strong bg-surface"
                              }`}
                            >
                              {t.concluida && <Check size={12} strokeWidth={3} />}
                            </span>
                            <span className={t.concluida ? "text-ink-muted line-through" : "text-ink"}>{t.nome}</span>
                          </BotaoEnviar>
                        </form>
                      ))}
                    </div>
                  )}
                </Painel>

                {quadroPrazos && (
                  <Painel className="p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <CabecalhoSecao icon={Clock} titulo="Prazos finais" />
                        <p className="mt-1 text-sm text-ink-muted">
                          Contratos de venda mais próximos do vencimento.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-muted" aria-label="Legenda dos prazos">
                          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />Vencido</span>
                          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Hoje ou até 7 dias</span>
                          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-stone-400" />Mais de 7 dias</span>
                        </div>
                      </div>
                      <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-ink-muted">
                        {quadroPrazos.cards.length}
                      </span>
                    </div>
                    {quadroPrazos.cards.length === 0 ? (
                      <LinhaVazia>Nenhum prazo cadastrado.</LinhaVazia>
                    ) : (
                      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                        {quadroPrazos.cards.map((card) => (
                          <Link
                            key={card.id}
                            href={`/processos/${card.id}`}
                            className={`flex items-center gap-2.5 rounded-lg border p-3 transition hover:opacity-85 ${
                              COR_PRAZO_FUNDO[card.cor]
                            }`}
                          >
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${
                                card.cor === "vermelho"
                                  ? "bg-rose-500"
                                  : card.cor === "amarelo"
                                    ? "bg-amber-500"
                                    : "bg-stone-400"
                              }`}
                            />
                            <span className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-ink">{card.titulo}</p>
                              <p className={`mt-0.5 text-xs font-medium ${COR_PRAZO_TEXTO[card.cor]}`}>
                                Venda · {card.subtitulo}
                              </p>
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </Painel>
                )}
              </div>
            </div>
          )}

          <Painel className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <CabecalhoSecao icon={Calendar} titulo="Agenda da semana" />
                <p className="mt-1 text-sm text-ink-muted">
                  Próximos compromissos e prazos da operação.
                </p>
              </div>
              <Link
                href="/calendario"
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-background"
              >
                Abrir calendário <ArrowRight size={14} />
              </Link>
            </div>
            {agendaSemana.length === 0 ? (
              <LinhaVazia>Nenhum compromisso previsto para os próximos 7 dias.</LinhaVazia>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {agendaSemana.map((evento) => (
                  <Link
                    key={evento.id}
                    href={evento.href}
                    className="group flex min-w-0 items-start gap-3 rounded-lg border border-border/70 bg-background p-3 transition hover:border-border-strong hover:bg-surface"
                  >
                    <span className="num flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-surface text-ink shadow-sm ring-1 ring-border/70">
                      <b className="text-sm leading-none">{evento.data.slice(8, 10)}</b>
                      <span className="mt-0.5 text-[9px] font-semibold uppercase text-ink-muted">
                        {format(new Date(`${evento.data}T00:00:00`), "MMM")}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-semibold leading-5 text-ink">
                        {evento.titulo.replaceAll("—", ":")}
                      </span>
                      <span className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted">
                        <span className={`h-1.5 w-1.5 rounded-full ${corAgenda[evento.categoria]}`} />
                        {evento.recorrente ? "Tarefa recorrente" : CATEGORIA_LABEL[evento.categoria]}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Painel>
        </>
      )}
    </div>
  );
}
