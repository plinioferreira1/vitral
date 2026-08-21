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
import { KanbanProcessos, type CardKanban } from "@/components/kanban-processos";
import { colunasKanban, etapaAtualPorProcesso } from "@/lib/kanban";

type Aba = "resumo" | "andamento" | "kanban";

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba: abaParam } = await searchParams;
  const aba: Aba = abaParam === "andamento" ? "andamento" : abaParam === "kanban" ? "kanban" : "resumo";

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
    .eq("categoria", "venda")
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

  const eventos = (await getEventosCalendario()).filter((e) => e.categoria === "venda");
  const referencia = new Date(`${hojeISO()}T00:00:00`);

  let cardsKanban: CardKanban[] = [];
  let colunas: string[] = [];
  if (aba === "kanban" && emAndamento.length > 0) {
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
        colunasKanban(supabase, usuario.tenant_id, "venda"),
        etapaAtualPorProcesso(
          supabase,
          usuario.tenant_id,
          "venda",
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Vendas</h1>
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
          <ResumoPrazos eventos={eventos} hrefEmAberto="/calendario?categoria=venda" />
          <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Calendário</p>
              <Link href="/calendario?categoria=venda" className="text-xs font-medium text-brand hover:underline">
                Abrir calendário completo →
              </Link>
            </div>
            <CalendarioGrid eventos={eventos} referencia={referencia} maxPorDia={2} />
          </div>
        </div>
      ) : aba === "kanban" ? (
        <KanbanProcessos colunas={colunas} cards={cardsKanban} />
      ) : (
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
              <TabelaProcessos rows={emAndamento} ehFinanciamento={false} atrasosPorProcesso={atrasosPorProcesso} />
            )}
          </div>

          {concluidos.length > 0 && (
            <details className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
              <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium text-ink-muted hover:text-ink">
                {concluidos.length} processo{concluidos.length > 1 ? "s" : ""} concluído
                {concluidos.length > 1 ? "s" : ""} ou cancelado{concluidos.length > 1 ? "s" : ""}
              </summary>
              <div className="border-t border-border">
                <TabelaProcessos rows={concluidos} ehFinanciamento={false} />
              </div>
            </details>
          )}
        </form>
      )}
    </div>
  );
}
