import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/data-br";
import { cancelarLancamento, reativarLancamento } from "../lancamentos-actions";
import {
  FINANCEIRO_INPUT_CLASS,
  FINANCEIRO_PAGE_CLASS,
  FINANCEIRO_PRIMARY_ACTION,
  FINANCEIRO_SECONDARY_ACTION,
  FinanceiroEmptyState,
  FinanceiroPageHeader,
} from "@/components/financeiro/ui";

type StatusLancamento = "pendente" | "pago_parcial" | "pago" | "cancelado";
type TipoLancamento = "receita" | "despesa";
type PeriodoRapido = "hoje" | "7" | "30" | "mes" | "personalizado";

type LancamentoAgenda = {
  id: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  vencimento: string;
  competencia: string | null;
  status: StatusLancamento;
  pessoa_id: string | null;
  categoria_id: string | null;
  conta_bancaria_id: string | null;
  recorrencia_id: string | null;
  financeiro_pessoas: { nome: string } | null;
  financeiro_categorias: { nome: string } | null;
  financeiro_contas_bancarias: { nome: string } | null;
};

type ContaFiltro = {
  id: string;
  nome: string;
};

type FiltrosAgenda = {
  periodo?: string;
  inicio?: string;
  fim?: string;
  data?: string;
  tipo?: string;
  status?: string;
  conta?: string;
  q?: string;
};

type PeriodoAgenda = {
  inicio: string;
  fim: string;
  periodo: PeriodoRapido;
};

const STATUS_ABERTOS: StatusLancamento[] = ["pendente", "pago_parcial"];

