import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreditCard, Upload, Sparkles, Eraser, Pencil } from "lucide-react";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { GraficoDonut } from "@/components/grafico-donut";
import {
  criarCartao,
  importarFatura,
  categorizarItemFatura,
  aplicarSugestaoCategoria,
  limparCategorizacoes,
  apagarFatura,
} from "./actions";

const campoClasse =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

function brl(v: number): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dataBR(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}
function competenciaBR(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export default async function CartaoCorporativoPage({
  searchParams,
}: {
  searchParams: Promise<{ cartao?: string; fatura?: string }>;
}) {
  const { cartao: cartaoParam, fatura: faturaParam } = await searchParams;
  const supabase = await createClient();

  const [{ data: cartoes }, { data: categorias }, { data: centros }] = await Promise.all([
    supabase.from("financeiro_cartoes").select("id, nome, banco, final_digitos, ativo").eq("ativo", true).order("nome"),
    supabase.from("financeiro_categorias").select("id, nome").eq("tipo", "despesa").order("nome"),
    supabase.from("financeiro_centros_custo").select("id, nome").order("nome"),
  ]);

  if (!cartoes || cartoes.length === 0) {
    return (
      <div className="financeiro-ui mx-auto max-w-[1100px] space-y-5">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Cartão corporativo</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Importe a fatura do cartão da empresa e categorize os lançamentos pra controlar os gastos por
            categoria e centro de resultado.
          </p>
        </div>
        <form action={criarCartao} className="space-y-3 rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
          <CabecalhoSecao icon={CreditCard} titulo="Cadastre o cartão corporativo" descricao="Comece cadastrando o cartão pra depois importar as faturas dele." />
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="nome" required placeholder="Nome (ex: Itaú Empresas)" className={campoClasse} />
            <input name="banco" placeholder="Banco (opcional)" className={campoClasse} />
          </div>
          <input name="final_digitos" placeholder="Final do cartão (ex: 1234, opcional)" className={campoClasse} />
          <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Cadastrar cartão
          </button>
        </form>
      </div>
    );
  }

  const cartaoAtivo = cartoes.find((c) => c.id === cartaoParam) ?? cartoes[0];
  const { data: faturas } = await supabase
    .from("financeiro_faturas")
    .select("id, competencia, vencimento")
    .eq("cartao_id", cartaoAtivo.id)
    .order("competencia", { ascending: false });

  const faturaAtiva = (faturas ?? []).find((f) => f.id === faturaParam) ?? (faturas ?? [])[0] ?? null;

  let itens: {
    id: string;
    data: string;
    estabelecimento: string;
    descricao: string | null;
    valor: number;
    parcela_atual: number | null;
    parcela_total: number | null;
    categoria_id: string | null;
    centro_custo_id: string | null;
    financeiro_categorias: { nome: string } | null;
  }[] = [];
  if (faturaAtiva) {
    const { data } = await supabase
      .from("financeiro_fatura_itens")
      .select(
        "id, data, estabelecimento, descricao, valor, parcela_atual, parcela_total, categoria_id, centro_custo_id, financeiro_categorias ( nome )"
      )
      .eq("fatura_id", faturaAtiva.id)
      .order("data");
    itens = (data ?? []) as unknown as typeof itens;
  }

  const valorTotal = itens.reduce((s, i) => s + Number(i.valor), 0);
  const valorCategorizado = itens.filter((i) => i.categoria_id).reduce((s, i) => s + Number(i.valor), 0);
  const valorPendente = valorTotal - valorCategorizado;

  const distribuicao = (() => {
    const mapa = new Map<string, number>();
    itens
      .filter((i) => i.categoria_id)
      .forEach((i) => {
        const nome = i.financeiro_categorias?.nome ?? "Sem categoria";
        mapa.set(nome, (mapa.get(nome) ?? 0) + Number(i.valor));
      });
    return Array.from(mapa.entries()).map(([nome, valor]) => ({ nome, valor }));
  })();

  return (
    <div className="financeiro-ui mx-auto max-w-[1480px] space-y-5">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Cartão corporativo</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Importe a fatura do cartão da empresa e categorize os lançamentos pra controlar os gastos por
          categoria e centro de resultado.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {cartoes.map((c) => (
          <Link
            key={c.id}
            href={`/financeiro/cartao-corporativo?cartao=${c.id}`}
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
              cartaoAtivo.id === c.id ? "border-brand bg-brand text-white" : "border-border/60 bg-surface text-ink hover:bg-background"
            }`}
          >
            {c.nome} {c.final_digitos && `•••• ${c.final_digitos}`}
          </Link>
        ))}
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-lg border border-dashed border-border px-3 py-2 text-sm text-ink-muted hover:bg-background">
            + novo cartão
          </summary>
          <form
            action={criarCartao}
            className="absolute left-0 z-20 mt-1 w-72 space-y-2 rounded-md border border-border bg-surface p-3 shadow-md"
          >
            <input name="nome" required placeholder="Nome (ex: Itaú Empresas)" className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand" />
            <input name="banco" placeholder="Banco (opcional)" className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand" />
            <input name="final_digitos" placeholder="Final do cartão (opcional)" className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand" />
            <button type="submit" className="w-full rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-white hover:opacity-90">
              Cadastrar
            </button>
          </form>
        </details>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {(faturas ?? []).map((f) => (
          <Link
            key={f.id}
            href={`/financeiro/cartao-corporativo?cartao=${cartaoAtivo.id}&fatura=${f.id}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
              faturaAtiva?.id === f.id ? "bg-brand/10 text-brand" : "text-ink-muted hover:bg-background"
            }`}
          >
            {competenciaBR(f.competencia)}
          </Link>
        ))}
        <details className="relative ml-auto">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:opacity-90">
            <Upload size={14} strokeWidth={2} />
            Importar fatura
          </summary>
          <form
            action={importarFatura}
            encType="multipart/form-data"
            className="absolute right-0 z-20 mt-1 w-80 space-y-2 rounded-md border border-border bg-surface p-3 shadow-md"
          >
            <input type="hidden" name="cartao_id" value={cartaoAtivo.id} />
            <div>
              <label className="mb-1 block text-[11px] font-medium text-ink-muted">Competência</label>
              <input name="competencia" type="month" required className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-ink-muted">Vencimento (opcional)</label>
              <input name="vencimento" type="date" className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-ink-muted">Arquivo CSV</label>
              <input name="arquivo" type="file" accept=".csv,text/csv" required className="w-full text-xs" />
              <p className="mt-1 text-[10px] text-ink-muted">
                Colunas esperadas: data, estabelecimento, valor — e opcionalmente descrição e parcela
                (formato &quot;2/10&quot;). A 1ª linha deve ser o cabeçalho.
              </p>
            </div>
            <button type="submit" className="w-full rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-white hover:opacity-90">
              Importar
            </button>
          </form>
        </details>
      </div>

      {!faturaAtiva ? (
        <p className="rounded-xl border border-border/60 bg-surface p-8 text-center text-sm text-ink-muted shadow-sm">
          Nenhuma fatura importada ainda pra esse cartão. Use &quot;Importar fatura&quot; acima.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-surface p-4 shadow-sm">
                <p className="text-xs text-ink-muted">Valor total da fatura</p>
                <p className="num text-xl font-bold text-ink">{brl(valorTotal)}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-emerald-50 p-4 shadow-sm">
                <p className="text-xs text-emerald-700">
                  Categorizado ({valorTotal > 0 ? ((valorCategorizado / valorTotal) * 100).toFixed(1) : "0"}%)
                </p>
                <p className="num text-xl font-bold text-emerald-700">{brl(valorCategorizado)}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-amber-50 p-4 shadow-sm">
                <p className="text-xs text-amber-700">
                  Pendente ({valorTotal > 0 ? ((valorPendente / valorTotal) * 100).toFixed(1) : "0"}%)
                </p>
                <p className="num text-xl font-bold text-amber-700">{brl(valorPendente)}</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border/60 bg-surface shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
                    <th className="px-4 py-2.5 font-medium">Data</th>
                    <th className="px-4 py-2.5 font-medium">Estabelecimento</th>
                    <th className="px-4 py-2.5 font-medium">Valor</th>
                    <th className="px-4 py-2.5 font-medium">Parcela</th>
                    <th className="px-4 py-2.5 font-medium">Categoria</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {itens.map((it) => (
                    <tr key={it.id}>
                      <td className="px-4 py-2.5 text-ink-muted">{dataBR(it.data)}</td>
                      <td className="px-4 py-2.5 text-ink">
                        {it.estabelecimento}
                        {it.descricao && <p className="text-xs text-ink-muted">{it.descricao}</p>}
                      </td>
                      <td className="num px-4 py-2.5 text-ink">{brl(it.valor)}</td>
                      <td className="px-4 py-2.5 text-ink-muted">
                        {it.parcela_atual && it.parcela_total ? `${it.parcela_atual}/${it.parcela_total}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-ink-muted">{it.financeiro_categorias?.nome ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            it.categoria_id ? "text-emerald-700" : "text-amber-700"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${it.categoria_id ? "bg-emerald-500" : "bg-amber-500"}`} />
                          {it.categoria_id ? "Categorizado" : "Pendente"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <details className="relative">
                          <summary
                            className="cursor-pointer list-none rounded-md p-1.5 text-ink-muted hover:bg-background hover:text-brand"
                            title="Categorizar"
                          >
                            <Pencil size={14} strokeWidth={2} />
                          </summary>
                          <form
                            action={categorizarItemFatura}
                            className="absolute right-0 z-20 mt-1 w-64 space-y-2 rounded-md border border-border bg-surface p-3 shadow-md"
                          >
                            <input type="hidden" name="id" value={it.id} />
                            <select
                              name="categoria_id"
                              required
                              defaultValue={it.categoria_id ?? ""}
                              className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                            >
                              <option value="" disabled>
                                Categoria...
                              </option>
                              {(categorias ?? []).map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nome}
                                </option>
                              ))}
                            </select>
                            <select
                              name="centro_custo_id"
                              defaultValue={it.centro_custo_id ?? ""}
                              className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-xs outline-none focus:border-brand"
                            >
                              <option value="">Centro de resultado (opcional)</option>
                              {(centros ?? []).map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nome}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="w-full rounded-md bg-brand px-2 py-1.5 text-xs font-medium text-white hover:opacity-90"
                            >
                              Salvar
                            </button>
                          </form>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-border px-4 py-2.5 text-right text-sm font-semibold text-ink">
                Total da fatura ({itens.length} lançamentos): {brl(valorTotal)}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-surface p-4 shadow-sm">
              <GraficoDonut titulo="Distribuição por categoria" fatias={distribuicao} />
            </div>

            <div className="space-y-2 rounded-xl border border-border/60 bg-surface p-4 shadow-sm">
              <p className="text-sm font-semibold text-ink">Ações em lote</p>
              <form action={aplicarSugestaoCategoria}>
                <input type="hidden" name="fatura_id" value={faturaAtiva.id} />
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm text-ink hover:bg-background"
                >
                  <Sparkles size={15} strokeWidth={2} className="text-brand" />
                  Aplicar sugestão de categoria
                </button>
              </form>
              <p className="text-[11px] text-ink-muted">
                Categoriza automaticamente os itens pendentes cujo estabelecimento já foi categorizado antes,
                em qualquer fatura.
              </p>
              <form action={limparCategorizacoes}>
                <input type="hidden" name="fatura_id" value={faturaAtiva.id} />
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm text-ink hover:bg-background"
                >
                  <Eraser size={15} strokeWidth={2} className="text-ink-muted" />
                  Limpar categorizações desta fatura
                </button>
              </form>
              <form action={apagarFatura}>
                <input type="hidden" name="id" value={faturaAtiva.id} />
                <button type="submit" className="mt-2 text-xs text-ink-muted hover:text-rose-600">
                  apagar esta fatura
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
