import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  MessageCircle,
  MoreHorizontal,
  Search,
  Trash2,
} from "lucide-react";
import { cancelarLancamento } from "../lancamentos-actions";
import { hojeISO } from "@/lib/data-br";

const campoClasse =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand";

type LancamentoAgenda = {
  id: string;
  tipo: "receita" | "despesa";
  descricao: string;
  valor: number;
  vencimento: string;
  competencia: string | null;
  status: string;
  pessoa_id: string | null;
  categoria_id: string | null;
  recorrencia_id: string | null;
  financeiro_pessoas: { nome: string } | null;
  financeiro_categorias: { nome: string } | null;
};

type FiltrosAgenda = {
  data?: string;
  tipo?: string;
  q?: string;
};

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

function construirUrl(params: FiltrosAgenda): string {
  const sp = new URLSearchParams();
  if (params.data) sp.set("data", params.data);
  if (params.tipo) sp.set("tipo", params.tipo);
  if (params.q) sp.set("q", params.q);
  const qs = sp.toString();
  return qs ? `/financeiro/agenda?${qs}` : "/financeiro/agenda";
}

function statusLabel(status: string): string {
  if (status === "pago_parcial") return "Pago parcial";
  return "Em Aberto";
}

export default async function AgendaFinanceiraPage({
  searchParams,
}: {
  searchParams: Promise<FiltrosAgenda>;
}) {
  const filtros = await searchParams;
  const supabase = await createClient();
  const hoje = hojeISO();
  const em60dias = new Date();
  em60dias.setDate(em60dias.getDate() + 60);
  const em60diasStr = em60dias.toISOString().slice(0, 10);

  const [{ data: lancamentosRaw }, { data: contas }] = await Promise.all([
    supabase
      .from("financeiro_lancamentos")
      .select(
        "id, tipo, descricao, valor, vencimento, competencia, status, pessoa_id, categoria_id, recorrencia_id, financeiro_pessoas ( nome ), financeiro_categorias ( nome )"
      )
      .in("status", ["pendente", "pago_parcial"])
      .lte("vencimento", em60diasStr)
      .order("vencimento"),
    supabase.from("financeiro_contas_bancarias").select("id, nome").eq("ativa", true).order("nome"),
  ]);

  const lancamentos = (lancamentosRaw ?? []) as unknown as LancamentoAgenda[];
  const primeiraDataComMovimento = lancamentos.find((l) => l.vencimento >= hoje)?.vencimento ?? hoje;
  const dataSelecionada = filtros.data ?? primeiraDataComMovimento;
  const termoBusca = filtros.q?.trim().toLowerCase() ?? "";

  const lancamentosDoDia = lancamentos.filter((l) => {
    if (l.vencimento !== dataSelecionada) return false;
    if (filtros.tipo === "despesa" && l.tipo !== "despesa") return false;
    if (filtros.tipo === "receita" && l.tipo !== "receita") return false;
    if (termoBusca) {
      const combinado = `${l.descricao} ${l.financeiro_pessoas?.nome ?? ""} ${l.financeiro_categorias?.nome ?? ""}`.toLowerCase();
      if (!combinado.includes(termoBusca)) return false;
    }
    return true;
  });

  const vencidosPeriodo = lancamentos
    .filter((l) => l.vencimento < dataSelecionada)
    .reduce((s, l) => s + Number(l.valor), 0);
  const vencemHojePeriodo = lancamentos
    .filter((l) => l.vencimento === dataSelecionada)
    .reduce((s, l) => s + Number(l.valor), 0);
  const aVencerPeriodo = lancamentos
    .filter((l) => l.vencimento > dataSelecionada)
    .reduce((s, l) => s + Number(l.valor), 0);
  const totalPagarDia = lancamentosDoDia.filter((l) => l.tipo === "despesa").reduce((s, l) => s + Number(l.valor), 0);
  const totalReceberDia = lancamentosDoDia.filter((l) => l.tipo === "receita").reduce((s, l) => s + Number(l.valor), 0);
  const totalDia = lancamentosDoDia.reduce((s, l) => s + Number(l.valor), 0);

  return (
    <div className="financeiro-ui mx-auto max-w-[1480px] space-y-3 text-ink">
      <div className="flex flex-wrap items-center gap-3 py-1">
        <Link
          href="/financeiro/contas-a-pagar"
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90"
        >
          Nova despesa
          <ChevronDown size={15} />
        </Link>
        <Link
          href="/financeiro/relatorios"
          className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90"
        >
          Relatorios
          <ChevronDown size={15} />
        </Link>
        <button className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand-soft">
          Exportar
        </button>
        <button className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand-soft">
          Imprimir
        </button>
        <button className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand-soft">
          Importar planilha
        </button>
        <div className="ml-auto flex items-center gap-2 text-sm font-semibold text-brand">
          <HelpCircle size={17} className="fill-brand text-white" />
          Ajuda rapida
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-surface p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="hidden h-16 w-20 items-center justify-center rounded-full bg-brand-soft text-3xl font-black text-brand sm:flex">
            $
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-ink">Agenda financeira da Sacra, sem perder vencimento no caminho.</p>
            <div className="mt-2 flex flex-wrap gap-x-8 gap-y-2 text-sm text-ink">
              <span className="text-brand">✓ <span className="text-ink">Controle diario de vencimentos</span></span>
              <span className="text-brand">✓ <span className="text-ink">Baixa e liquidacao no mesmo fluxo</span></span>
              <span className="text-brand">✓ <span className="text-ink">Visao separada de A Pagar e A Receber</span></span>
            </div>
          </div>
          <button className="text-xl leading-none text-ink-muted">×</button>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-surface p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[315px_minmax(280px,1fr)_180px_128px] lg:items-end">
          <div>
            <p className="mb-1 text-sm text-ink-muted">Vencimento</p>
            <div className="grid grid-cols-[40px_1fr_40px] overflow-hidden rounded-lg border border-border">
              <Link
                href={construirUrl({ data: moverData(dataSelecionada, -1), tipo: filtros.tipo, q: filtros.q })}
                className="flex items-center justify-center bg-background text-brand hover:bg-brand-soft"
              >
                <ChevronLeft size={19} />
              </Link>
              <div className="flex items-center justify-center gap-2 border-x border-border bg-background px-3 text-sm font-bold text-brand">
                {dataBR(dataSelecionada)}
                <ChevronDown size={15} />
              </div>
              <Link
                href={construirUrl({ data: moverData(dataSelecionada, 1), tipo: filtros.tipo, q: filtros.q })}
                className="flex items-center justify-center bg-background text-brand hover:bg-brand-soft"
              >
                <ChevronRight size={19} />
              </Link>
            </div>
          </div>

          <form method="get" action="/financeiro/agenda">
            <p className="mb-1 text-sm text-ink-muted">Pesquisar no periodo selecionado</p>
            <div className="flex">
              <input type="hidden" name="data" value={dataSelecionada} />
              {filtros.tipo && <input type="hidden" name="tipo" value={filtros.tipo} />}
              <input name="q" defaultValue={filtros.q ?? ""} placeholder="Pesquisar" className={`${campoClasse} rounded-r-none`} />
              <button className="rounded-r-md border border-l-0 border-border bg-background px-4 text-brand">
                <Search size={19} />
              </button>
            </div>
          </form>

          <div>
            <p className="mb-1 text-sm text-ink-muted">Conta</p>
            <select className={campoClasse} defaultValue="">
              <option value="">Selecionar todas</option>
              {(contas ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold text-brand hover:bg-brand-soft">
            Mais filtros
            <ChevronDown size={15} />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          <p className="text-sm text-ink-muted">Mais filtros selecionados</p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand">
              Situacao: Em Aberto
              <span className="text-ink-muted">×</span>
            </span>
            {filtros.tipo && (
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand">
                Tipo: {filtros.tipo === "despesa" ? "A Pagar" : "A Receber"}
                <span className="text-ink-muted">×</span>
              </span>
            )}
            <Link href="/financeiro/agenda" className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">
              <Trash2 size={14} />
              Limpar filtros
            </Link>
          </div>
        </div>

        <div className="mt-5 grid overflow-hidden rounded-t-xl border border-border text-center text-sm lg:grid-cols-5">
          <div className="border-b border-border p-3 lg:border-b-0 lg:border-r">
            <p>Vencidos (R$)</p>
            <p className="num text-xl font-bold text-rose-700">{brl(vencidosPeriodo)}</p>
          </div>
          <div className="border-b border-border p-3 lg:border-b-0 lg:border-r">
            <p>Vencem hoje (R$)</p>
            <p className="num text-xl font-bold text-rose-700">{brl(dataSelecionada === hoje ? vencemHojePeriodo : 0)}</p>
          </div>
          <div className="border-b border-border p-3 lg:border-b-0 lg:border-r">
            <p>A vencer (R$)</p>
            <p className="num text-xl font-bold text-brand">{brl(dataSelecionada > hoje ? vencemHojePeriodo + aVencerPeriodo : aVencerPeriodo)}</p>
          </div>
          <div className="border-b border-border p-3 lg:border-b-0 lg:border-r">
            <p>Pagos (R$)</p>
            <p className="num text-xl font-bold text-emerald-700">R$ 0,00</p>
          </div>
          <div className="border-t-2 border-brand p-3 bg-brand-soft/40">
            <p className="inline-flex items-center gap-1">
              Total do periodo (R$)
              <HelpCircle size={14} />
            </p>
            <p className="num text-xl font-bold text-brand">{brl(totalDia)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-x border-border bg-background px-2 py-2 text-sm">
          <span>0 registro(s) selecionado(s)</span>
          <button disabled className="rounded-lg border border-border bg-surface px-3 py-1.5 font-bold text-ink-muted/70">
            Baixar selecionados
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 font-bold text-brand hover:bg-brand-soft">
            Acoes em lote
            <ChevronDown size={15} />
          </button>
        </div>

        <div className="overflow-x-auto border border-border">
          <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
            <thead className="bg-background text-ink-muted">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input type="checkbox" className="h-4 w-4 rounded border-brand accent-brand" />
                </th>
                <th className="px-4 py-3 font-bold">Vencimento</th>
                <th className="px-4 py-3 font-bold">Pagamento</th>
                <th className="px-4 py-3 font-bold">Resumo do lancamento <HelpCircle size={14} className="inline" /></th>
                <th className="px-4 py-3 text-right font-bold">Total (R$)</th>
                <th className="px-4 py-3 text-right font-bold">A pagar (R$)</th>
                <th className="px-4 py-3 font-bold">Situacao</th>
                <th className="px-4 py-3 text-right font-bold">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-brand text-brand">+</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {lancamentosDoDia.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[#6b7690]">
                    Nenhum lancamento em aberto para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                lancamentosDoDia.map((l) => (
                  <tr key={l.id} className="hover:bg-background/70">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="h-4 w-4 rounded border-brand accent-brand" />
                    </td>
                    <td className="px-4 py-3">{dataBR(l.vencimento)}</td>
                    <td className="px-4 py-3">{dataBR(l.vencimento)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{l.descricao}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded bg-background px-2 py-0.5 text-ink-muted">
                          {l.financeiro_categorias?.nome ?? (l.tipo === "despesa" ? "Despesa" : "Receita")}
                        </span>
                        <span className="text-ink-muted">{l.financeiro_pessoas?.nome ?? "Sem pessoa vinculada"}</span>
                      </div>
                    </td>
                    <td className="num px-4 py-3 text-right font-medium">{brl(l.valor)}</td>
                    <td className="num px-4 py-3 text-right font-medium">{l.tipo === "despesa" ? brl(l.valor) : "0,00"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gold-soft px-4 py-1 text-xs font-semibold text-[#241512]">
                        {statusLabel(l.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <MessageCircle size={18} className="text-brand" />
                        <details className="relative">
                          <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-bold text-brand hover:bg-brand-soft">
                            Acoes
                            <ChevronDown size={15} />
                          </summary>
                          <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-border bg-surface p-3 shadow-xl">
                            <Link
                              href={`/financeiro/lancamentos/${l.id}/baixar`}
                              className="block rounded px-2 py-2 text-sm font-semibold text-brand hover:bg-brand-soft"
                            >
                              Liquidar
                            </Link>

                            <Link
                              href={`/financeiro/lancamentos/${l.id}/editar`}
                              className="block rounded px-2 py-2 text-sm font-semibold text-brand hover:bg-brand-soft"
                            >
                              Editar
                            </Link>

                            <form action={cancelarLancamento}>
                              <input type="hidden" name="id" value={l.id} />
                              <button type="submit" className="w-full rounded px-2 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50">
                                Cancelar
                              </button>
                            </form>
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-b-xl border border-t-0 border-border bg-surface px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xl font-bold text-ink">Totais do periodo</p>
              <p className="text-sm text-gold">{dataBR(dataSelecionada)} a {dataBR(dataSelecionada)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-ink">Totais do periodo (R$)</p>
              <p className="num font-bold text-ink">{brl(totalDia)}</p>
            </div>
            <MoreHorizontal size={22} className="text-ink" />
          </div>
        </div>
      </div>
    </div>
  );
}