function brl(v: number): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBR(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

function moverData(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function primeiroDiaMes(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function ultimoDiaMes(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

function intervaloPeriodo(filtros: FiltrosAgenda, hoje: string): PeriodoAgenda {
  if (filtros.inicio || filtros.fim) {
    return {
      inicio: filtros.inicio || hoje,
      fim: filtros.fim || filtros.inicio || hoje,
      periodo: "personalizado",
    };
  }

  if (filtros.data) {
    return {
      inicio: filtros.data,
      fim: filtros.data,
      periodo: "personalizado",
    };
  }

  if (filtros.periodo === "hoje") {
    return { inicio: hoje, fim: hoje, periodo: "hoje" };
  }

  if (filtros.periodo === "30") {
    return { inicio: hoje, fim: moverData(hoje, 30), periodo: "30" };
  }

  if (filtros.periodo === "mes") {
    return { inicio: primeiroDiaMes(hoje), fim: ultimoDiaMes(hoje), periodo: "mes" };
  }

  return { inicio: hoje, fim: moverData(hoje, 7), periodo: "7" };
}

function construirUrl(params: Partial<FiltrosAgenda>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    const normalized = String(value ?? "").trim();
    if (normalized) sp.set(key, normalized);
  });
  const qs = sp.toString();
  return qs ? `/financeiro/agenda?${qs}` : "/financeiro/agenda";
}

function labelStatus(status: StatusLancamento): string {
  switch (status) {
    case "pago":
      return "Liquidado";
    case "pago_parcial":
      return "Parcial";
    case "cancelado":
      return "Cancelado";
    default:
      return "Em aberto";
  }
}

function statusClasse(status: StatusLancamento): string {
  switch (status) {
    case "pago":
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "pago_parcial":
      return "bg-amber-50 text-amber-700 ring-amber-100";
    case "cancelado":
      return "bg-rose-50 text-rose-700 ring-rose-100";
    default:
      return "bg-brand-soft text-brand ring-brand/10";
  }
}

function textoTipo(tipo: TipoLancamento): string {
  return tipo === "despesa" ? "A pagar" : "A receber";
}

function aberto(lancamento: LancamentoAgenda): boolean {
  return STATUS_ABERTOS.includes(lancamento.status);
}

function valorAssinado(lancamento: LancamentoAgenda): number {
  const valor = Number(lancamento.valor);
  return lancamento.tipo === "receita" ? valor : -valor;
}

function matchesBusca(lancamento: LancamentoAgenda, termo: string): boolean {
  if (!termo) return true;
  const texto = [
    lancamento.descricao,
    lancamento.financeiro_pessoas?.nome,
    lancamento.financeiro_categorias?.nome,
    lancamento.financeiro_contas_bancarias?.nome,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return texto.includes(termo);
}

function aplicaFiltros(lancamento: LancamentoAgenda, filtros: FiltrosAgenda, termoBusca: string): boolean {
  if (filtros.tipo === "despesa" && lancamento.tipo !== "despesa") return false;
  if (filtros.tipo === "receita" && lancamento.tipo !== "receita") return false;
  if (filtros.status && lancamento.status !== filtros.status) return false;
  if (!filtros.status && lancamento.status === "cancelado") return false;
  if (filtros.conta && lancamento.conta_bancaria_id !== filtros.conta) return false;
  return matchesBusca(lancamento, termoBusca);
}

function ResumoCard({
  titulo,
  valor,
  descricao,
  icon: Icon,
  tom,
}: {
  titulo: string;
  valor: string;
  descricao: string;
  icon: LucideIcon;
  tom: "brand" | "green" | "amber" | "red" | "ink";
}) {
  const cores = {
    brand: "bg-brand-soft text-brand",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-rose-50 text-rose-700",
    ink: "bg-background text-ink",
  }[tom];

  return (
    <div className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-ink-muted">{titulo}</p>
          <p className="num mt-2 text-xl font-bold text-ink">{valor}</p>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cores}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-ink-muted">{descricao}</p>
    </div>
  );
}

export default async function AgendaFinanceiraPage({
  searchParams,
}: {
  searchParams: Promise<FiltrosAgenda>;
}) {
  const filtros = await searchParams;
  const supabase = await createClient();
  const hoje = hojeISO();
  const periodo = intervaloPeriodo(filtros, hoje);
  const termoBusca = filtros.q?.trim().toLowerCase() ?? "";

  const [{ data: lancamentosRaw }, { data: contas }] = await Promise.all([
    supabase
      .from("financeiro_lancamentos")
      .select(
        "id, tipo, descricao, valor, vencimento, competencia, status, pessoa_id, categoria_id, conta_bancaria_id, recorrencia_id, financeiro_pessoas ( nome ), financeiro_categorias ( nome ), financeiro_contas_bancarias ( nome )"
      )
      .gte("vencimento", periodo.inicio)
      .lte("vencimento", periodo.fim)
      .order("vencimento")
      .order("descricao"),
    supabase.from("financeiro_contas_bancarias").select("id, nome").eq("ativa", true).order("nome"),
  ]);

  const lancamentos = (lancamentosRaw ?? []) as unknown as LancamentoAgenda[];
  const contasAtivas = (contas ?? []) as ContaFiltro[];
  const lancamentosFiltrados = lancamentos.filter((lancamento) => aplicaFiltros(lancamento, filtros, termoBusca));
  const abertos = lancamentosFiltrados.filter(aberto);
  const vencidos = abertos.filter((l) => l.vencimento < hoje);
  const vencemHoje = abertos.filter((l) => l.vencimento === hoje);
  const aVencer = abertos.filter((l) => l.vencimento > hoje);
  const liquidados = lancamentosFiltrados.filter((l) => l.status === "pago");
  const saldoPeriodo = lancamentosFiltrados
    .filter((l) => l.status !== "cancelado")
    .reduce((soma, lancamento) => soma + valorAssinado(lancamento), 0);
  const totalAReceber = abertos.filter((l) => l.tipo === "receita").reduce((soma, l) => soma + Number(l.valor), 0);
  const totalAPagar = abertos.filter((l) => l.tipo === "despesa").reduce((soma, l) => soma + Number(l.valor), 0);

  const periodoLinks: { label: string; value: PeriodoRapido; href: string }[] = [
    { label: "Hoje", value: "hoje", href: construirUrl({ periodo: "hoje", tipo: filtros.tipo, status: filtros.status, conta: filtros.conta, q: filtros.q }) },
    { label: "7 dias", value: "7", href: construirUrl({ periodo: "7", tipo: filtros.tipo, status: filtros.status, conta: filtros.conta, q: filtros.q }) },
    { label: "30 dias", value: "30", href: construirUrl({ periodo: "30", tipo: filtros.tipo, status: filtros.status, conta: filtros.conta, q: filtros.q }) },
    { label: "Mês", value: "mes", href: construirUrl({ periodo: "mes", tipo: filtros.tipo, status: filtros.status, conta: filtros.conta, q: filtros.q }) },
  ];

  return (
    <div className={`${FINANCEIRO_PAGE_CLASS} pb-10`}>
      <FinanceiroPageHeader
        title="Agenda financeira"
        description="Acompanhe vencimentos, liquidações e pendências por período sem sair do fluxo financeiro."
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/financeiro/lancamentos/novo?tipo=despesa" className={FINANCEIRO_PRIMARY_ACTION}>
              <Plus size={16} />
              Nova despesa
            </Link>
            <Link href="/financeiro/lancamentos/novo?tipo=receita" className={FINANCEIRO_SECONDARY_ACTION}>
              <ArrowUpRight size={16} />
              Novo recebimento
            </Link>
            <Link href="/financeiro/relatorios" className={FINANCEIRO_SECONDARY_ACTION}>
              Relatórios
            </Link>
          </div>
        }
      />

      <section className="rounded-xl border border-border/70 bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="text-sm font-semibold text-ink">Período da agenda</p>
            <p className="mt-1 text-xs text-ink-muted">
              {dataBR(periodo.inicio)} até {dataBR(periodo.fim)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {periodoLinks.map((item) => (
              <Link
                key={item.value}
                href={item.href}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  periodo.periodo === item.value
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-border bg-background text-ink-muted hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <form method="get" action="/financeiro/agenda" className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_150px_170px_180px_auto] lg:items-end">
          <input type="hidden" name="periodo" value={periodo.periodo === "personalizado" ? "" : periodo.periodo} />
          <input type="hidden" name="inicio" value={periodo.periodo === "personalizado" ? periodo.inicio : ""} />
          <input type="hidden" name="fim" value={periodo.periodo === "personalizado" ? periodo.fim : ""} />

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">Buscar lançamento</span>
            <span className="relative block">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                name="q"
                defaultValue={filtros.q ?? ""}
                placeholder="Pessoa, descrição, categoria ou conta"
                className={`${FINANCEIRO_INPUT_CLASS} pl-9`}
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">Tipo</span>
            <select name="tipo" defaultValue={filtros.tipo ?? ""} className={FINANCEIRO_INPUT_CLASS}>
              <option value="">Todos</option>
              <option value="despesa">A pagar</option>
              <option value="receita">A receber</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">Status</span>
            <select name="status" defaultValue={filtros.status ?? ""} className={FINANCEIRO_INPUT_CLASS}>
              <option value="">Abertos e liquidados</option>
              <option value="pendente">Em aberto</option>
              <option value="pago_parcial">Parcial</option>
              <option value="pago">Liquidado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-muted">Conta</span>
            <select name="conta" defaultValue={filtros.conta ?? ""} className={FINANCEIRO_INPUT_CLASS}>
              <option value="">Todas as contas</option>
              {contasAtivas.map((conta) => (
                <option key={conta.id} value={conta.id}>
                  {conta.nome}
                </option>
              ))}
            </select>
          </label>

          <button className={FINANCEIRO_PRIMARY_ACTION}>
            <SlidersHorizontal size={16} />
            Filtrar
          </button>
        </form>

        <details className="mt-3 rounded-lg border border-dashed border-border bg-background px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-brand">Usar intervalo personalizado</summary>
          <form method="get" action="/financeiro/agenda" className="mt-3 grid gap-3 sm:grid-cols-[160px_160px_1fr_auto] sm:items-end">
            <input type="hidden" name="periodo" value="personalizado" />
            {filtros.tipo && <input type="hidden" name="tipo" value={filtros.tipo} />}
            {filtros.status && <input type="hidden" name="status" value={filtros.status} />}
            {filtros.conta && <input type="hidden" name="conta" value={filtros.conta} />}
            {filtros.q && <input type="hidden" name="q" value={filtros.q} />}
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">Início</span>
              <input type="date" name="inicio" defaultValue={periodo.inicio} className={FINANCEIRO_INPUT_CLASS} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-muted">Fim</span>
              <input type="date" name="fim" defaultValue={periodo.fim} className={FINANCEIRO_INPUT_CLASS} />
            </label>
            <span className="hidden text-xs text-ink-muted sm:block">Use para revisar fechamento semanal, quinzenal ou mensal.</span>
            <button className={FINANCEIRO_SECONDARY_ACTION}>Aplicar período</button>
          </form>
        </details>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <ResumoCard
          titulo="Vencidos"
          valor={brl(vencidos.reduce((soma, l) => soma + Number(l.valor), 0))}
          descricao={`${vencidos.length} lançamento(s) em aberto antes de hoje`}
          icon={AlertTriangle}
          tom="red"
        />
        <ResumoCard
          titulo="Vence hoje"
          valor={brl(vencemHoje.reduce((soma, l) => soma + Number(l.valor), 0))}
          descricao={`${vencemHoje.length} obrigação(ões) ou recebimento(s) para hoje`}
          icon={Clock}
          tom="amber"
        />
        <ResumoCard
          titulo="A vencer"
          valor={brl(aVencer.reduce((soma, l) => soma + Number(l.valor), 0))}
          descricao={`${aVencer.length} lançamento(s) ainda dentro do prazo`}
          icon={CalendarClock}
          tom="brand"
        />
        <ResumoCard
          titulo="Liquidados"
          valor={brl(liquidados.reduce((soma, l) => soma + Number(l.valor), 0))}
          descricao={`${liquidados.length} lançamento(s) baixado(s) no período`}
          icon={CheckCircle2}
          tom="green"
        />
        <ResumoCard
          titulo="Saldo do período"
          valor={brl(saldoPeriodo)}
          descricao={`${brl(totalAReceber)} a receber · ${brl(totalAPagar)} a pagar`}
          icon={saldoPeriodo >= 0 ? ArrowUpRight : ArrowDownRight}
          tom={saldoPeriodo >= 0 ? "green" : "red"}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-border/70 bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-ink">Lançamentos do período</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              {lancamentosFiltrados.length} resultado(s), sem ações em lote artificiais.
            </p>
          </div>
          {(filtros.q || filtros.tipo || filtros.status || filtros.conta || periodo.periodo !== "7") && (
            <Link href="/financeiro/agenda" className="text-sm font-medium text-brand hover:underline">
              Limpar filtros
            </Link>
          )}
        </div>

        {lancamentosFiltrados.length === 0 ? (
          <div className="p-4">
            <FinanceiroEmptyState
              title="Nenhum lançamento encontrado"
              description="Ajuste o período ou crie um lançamento financeiro para ele aparecer na agenda."
              action={
                <Link href="/financeiro/lancamentos/novo" className={FINANCEIRO_PRIMARY_ACTION}>
                  <Plus size={16} />
                  Criar lançamento
                </Link>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1060px] w-full text-left text-sm">
              <thead className="border-b border-border bg-background text-xs font-semibold uppercase text-ink-muted">
                <tr>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Pessoa</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Conta</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lancamentosFiltrados.map((lancamento) => {
                  const editavel = lancamento.status !== "pago" && lancamento.status !== "cancelado";
                  const emAberto = aberto(lancamento);

                  return (
                    <tr key={lancamento.id} className="hover:bg-background/70">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            lancamento.tipo === "receita" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {textoTipo(lancamento.tipo)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink">{lancamento.financeiro_pessoas?.nome ?? "Sem pessoa"}</td>
                      <td className="max-w-[260px] px-4 py-3">
                        <p className="truncate font-medium text-ink" title={lancamento.descricao}>
                          {lancamento.descricao}
                        </p>
                        {lancamento.recorrencia_id && <p className="mt-1 text-xs text-ink-muted">Recorrente</p>}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{lancamento.financeiro_categorias?.nome ?? "Sem categoria"}</td>
                      <td className="px-4 py-3 text-ink-muted">
                        {lancamento.financeiro_contas_bancarias?.nome ?? "Sem conta"}
                      </td>
                      <td className="num px-4 py-3 text-ink">{dataBR(lancamento.vencimento)}</td>
                      <td
                        className={`num px-4 py-3 text-right font-semibold ${
                          lancamento.tipo === "receita" ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {brl(lancamento.valor)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClasse(lancamento.status)}`}>
                          {labelStatus(lancamento.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {emAberto && (
                            <Link
                              href={`/financeiro/lancamentos/${lancamento.id}/baixar`}
                              className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-brand-soft"
                            >
                              Baixar
                            </Link>
                          )}
                          {editavel && (
                            <Link
                              href={`/financeiro/lancamentos/${lancamento.id}/editar`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-background hover:text-brand"
                              aria-label="Editar lançamento"
                              title="Editar lançamento"
                            >
                              <Pencil size={15} />
                            </Link>
                          )}
                          {emAberto && (
                            <form action={cancelarLancamento}>
                              <input type="hidden" name="id" value={lancamento.id} />
                              <button
                                type="submit"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-background hover:text-rose-600"
                                aria-label="Cancelar lançamento"
                                title="Cancelar lançamento"
                              >
                                <Ban size={15} />
                              </button>
                            </form>
                          )}
                          {lancamento.status === "cancelado" && (
                            <form action={reativarLancamento}>
                              <input type="hidden" name="id" value={lancamento.id} />
                              <button
                                type="submit"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-brand hover:bg-brand-soft"
                                aria-label="Reativar lançamento"
                                title="Reativar lançamento"
                              >
                                <RefreshCcw size={15} />
                              </button>
                            </form>
                          )}
                          {!emAberto && lancamento.status !== "cancelado" && <span className="px-2 py-1.5 text-xs text-ink-muted">—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
