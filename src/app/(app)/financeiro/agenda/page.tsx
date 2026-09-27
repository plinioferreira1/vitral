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
import { registrarBaixa, cancelarLancamento, editarLancamento } from "../lancamentos-actions";
import { hojeISO } from "@/lib/data-br";

const campoClasse =
  "w-full rounded-md border border-[#c9d5e8] bg-white px-3 py-2 text-sm text-[#1f2a44] outline-none focus:border-[#2680eb] focus:ring-1 focus:ring-[#2680eb]";

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
    <div className="mx-auto max-w-[1600px] space-y-2 bg-[#f3f7fc] text-[#1f2a44]">
      <div className="flex flex-wrap items-center gap-3 py-1">
        <Link
          href="/financeiro/contas-a-pagar"
          className="inline-flex items-center gap-2 rounded bg-[#13a44b] px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#0f8f40]"
        >
          Nova despesa
          <ChevronDown size={15} />
        </Link>
        <Link
          href="/financeiro/relatorios"
          className="inline-flex items-center gap-2 rounded bg-[#2680eb] px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#176bd0]"
        >
          Relatorios
          <ChevronDown size={15} />
        </Link>
        <button className="rounded border border-[#c9d5e8] bg-white px-3 py-1.5 text-sm font-semibold text-[#0046a8]">
          Exportar
        </button>
        <button className="rounded border border-[#c9d5e8] bg-white px-3 py-1.5 text-sm font-semibold text-[#0046a8]">
          Imprimir
        </button>
        <button className="rounded border border-[#c9d5e8] bg-white px-3 py-1.5 text-sm font-semibold text-[#0046a8]">
          Importar planilha
        </button>
        <div className="ml-auto flex items-center gap-2 text-sm font-semibold text-[#005fd3]">
          <HelpCircle size={17} fill="#2680eb" className="text-white" />
          Ajuda rapida
        </div>
      </div>

      <div className="rounded bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="hidden h-16 w-20 items-center justify-center rounded-full bg-[#e8f4ff] text-3xl font-black text-[#2680eb] sm:flex">
            $
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-[#1f2a44]">Pague suas contas com a Conta PJ e economize tempo!</p>
            <div className="mt-2 flex flex-wrap gap-x-8 gap-y-2 text-sm text-[#1f2a44]">
              <span className="text-[#006ee6]">✓ <span className="text-[#1f2a44]">Conciliacao automatica</span></span>
              <span className="text-[#006ee6]">✓ <span className="text-[#1f2a44]">Financeiro totalmente integrado ao ERP</span></span>
              <span className="text-[#006ee6]">✓ <span className="text-[#1f2a44]">Comprovantes anexados automaticamente as despesas</span></span>
            </div>
          </div>
          <button className="text-xl leading-none text-[#4b5872]">×</button>
        </div>
      </div>

      <div className="rounded bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[315px_minmax(280px,1fr)_180px_128px] lg:items-end">
          <div>
            <p className="mb-1 text-sm text-[#39465f]">Vencimento</p>
            <div className="grid grid-cols-[40px_1fr_40px] overflow-hidden rounded border border-[#c9d5e8]">
              <Link
                href={construirUrl({ data: moverData(dataSelecionada, -1), tipo: filtros.tipo, q: filtros.q })}
                className="flex items-center justify-center bg-[#edf4ff] text-[#0050b8]"
              >
                <ChevronLeft size={19} />
              </Link>
              <div className="flex items-center justify-center gap-2 border-x border-[#c9d5e8] bg-[#f8fbff] px-3 text-sm font-bold text-[#0050b8]">
                {dataBR(dataSelecionada)}
                <ChevronDown size={15} />
              </div>
              <Link
                href={construirUrl({ data: moverData(dataSelecionada, 1), tipo: filtros.tipo, q: filtros.q })}
                className="flex items-center justify-center bg-[#edf4ff] text-[#0050b8]"
              >
                <ChevronRight size={19} />
              </Link>
            </div>
          </div>

          <form method="get" action="/financeiro/agenda">
            <p className="mb-1 text-sm text-[#39465f]">Pesquisar no periodo selecionado</p>
            <div className="flex">
              <input type="hidden" name="data" value={dataSelecionada} />
              {filtros.tipo && <input type="hidden" name="tipo" value={filtros.tipo} />}
              <input name="q" defaultValue={filtros.q ?? ""} placeholder="Pesquisar" className={`${campoClasse} rounded-r-none`} />
              <button className="rounded-r-md border border-l-0 border-[#c9d5e8] bg-[#f8fbff] px-4 text-[#0050b8]">
                <Search size={19} />
              </button>
            </div>
          </form>

          <div>
            <p className="mb-1 text-sm text-[#39465f]">Conta</p>
            <select className={campoClasse} defaultValue="">
              <option value="">Selecionar todas</option>
              {(contas ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <button className="inline-flex items-center justify-center gap-2 rounded border border-[#c9d5e8] bg-[#f8fbff] px-3 py-2 text-sm font-bold text-[#0050b8]">
            Mais filtros
            <ChevronDown size={15} />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          <p className="text-sm text-[#39465f]">Mais filtros selecionados</p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#c9d5e8] bg-[#f3f8ff] px-3 py-1.5 text-sm text-[#0050b8]">
              Situacao: Em Aberto
              <span className="text-[#6b7690]">×</span>
            </span>
            {filtros.tipo && (
              <span className="inline-flex items-center gap-2 rounded-full border border-[#c9d5e8] bg-[#f3f8ff] px-3 py-1.5 text-sm text-[#0050b8]">
                Tipo: {filtros.tipo === "despesa" ? "A Pagar" : "A Receber"}
                <span className="text-[#6b7690]">×</span>
              </span>
            )}
            <Link href="/financeiro/agenda" className="inline-flex items-center gap-2 text-sm text-[#0050b8]">
              <Trash2 size={14} />
              Limpar filtros
            </Link>
          </div>
        </div>

        <div className="mt-5 grid overflow-hidden rounded-t border border-[#c9d5e8] text-center text-sm lg:grid-cols-5">
          <div className="border-b border-[#c9d5e8] p-3 lg:border-b-0 lg:border-r">
            <p>Vencidos (R$)</p>
            <p className="num text-xl font-bold text-[#ff1f1f]">{brl(vencidosPeriodo)}</p>
          </div>
          <div className="border-b border-[#c9d5e8] p-3 lg:border-b-0 lg:border-r">
            <p>Vencem hoje (R$)</p>
            <p className="num text-xl font-bold text-[#ff1f1f]">{brl(dataSelecionada === hoje ? vencemHojePeriodo : 0)}</p>
          </div>
          <div className="border-b border-[#c9d5e8] p-3 lg:border-b-0 lg:border-r">
            <p>A vencer (R$)</p>
            <p className="num text-xl font-bold text-[#087cff]">{brl(dataSelecionada > hoje ? vencemHojePeriodo + aVencerPeriodo : aVencerPeriodo)}</p>
          </div>
          <div className="border-b border-[#c9d5e8] p-3 lg:border-b-0 lg:border-r">
            <p>Pagos (R$)</p>
            <p className="num text-xl font-bold text-[#00a84f]">R$ 0,00</p>
          </div>
          <div className="border-t-2 border-[#087cff] p-3">
            <p className="inline-flex items-center gap-1">
              Total do periodo (R$)
              <HelpCircle size={14} />
            </p>
            <p className="num text-xl font-bold text-[#087cff]">{brl(totalDia)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-x border-[#c9d5e8] bg-[#f7faff] px-2 py-2 text-sm">
          <span>0 registro(s) selecionado(s)</span>
          <button disabled className="rounded border border-[#c9d5e8] bg-[#eef3fb] px-3 py-1.5 font-bold text-[#8ba1c5]">
            Pagar pelo CA de Bolso
          </button>
          <button className="inline-flex items-center gap-2 rounded border border-[#c9d5e8] bg-white px-3 py-1.5 font-bold text-[#0050b8]">
            Acoes em lote
            <ChevronDown size={15} />
          </button>
        </div>

        <div className="overflow-x-auto border border-[#c9d5e8]">
          <table className="min-w-[1100px] w-full border-collapse text-left text-sm">
            <thead className="bg-[#f1f5fb] text-[#39465f]">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input type="checkbox" className="h-4 w-4 rounded border-[#2680eb]" />
                </th>
                <th className="px-4 py-3 font-bold">Vencimento</th>
                <th className="px-4 py-3 font-bold">Pagamento</th>
                <th className="px-4 py-3 font-bold">Resumo do lancamento <HelpCircle size={14} className="inline" /></th>
                <th className="px-4 py-3 text-right font-bold">Total (R$)</th>
                <th className="px-4 py-3 text-right font-bold">A pagar (R$)</th>
                <th className="px-4 py-3 font-bold">Situacao</th>
                <th className="px-4 py-3 text-right font-bold">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#2680eb] text-[#2680eb]">+</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c9d5e8] bg-white">
              {lancamentosDoDia.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[#6b7690]">
                    Nenhum lancamento em aberto para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                lancamentosDoDia.map((l) => (
                  <tr key={l.id} className="hover:bg-[#f8fbff]">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="h-4 w-4 rounded border-[#2680eb]" />
                    </td>
                    <td className="px-4 py-3">{dataBR(l.vencimento)}</td>
                    <td className="px-4 py-3">{dataBR(l.vencimento)}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1f2a44]">{l.descricao}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded bg-[#eef1f6] px-2 py-0.5 text-[#39465f]">
                          {l.financeiro_categorias?.nome ?? (l.tipo === "despesa" ? "Despesa" : "Receita")}
                        </span>
                        <span className="text-[#39465f]">{l.financeiro_pessoas?.nome ?? "Sem pessoa vinculada"}</span>
                      </div>
                    </td>
                    <td className="num px-4 py-3 text-right font-medium">{brl(l.valor)}</td>
                    <td className="num px-4 py-3 text-right font-medium">{l.tipo === "despesa" ? brl(l.valor) : "0,00"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-[#fff1c2] px-4 py-1 text-xs font-medium text-[#855b00]">
                        {statusLabel(l.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <MessageCircle size={18} className="text-[#2680eb]" />
                        <details className="relative">
                          <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded border border-[#c9d5e8] bg-[#f8fbff] px-3 py-1.5 text-sm font-bold text-[#0050b8]">
                            Acoes
                            <ChevronDown size={15} />
                          </summary>
                          <div className="absolute right-0 z-20 mt-2 w-72 rounded border border-[#c9d5e8] bg-white p-3 shadow-xl">
                            <details>
                              <summary className="cursor-pointer list-none rounded px-2 py-2 text-sm font-semibold text-[#0050b8] hover:bg-[#f3f8ff]">
                                Liquidar
                              </summary>
                              <form action={registrarBaixa} className="mt-2 space-y-2">
                                <input type="hidden" name="lancamento_id" value={l.id} />
                                <input name="valor" type="number" step="0.01" required defaultValue={l.valor} className={campoClasse} />
                                <input name="data" type="date" required defaultValue={hoje} className={campoClasse} />
                                <select name="conta_bancaria_id" defaultValue="" className={campoClasse}>
                                  <option value="">Conta bancaria</option>
                                  {(contas ?? []).map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.nome}
                                    </option>
                                  ))}
                                </select>
                                <button type="submit" className="w-full rounded bg-[#13a44b] px-3 py-2 text-sm font-bold text-white">
                                  Confirmar
                                </button>
                              </form>
                            </details>

                            <details>
                              <summary className="cursor-pointer list-none rounded px-2 py-2 text-sm font-semibold text-[#0050b8] hover:bg-[#f3f8ff]">
                                Editar
                              </summary>
                              <form action={editarLancamento} className="mt-2 space-y-2">
                                <input type="hidden" name="id" value={l.id} />
                                <input name="descricao" defaultValue={l.descricao} required placeholder="Descricao" className={campoClasse} />
                                <input name="valor" type="number" step="0.01" defaultValue={l.valor} required className={campoClasse} />
                                <input name="vencimento" type="date" defaultValue={l.vencimento} required className={campoClasse} />
                                {l.recorrencia_id && (
                                  <div className="space-y-1 rounded bg-[#f3f7fc] p-2 text-xs">
                                    <p className="font-medium text-[#6b7690]">Faz parte de uma recorrencia. Aplicar a:</p>
                                    <label className="flex items-center gap-1.5">
                                      <input type="radio" name="escopo" value="um" defaultChecked className="accent-[#2680eb]" />
                                      Somente este lancamento
                                    </label>
                                    <label className="flex items-center gap-1.5">
                                      <input type="radio" name="escopo" value="todos_futuros" className="accent-[#2680eb]" />
                                      Este e todos os futuros
                                    </label>
                                  </div>
                                )}
                                <button type="submit" className="w-full rounded bg-[#2680eb] px-3 py-2 text-sm font-bold text-white">
                                  Salvar
                                </button>
                              </form>
                            </details>

                            <form action={cancelarLancamento}>
                              <input type="hidden" name="id" value={l.id} />
                              <button type="submit" className="w-full rounded px-2 py-2 text-left text-sm font-semibold text-[#b40020] hover:bg-[#fff1f1]">
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

        <div className="rounded-b border border-t-0 border-[#c9d5e8] bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xl font-bold text-[#1f2a44]">Totais do periodo</p>
              <p className="text-sm text-[#8a5b2b]">{dataBR(dataSelecionada)} a {dataBR(dataSelecionada)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[#1f2a44]">Totais do periodo (R$)</p>
              <p className="num font-bold text-[#1f2a44]">{brl(totalDia)}</p>
            </div>
            <MoreHorizontal size={22} className="text-[#1f2a44]" />
          </div>
        </div>
      </div>
    </div>
  );
}
