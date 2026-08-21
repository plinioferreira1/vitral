import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEventosCalendario } from "@/lib/queries";
import { ResumoPrazos } from "@/components/resumo-prazos";
import { CalendarioGrid } from "@/components/calendario-grid";
import { TabelaProcessos, type ProcessoRow } from "@/components/tabela-processos";
import { hojeISO } from "@/lib/data-br";
import { calcularUrgencia } from "@/lib/alertas";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { apagarProcessosSelecionados } from "../processos/bulk-actions";
import { CalculadoraFinanciamento } from "@/components/calculadora-financiamento-custas";
import { KanbanProcessos, type CardKanban } from "@/components/kanban-processos";
import { colunasKanban, etapaAtualPorProcesso } from "@/lib/kanban";
import { ExibicaoChecklists, type ChecklistExibicao } from "@/components/exibicao-checklists";

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

  const { data: processos, error } = await supabase
    .from("processos")
    .select(
      `id, numero_processo, tipo, status, data_criacao, valor_total, valor_financiado, origem,
       imoveis ( endereco ),
       comprador:clientes!processos_comprador_id_fkey ( nome ),
       vendedor:clientes!processos_vendedor_id_fkey ( nome ),
       corretores!processos_corretor_id_fkey ( nome ), bancos ( nome ),
       indicacao:corretores!processos_indicacao_id_fkey ( nome ),
       modelos_processo ( nome )`
    )
    .eq("categoria", "financiamento")
    .order("criado_em", { ascending: false });

  if (error) {
    return <p className="text-sm text-rose-700">Erro ao carregar processos: {error.message}</p>;
  }

  const rows = (processos ?? []) as unknown as ProcessoRow[];
  const emAndamento = rows.filter((p) => p.status !== "concluido" && p.status !== "cancelado");
  const concluidos = rows.filter((p) => p.status === "concluido" || p.status === "cancelado");

  const idsEmAndamento = emAndamento.map((p) => p.id);
  const { data: etapasRaw } =
    idsEmAndamento.length > 0
      ? await supabase
          .from("etapas")
          .select("processo_id, status, data_prevista")
          .in("processo_id", idsEmAndamento)
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

  const eventos = (await getEventosCalendario()).filter((e) => e.categoria === "financiamento");
  const referencia = new Date(`${hojeISO()}T00:00:00`);

  let cardsKanban: CardKanban[] = [];
  let colunas: string[] = [];
  if (aba === "resumo" && vista === "kanban") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("tenant_id")
      .eq("id", user?.id ?? "")
      .single();

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
        titulo: p.imoveis?.endereco ?? p.numero_processo,
        subtitulo: `${p.comprador?.nome ?? "—"} / ${p.vendedor?.nome ?? "—"}`,
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Financiamentos</h1>
          <p className="mt-1 text-sm text-ink-muted">{rows.length} processos nessa categoria</p>
        </div>
        <Link
          href="/processos/novo"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Novo processo
        </Link>
      </div>

      {aba === "resumo" ? (
        <div className="space-y-6">
          <ResumoPrazos eventos={eventos} hrefEmAberto="/calendario?categoria=financiamento" />

          <div className="flex items-center justify-between">
            <div className="flex gap-1 rounded-lg bg-background p-1 text-sm w-fit">
              <Link
                href="/financiamentos?aba=resumo&vista=calendario"
                className={`rounded-md px-4 py-1.5 text-center font-medium transition ${
                  vista === "calendario" ? "bg-surface shadow-sm text-ink" : "text-ink-muted"
                }`}
              >
                Calendário
              </Link>
              <Link
                href="/financiamentos?aba=resumo&vista=kanban"
                className={`rounded-md px-4 py-1.5 text-center font-medium transition ${
                  vista === "kanban" ? "bg-surface shadow-sm text-ink" : "text-ink-muted"
                }`}
              >
                Quadro
              </Link>
            </div>
            {vista === "calendario" && (
              <Link
                href="/calendario?categoria=financiamento"
                className="text-xs font-medium text-brand hover:underline"
              >
                Abrir calendário completo →
              </Link>
            )}
          </div>

          {vista === "calendario" ? (
            <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
              <CalendarioGrid eventos={eventos} referencia={referencia} maxPorDia={2} />
            </div>
          ) : (
            <KanbanProcessos colunas={colunas} cards={cardsKanban} />
          )}
        </div>
      ) : aba === "andamento" ? (
        <form action={apagarProcessosSelecionados} className="space-y-6">
          {(emAndamento.length > 0 || concluidos.length > 0) && (
            <div className="flex justify-end">
              <BotaoComConfirmacao
                mensagem="Apagar os processos selecionados? Essa ação não pode ser desfeita."
                className="rounded-md border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
              >
                Apagar selecionados
              </BotaoComConfirmacao>
            </div>
          )}
          <div className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
            {emAndamento.length === 0 && concluidos.length === 0 ? (
              <p className="p-8 text-center text-sm text-ink-muted">
                Nenhum processo nessa categoria ainda.{" "}
                <Link href="/processos/novo" className="text-brand hover:underline">
                  Criar o primeiro
                </Link>
                .
              </p>
            ) : (
              <TabelaProcessos rows={emAndamento} ehFinanciamento={true} atrasosPorProcesso={atrasosPorProcesso} />
            )}
          </div>

          {concluidos.length > 0 && (
            <details className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
              <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium text-ink-muted hover:text-ink">
                {concluidos.length} processo{concluidos.length > 1 ? "s" : ""} concluído
                {concluidos.length > 1 ? "s" : ""} ou cancelado{concluidos.length > 1 ? "s" : ""}
              </summary>
              <div className="border-t border-border">
                <TabelaProcessos rows={concluidos} ehFinanciamento={true} />
              </div>
            </details>
          )}
        </form>
      ) : aba === "processos" ? (
        <ExibicaoChecklists checklists={checklists} />
      ) : (
        <CalculadoraFinanciamento />
      )}
    </div>
  );
}
