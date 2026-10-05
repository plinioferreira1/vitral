import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEventosCalendario } from "@/lib/queries";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { ResumoPrazos } from "@/components/resumo-prazos";
import { CalendarioGrid } from "@/components/calendario-grid";
import type { ProcessoRow } from "@/components/tabela-processos";
import { ListaFinanciamentos, type AcompanhamentoFinanciamento } from "@/components/lista-financiamentos";
import { etapasAtuais, type EtapaAcompanhamento } from "@/lib/acompanhamento-financiamentos";
import { identificacaoProcesso } from "@/lib/identificacao-processo";
import { hojeISO } from "@/lib/data-br";
import { calcularUrgencia } from "@/lib/alertas";
import { CalculadoraFinanciamento } from "@/components/calculadora-financiamento-custas";
import { KanbanProcessos, type CardKanban } from "@/components/kanban-processos";
import { colunasKanban, etapaAtualPorProcesso } from "@/lib/kanban";
import { ExibicaoChecklists, type ChecklistExibicao } from "@/components/exibicao-checklists";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { ArrowUpRight, CalendarDays, ClipboardCheck, Columns3, Landmark, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Aba = "resumo" | "andamento" | "processos" | "custas";
type Vista = "calendario" | "kanban";

export default async function FinanciamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; vista?: string }>;
}) {
  const { aba: abaParam, vista: vistaParam } = await searchParams;
  const aba: Aba =
    abaParam === "andamento"
      ? "andamento"
      : abaParam === "processos"
        ? "processos"
        : abaParam === "custas"
          ? "custas"
          : "resumo";
  const vista: Vista = vistaParam === "kanban" ? "kanban" : "calendario";

  const supabase = await createClient();

  // Processos, eventos do calendário e usuário (já buscado pelo layout)
  // carregam em paralelo. Os eventos só são usados na aba Resumo.
  const [{ data: processos, error }, todosEventos, { usuario }] = await Promise.all([
    supabase
      .from("processos")
      .select(
        `id, numero_processo, codigo_san, numero_proposta_contrato, tipo, status, data_criacao, data_assinatura, data_final_contrato, valor_total, valor_financiado, origem,
         imoveis ( endereco ),
         comprador:clientes!processos_comprador_id_fkey ( nome ),
         vendedor:clientes!processos_vendedor_id_fkey ( nome ),
         corretores!processos_corretor_id_fkey ( nome ), bancos ( nome ),
         indicacao:corretores!processos_indicacao_id_fkey ( nome ),
         modelos_processo ( nome )`
      )
      .eq("categoria", "financiamento")
      .order("criado_em", { ascending: false }),
    aba === "resumo" ? getEventosCalendario() : Promise.resolve([]),
    getUsuarioAtual(),
  ]);

  if (error) {
    return <p className="text-sm text-rose-700">Erro ao carregar processos: {error.message}</p>;
  }

  const rows = (processos ?? []) as unknown as ProcessoRow[];
  const emAndamento = rows.filter((p) => p.status !== "concluido" && p.status !== "cancelado");
  const concluidos = rows.filter((p) => p.status === "concluido" || p.status === "cancelado");

  const idsEmAndamento = emAndamento.map((p) => p.id);
  const { data: etapasRaw, error: erroEtapas } =
    idsEmAndamento.length > 0
      ? await supabase
          .from("etapas")
          .select("processo_id, nome, status, ordem, especial, data_prevista, usuarios!etapas_responsavel_id_fkey ( nome )")
          .in("processo_id", idsEmAndamento)
      : { data: [] as EtapaAcompanhamento[], error: null };

  const acompanhamento: Record<string, AcompanhamentoFinanciamento> = {};
  for (const [id, etapa] of Object.entries(etapasAtuais((etapasRaw ?? []) as EtapaAcompanhamento[]))) {
    acompanhamento[id] = { ...etapa, urgencia: calcularUrgencia({ status: etapa.status as "pendente" | "em_andamento" | "concluida" | "bloqueada", data_prevista: etapa.data_prevista }).urgencia };
  }

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

  const eventos = todosEventos.filter((e) => e.categoria === "financiamento");
  const referencia = new Date(`${hojeISO()}T00:00:00`);

  let cardsKanban: CardKanban[] = [];
  let colunas: string[] = [];
  if (aba === "resumo" && vista === "kanban") {
    if (usuario?.tenant_id) {
      const [colunasResult, etapaAtualMap] = await Promise.all([
        colunasKanban(supabase, usuario.tenant_id, "financiamento"),
        etapaAtualPorProcesso(
          supabase,
          emAndamento.map((p) => p.id)
        ),
      ]);
      colunas = colunasResult;
      cardsKanban = emAndamento.map((p) => ({
        id: p.id,
        titulo: p.imoveis?.endereco ?? identificacaoProcesso(p, "financiamento"),
        subtitulo: `${identificacaoProcesso(p, "financiamento")} · ${p.comprador?.nome ?? "Comprador não informado"}`,
        etapaAtual: etapaAtualMap.get(p.id) ?? null,
        atrasos: atrasosPorProcesso.get(p.id) ?? 0,
      }));
    }
  }

  let checklists: ChecklistExibicao[] = [];
  if (aba === "processos") {
    const { data: checklistsRaw } = await supabase
      .from("checklists_modelo")
      .select(
        "id, nome, descricao, ordem, checklist_grupos ( id, nome, observacao, ordem, checklist_grupo_itens ( id, texto, ordem ) )"
      )
      .eq("categoria", "financiamento")
      .order("ordem", { ascending: true });

    type GrupoBruto = {
      id: string;
      nome: string;
      observacao: string | null;
      ordem: number;
      checklist_grupo_itens: { id: string; texto: string; ordem: number }[];
    };
    type ChecklistBruto = {
      id: string;
      nome: string;
      descricao: string | null;
      ordem: number;
      checklist_grupos: GrupoBruto[];
    };

    checklists = ((checklistsRaw ?? []) as unknown as ChecklistBruto[]).map((c) => ({
      id: c.id,
      nome: c.nome,
      descricao: c.descricao,
      checklist_grupos: [...c.checklist_grupos]
        .sort((a, b) => a.ordem - b.ordem)
        .map((g) => ({
          id: g.id,
          nome: g.nome,
          observacao: g.observacao,
          checklist_grupo_itens: [...g.checklist_grupo_itens]
            .sort((a, b) => a.ordem - b.ordem)
            .map((i) => ({ id: i.id, texto: i.texto })),
        })),
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Landmark size={22} aria-hidden="true" />
          </div>
          <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Financiamentos</h1>
          <p className="mt-1 text-sm text-ink-muted">{emAndamento.length} em andamento · {rows.length} no total</p>
          </div>
        </div>
        <Link
          href="/processos/novo"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <Plus size={17} aria-hidden="true" /> Novo processo
        </Link>
      </div>

      {aba === "resumo" ? (
        <div className="space-y-6">
          <ResumoPrazos
            eventos={eventos}
            hrefEmAberto="/calendario?categoria=financiamento"
            hrefFiltro={(urgencia) => `/calendario?categoria=financiamento&urgencia=${urgencia}`}
            compacto
          />

          <section className="rounded-2xl border border-border/60 bg-surface p-3 shadow-sm sm:p-5">
            <CabecalhoSecao
              icon={vista === "calendario" ? CalendarDays : Columns3}
              titulo={vista === "calendario" ? "Agenda de prazos" : "Processos por etapa"}
              descricao={vista === "calendario" ? format(referencia, "MMMM yyyy", { locale: ptBR }) : "Acompanhe a etapa atual de cada financiamento."}
            />
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <nav aria-label="Visualização dos financiamentos" className="flex w-fit gap-1 rounded-lg bg-background p-1 text-sm">
              <Link
                href="/financiamentos?aba=resumo&vista=calendario"
                aria-current={vista === "calendario" ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-center font-medium transition ${
                  vista === "calendario" ? "bg-surface shadow-sm text-ink" : "text-ink-muted"
                }`}
              >
                <CalendarDays size={15} aria-hidden="true" /> Calendário
              </Link>
              <Link
                href="/financiamentos?aba=resumo&vista=kanban"
                aria-current={vista === "kanban" ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-center font-medium transition ${
                  vista === "kanban" ? "bg-surface shadow-sm text-ink" : "text-ink-muted"
                }`}
              >
                <Columns3 size={15} aria-hidden="true" /> Quadro
              </Link>
            </nav>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link href="/financiamentos?aba=andamento" className="text-xs font-semibold text-brand hover:underline">
                Ver processos ({emAndamento.length})
              </Link>
            {vista === "calendario" && (
              <Link
                href="/calendario?categoria=financiamento"
                className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-brand"
              >
                Calendário completo <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            )}
            </div>
          </div>

          {vista === "calendario" ? (
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
              <CalendarioGrid eventos={eventos} referencia={referencia} maxPorDia={2} />
              </div>
            </div>
          ) : (
            <KanbanProcessos colunas={colunas} cards={cardsKanban} />
          )}
          </section>
        </div>
      ) : aba === "andamento" ? (
        <div className="space-y-6">
          <CabecalhoSecao icon={Landmark} titulo="Processos em andamento" descricao="Etapa atual, banco e prazo de cada financiamento." />
          {erroEtapas && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Não foi possível carregar as etapas e os prazos. Atualize a página para tentar novamente.</p>}
          <ListaFinanciamentos rows={emAndamento} acompanhamento={acompanhamento} atrasos={Object.fromEntries(atrasosPorProcesso)} />
          {concluidos.length > 0 && (
            <details className="rounded-xl border border-border/60 bg-surface shadow-sm">
              <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-ink-muted hover:text-ink">Concluídos e cancelados ({concluidos.length})</summary>
              <div className="border-t border-border p-3 sm:p-5">
                <ListaFinanciamentos rows={concluidos} acompanhamento={{}} atrasos={{}} finalizados />
              </div>
            </details>
          )}
        </div>
      ) : aba === "processos" ? (
        <section className="space-y-5">
          <CabecalhoSecao icon={ClipboardCheck} titulo="Checklists de financiamento" descricao="Consulte os documentos necessários para cada modelo." />
          <ExibicaoChecklists checklists={checklists} />
        </section>
      ) : (
        <CalculadoraFinanciamento />
      )}
    </div>
  );
}
