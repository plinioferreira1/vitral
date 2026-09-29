import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEventosCalendario } from "@/lib/queries";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { CalendarioGrid } from "@/components/calendario-grid";
import { TabelaProcessos, type ProcessoRow } from "@/components/tabela-processos";
import { BuscaTabelaProcessos } from "@/components/busca-tabela-processos";
import { hojeISO } from "@/lib/data-br";
import { calcularUrgencia } from "@/lib/alertas";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { apagarProcessosSelecionados } from "../processos/bulk-actions";
import { KanbanProcessos, type CardKanban } from "@/components/kanban-processos";
import { colunasKanban, etapaAtualPorProcesso } from "@/lib/kanban";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  type LucideIcon,
} from "lucide-react";

type Aba = "resumo" | "andamento";
type Vista = "calendario" | "kanban";

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; vista?: string }>;
}) {
  const { aba: abaParam, vista: vistaParam } = await searchParams;
  const aba: Aba = abaParam === "andamento" ? "andamento" : "resumo";
  const vista: Vista = vistaParam === "kanban" ? "kanban" : "calendario";

  const supabase = await createClient();

  // Processos, eventos do calendário e usuário (já buscado pelo layout)
  // carregam em paralelo. Os eventos só são usados na aba Resumo.
  const [{ data: processos, error }, todosEventos, { usuario }] = await Promise.all([
    supabase
      .from("processos")
      .select(
        `id, numero_processo, codigo_san, tipo, status, data_criacao, data_assinatura, data_final_contrato, valor_total, valor_financiado, origem,
         imoveis ( endereco ),
         comprador:clientes!processos_comprador_id_fkey ( nome ),
         vendedor:clientes!processos_vendedor_id_fkey ( nome ),
         corretores!processos_corretor_id_fkey ( nome ), bancos ( nome ),
         indicacao:corretores!processos_indicacao_id_fkey ( nome ),
         modelos_processo ( nome )`
      )
      .eq("categoria", "venda")
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
  const { data: etapasRaw } =
    idsEmAndamento.length > 0
      ? await supabase
          .from("etapas")
          .select("id, nome, processo_id, status, data_prevista")
          .in("processo_id", idsEmAndamento)
      : { data: [] as { id: string; nome: string; processo_id: string; status: string; data_prevista: string | null }[] };

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

  const eventos = todosEventos.filter((e) => e.categoria === "venda");
  const hoje = hojeISO();
  const referencia = new Date(`${hoje}T00:00:00`);
  const processosAtrasados = new Set<string>();
  const processosVencemHoje = new Set<string>();
  const processosVencemEmBreve = new Set<string>();
  const processoPorId = new Map(emAndamento.map((processo) => [processo.id, processo]));

  const prioridades = (etapasRaw ?? [])
    .filter((etapa) => etapa.status !== "concluida" && etapa.data_prevista)
    .map((etapa) => {
      const { urgencia, dias_para_vencer } = calcularUrgencia({
        status: etapa.status as "pendente" | "em_andamento" | "concluida" | "bloqueada",
        data_prevista: etapa.data_prevista,
      });
      if (urgencia === "atrasada") processosAtrasados.add(etapa.processo_id);
      if (urgencia === "vence_hoje") processosVencemHoje.add(etapa.processo_id);
      if (urgencia === "vence_em_breve") processosVencemEmBreve.add(etapa.processo_id);
      return { ...etapa, urgencia, dias_para_vencer, processo: processoPorId.get(etapa.processo_id) };
    })
    .filter((etapa) =>
      ["atrasada", "vence_hoje", "vence_em_breve"].includes(etapa.urgencia)
    )
    .sort((a, b) => a.data_prevista!.localeCompare(b.data_prevista!));

  const volumeEmNegociacao = emAndamento.reduce(
    (total, processo) => total + Number(processo.valor_total ?? 0),
    0
  );
  const volumeFormatado = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(volumeEmNegociacao);

  let cardsKanban: CardKanban[] = [];
  let colunas: string[] = [];
  if (aba === "resumo" && vista === "kanban") {
    if (usuario?.tenant_id) {
      const [colunasResult, etapaAtualMap] = await Promise.all([
        colunasKanban(supabase, usuario.tenant_id, "venda"),
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

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-brand via-brand/80 to-gold" />
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Comercial</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight text-ink">Visão Geral de Vendas</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Acompanhe negociações, etapas críticas e prazos em um só lugar.
            </p>
          </div>
          <Link
            href="/processos/novo"
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            + Novo processo
          </Link>
        </div>
      </div>

      {aba === "resumo" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <IndicadorVendas
              icon={Clock3}
              label="Processos ativos"
              value={String(emAndamento.length)}
              detail={`${concluidos.length} encerrados no histórico`}
              href="/vendas?aba=andamento"
            />
            <IndicadorVendas
              icon={AlertTriangle}
              label="Com atraso"
              value={String(processosAtrasados.size)}
              detail={processosAtrasados.size ? "Precisam de atenção" : "Nenhum processo atrasado"}
              href="/calendario?categoria=venda&urgencia=atrasada"
              tom={processosAtrasados.size ? "perigo" : "sucesso"}
            />
            <IndicadorVendas
              icon={CalendarClock}
              label="Próximos 7 dias"
              value={String(processosVencemHoje.size + processosVencemEmBreve.size)}
              detail={`${processosVencemHoje.size} vencendo hoje`}
              href="/calendario?categoria=venda&urgencia=vence_em_breve"
            />
            <IndicadorVendas
              icon={CircleDollarSign}
              label="Volume em negociação"
              value={volumeFormatado}
              detail="Soma dos processos ativos"
              href="/vendas?aba=andamento"
              tom="destaque"
            />
          </div>

          <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-ink">Prioridades agora</h2>
                <p className="mt-0.5 text-xs text-ink-muted">Etapas vencidas ou com prazo nos próximos 7 dias.</p>
              </div>
              <Link href="/calendario?categoria=venda" className="text-xs font-semibold text-brand hover:underline">
                Ver todas
              </Link>
            </div>
            {prioridades.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <CheckCircle2 size={19} />
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">Tudo em dia</p>
                  <p className="text-xs text-ink-muted">Nenhuma etapa de venda exige atenção agora.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {prioridades.slice(0, 5).map((prioridade) => {
                  const atrasada = prioridade.urgencia === "atrasada";
                  const venceHoje = prioridade.urgencia === "vence_hoje";
                  const prazo =
                    prioridade.dias_para_vencer < 0
                      ? `Atrasada há ${Math.abs(prioridade.dias_para_vencer)} dia${Math.abs(prioridade.dias_para_vencer) === 1 ? "" : "s"}`
                      : venceHoje
                        ? "Vence hoje"
                        : `Vence em ${prioridade.dias_para_vencer} dia${prioridade.dias_para_vencer === 1 ? "" : "s"}`;
                  return (
                    <Link
                      key={prioridade.id}
                      href={`/processos/${prioridade.processo_id}#etapa-${prioridade.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-background"
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        atrasada ? "bg-rose-500" : venceHoje ? "bg-amber-500" : "bg-sky-500"
                      }`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{prioridade.nome}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {prioridade.processo?.imoveis?.endereco ?? prioridade.processo?.numero_processo ?? "Processo"}
                        </span>
                      </span>
                      <span className="hidden text-right sm:block">
                        <span className={`block text-xs font-semibold ${
                          atrasada ? "text-rose-600" : venceHoje ? "text-amber-700" : "text-sky-700"
                        }`}>{prazo}</span>
                        <span className="block text-[11px] text-ink-muted">
                          {format(parseISO(prioridade.data_prevista!), "dd MMM", { locale: ptBR })}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-lg bg-background p-1 text-sm w-fit">
              <Link
                href="/vendas?aba=resumo&vista=calendario"
                className={`rounded-md px-4 py-1.5 text-center font-medium transition ${
                  vista === "calendario" ? "bg-surface shadow-sm text-ink" : "text-ink-muted"
                }`}
              >
                Calendário
              </Link>
              <Link
                href="/vendas?aba=resumo&vista=kanban"
                className={`rounded-md px-4 py-1.5 text-center font-medium transition ${
                  vista === "kanban" ? "bg-surface shadow-sm text-ink" : "text-ink-muted"
                }`}
              >
                Quadro
              </Link>
            </div>
            {vista === "calendario" && (
              <Link href="/calendario?categoria=venda" className="text-xs font-medium text-brand hover:underline">
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
          <div className="space-y-3">
            {emAndamento.length === 0 && concluidos.length === 0 ? (
              <p className="rounded-xl border border-border/60 bg-surface p-8 text-center text-sm text-ink-muted shadow-sm">
                Nenhum processo nessa categoria ainda.{" "}
                <Link href="/processos/novo" className="text-brand hover:underline">
                  Criar o primeiro
                </Link>
                .
              </p>
            ) : (
              <BuscaTabelaProcessos
                rows={emAndamento}
                ehFinanciamento={false}
                atrasosPorProcesso={atrasosPorProcesso}
              />
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

function IndicadorVendas({
  icon: Icone,
  label,
  value,
  detail,
  href,
  tom = "neutro",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  href: string;
  tom?: "neutro" | "perigo" | "sucesso" | "destaque";
}) {
  const estilo =
    tom === "perigo"
      ? "border-rose-200 bg-rose-50/70 text-rose-700"
      : tom === "sucesso"
        ? "border-emerald-200 bg-emerald-50/70 text-emerald-700"
        : tom === "destaque"
          ? "border-brand/20 bg-brand text-white"
          : "border-border bg-surface text-brand";

  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${estilo}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          tom === "destaque" ? "bg-white/15" : "bg-white/80"
        }`}>
          <Icone size={18} />
        </span>
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${
          tom === "destaque" ? "text-white/65" : "text-current opacity-65"
        }`}>Ver detalhes</span>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight">{value}</p>
      <p className={`mt-0.5 text-sm font-medium ${tom === "destaque" ? "text-white/90" : "text-ink"}`}>{label}</p>
      <p className={`mt-1 text-xs ${tom === "destaque" ? "text-white/60" : "text-ink-muted"}`}>{detail}</p>
    </Link>
  );
}
