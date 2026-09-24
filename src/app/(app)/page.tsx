import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEventosCalendario } from "@/lib/queries";
import { CalendarioGrid } from "@/components/calendario-grid";
import { KanbanComAbas } from "@/components/kanban-com-abas";
import type { CardKanban, CardPrazo } from "@/components/kanban-processos";
import { colunasKanban, etapaAtualPorProcesso } from "@/lib/kanban";
import { getPermissoesUsuario } from "@/lib/permissoes";
import { hojeISO } from "@/lib/data-br";
import { ocorrenciasDaTarefa, type RegraTarefa } from "@/lib/tarefas-recorrentes";
import { alternarTarefaMensal } from "@/app/(app)/locacao/actions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CategoriaProcesso } from "@/lib/types";
import { calcularUrgencia } from "@/lib/alertas";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { CartaoIndicador } from "@/components/cartao-indicador";
import { TopBar } from "@/components/topbar";
import { addMonths } from "date-fns";
import {
  FileText,
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  ListChecks,
  Check,
  Clock,
  Calendar,
} from "lucide-react";

const COR_PRAZO_FUNDO: Record<CardPrazo["cor"], string> = {
  vermelho: "border-rose-200 bg-rose-50",
  amarelo: "border-amber-200 bg-amber-50",
  verde: "border-emerald-200 bg-emerald-50",
};

const COR_PRAZO_TEXTO: Record<CardPrazo["cor"], string> = {
  vermelho: "text-rose-700",
  amarelo: "text-amber-700",
  verde: "text-emerald-700",
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nome, nivel_acesso, perfil, tenant_id")
    .eq("id", user?.id ?? "")
    .single();

  if (!usuario) return null;

  const ehAdmin = usuario.perfil === "admin";

  const { temVenda, temFinanciamento, temLocacao } = await getPermissoesUsuario(
    supabase,
    user!.id,
    usuario.nivel_acesso
  );

  const eventos = await getEventosCalendario();
  const referencia = mes ? new Date(`${mes}-01T00:00:00`) : new Date(`${hojeISO()}T00:00:00`);
  const mesAnterior = format(addMonths(referencia, -1), "yyyy-MM");
  const proximoMes = format(addMonths(referencia, 1), "yyyy-MM");
  const dataHojeFormatada = format(new Date(`${hojeISO()}T00:00:00`), "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  let tarefasHoje: {
    tarefaId: string;
    nome: string;
    competencia: string;
    statusId: string | null;
    concluida: boolean;
  }[] = [];

  if (temLocacao) {
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

      tarefasHoje = ocorrenciasHoje.map(({ tarefa, ocorrencia }) => {
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
  }

  let quadrosKanban: {
    categoria: CategoriaProcesso;
    titulo: string;
    colunas: string[];
    cards: CardKanban[];
    colunaPrazos?: { titulo: string; cards: CardPrazo[] };
    stats: { total: number; atrasados: number; venceHoje: number; venceEmBreve: number };
  }[] = [];

  if (ehAdmin && usuario.tenant_id) {
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
              .select("processo_id, status, data_prevista")
              .in("processo_id", idsProcessos)
          : { data: [] as { processo_id: string; status: string; data_prevista: string | null }[] };

      const atrasosPorProcesso = new Map<string, number>();
      (etapasRaw ?? []).forEach((e) => {
        const { urgencia } = calcularUrgencia({
          status: e.status as "pendente" | "em_andamento" | "concluida" | "bloqueada",
          data_prevista: e.data_prevista,
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
            const cor: CardPrazo["cor"] =
              diasRestantes <= 15 ? "vermelho" : diasRestantes <= 60 ? "amarelo" : "verde";
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
        cards: processos.map((p) => ({
          id: p.id,
          titulo: p.imoveis?.endereco ?? p.numero_processo,
          subtitulo: `${p.comprador?.nome ?? "—"} / ${p.vendedor?.nome ?? "—"}`,
          etapaAtual: etapaAtualMap.get(p.id) ?? null,
          atrasos: atrasosPorProcesso.get(p.id) ?? 0,
        })),
        colunaPrazos,
        stats: {
          total: processos.length,
          atrasados: processosAtrasados.size,
          venceHoje: processosVenceHoje.size,
          venceEmBreve: processosVenceEmBreve.size,
        },
      };
    }

    quadrosKanban = await Promise.all([
      ...(temVenda ? [montarQuadro("venda", "Vendas")] : []),
      ...(temFinanciamento ? [montarQuadro("financiamento", "Financiamento")] : []),
    ]);
  }

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

  return (
    <div className="space-y-6">
      <TopBar dataFormatada={dataHojeFormatada} contagemAtrasados={totais.atrasados} />

      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">
          {saudacao()}, {usuario.nome.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-ink-muted">Aqui está o panorama dos seus processos hoje.</p>
      </div>

      {ehAdmin && quadrosKanban.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CartaoIndicador
            icon={FileText}
            valor={totais.total}
            label="Processos em andamento"
            href="/vendas?aba=andamento"
          />
          <CartaoIndicador
            icon={AlertTriangle}
            valor={totais.atrasados}
            label="Atrasados"
            tom={totais.atrasados > 0 ? "perigo" : "neutro"}
            href="/vendas?aba=andamento"
          />
          <CartaoIndicador
            icon={CalendarClock}
            valor={totais.venceHoje}
            label="Vencendo hoje"
            tom={totais.venceHoje > 0 ? "alerta" : "neutro"}
            href="/vendas?aba=andamento"
          />
          <CartaoIndicador
            icon={CalendarDays}
            valor={totais.venceEmBreve}
            label="Vencem em 7 dias"
            href="/vendas?aba=andamento"
          />
        </div>
      )}

      {tarefasHoje.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
          <CabecalhoSecao icon={ListChecks} titulo="Tarefas do dia" />
          <div className="space-y-2">
            {tarefasHoje.map((t) => (
              <form key={`${t.tarefaId}-${t.competencia}`} action={alternarTarefaMensal}>
                <input type="hidden" name="tarefa_id" value={t.tarefaId} />
                <input type="hidden" name="competencia" value={t.competencia} />
                <input type="hidden" name="concluida_atual" value={String(t.concluida)} />
                {t.statusId && <input type="hidden" name="status_id" value={t.statusId} />}
                <button type="submit" className="flex w-full items-center gap-2.5 text-left text-sm">
                  <span
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border ${
                      t.concluida ? "border-brand bg-brand text-white" : "border-border-strong bg-surface"
                    }`}
                  >
                    {t.concluida && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className={t.concluida ? "text-ink-muted line-through" : "text-ink"}>{t.nome}</span>
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      {ehAdmin && (
        <>
          {quadrosKanban.length > 0 && (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div />
                  <Link
                    href="/vendas?aba=andamento"
                    className="shrink-0 text-xs font-medium text-brand hover:underline"
                  >
                    Ver todos os processos →
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
              </div>

              {quadroPrazos && (
                <div className="w-full shrink-0 rounded-xl border border-border/60 bg-surface p-5 shadow-sm lg:w-80">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <CabecalhoSecao icon={Clock} titulo="Prazos finais do contrato" />
                  </div>
                  {quadroPrazos.cards.length === 0 ? (
                    <p className="text-sm text-ink-muted">Nenhum prazo cadastrado.</p>
                  ) : (
                    <div className="max-h-[560px] space-y-2 overflow-y-auto">
                      {quadroPrazos.cards.map((card) => (
                        <Link
                          key={card.id}
                          href={`/processos/${card.id}`}
                          className={`flex items-center gap-2.5 rounded-xl border p-3 shadow-sm transition hover:opacity-80 ${
                            COR_PRAZO_FUNDO[card.cor]
                          }`}
                        >
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              card.cor === "vermelho"
                                ? "bg-rose-500"
                                : card.cor === "amarelo"
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
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
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <CabecalhoSecao icon={Calendar} titulo="Calendário de processos" />
              <div className="flex items-center gap-2">
                <Link
                  href={`/?mes=${mesAnterior}`}
                  className="rounded-md border border-border px-2.5 py-1.5 text-sm text-ink-muted hover:bg-background"
                  aria-label="Mês anterior"
                >
                  ←
                </Link>
                <Link
                  href="/"
                  className="rounded-md border border-border px-2.5 py-1.5 text-sm text-ink-muted hover:bg-background"
                >
                  Hoje
                </Link>
                <Link
                  href={`/?mes=${proximoMes}`}
                  className="rounded-md border border-border px-2.5 py-1.5 text-sm text-ink-muted hover:bg-background"
                  aria-label="Próximo mês"
                >
                  →
                </Link>
              </div>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-600" /> Vendas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-300" /> Financiamento
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-600" /> Locação
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-violet-400" /> Tarefas recorrentes
              </span>
            </div>
            <CalendarioGrid eventos={eventos} referencia={referencia} maxPorDia={3} />
          </div>
        </>
      )}
    </div>
  );
}
