import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { ImprimirRelatorio } from "@/components/financeiro/imprimir-relatorio";
import { INPUT_CLASS } from "@/components/ui/styles";

const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (valor: string) => new Date(valor + "T12:00:00").toLocaleDateString("pt-BR");
type Linha = { id: string; valor: number; data: string; conta_bancaria_id: string | null; financeiro_lancamentos: { descricao: string; pessoa_id: string | null; tipo: string; unidade_id: string | null; categoria_id: string | null; financeiro_categorias: { nome: string } | null } | null };

export default async function DemonstrativoColaboradores({
  searchParams,
}: {
  searchParams: Promise<{ pessoa?: string; inicio?: string; fim?: string; unidade?: string }>;
}) {
  const sp = await searchParams;
  const hoje = new Date();
  const inicio = /^\d{4}-\d{2}-\d{2}$/.test(sp.inicio ?? "") ? sp.inicio! : hoje.toISOString().slice(0, 7) + "-01";
  const fim = /^\d{4}-\d{2}-\d{2}$/.test(sp.fim ?? "") ? sp.fim! : hoje.toISOString().slice(0, 10);
  const supabase = await createClient();
  const [{ data: pessoas, error: pessoasErro }, { data: unidades, error: unidadesErro }, { data: baixas, error: baixasErro }] = await Promise.all([
    supabase.from("financeiro_pessoas").select("id, nome, categoria_fornecedor").order("nome"),
    supabase.from("financeiro_unidades").select("id, nome").order("nome"),
    supabase.from("financeiro_baixas").select("id, valor, data, conta_bancaria_id, financeiro_lancamentos ( descricao, pessoa_id, tipo, unidade_id, categoria_id, financeiro_categorias ( nome ) )").gte("data", inicio).lte("data", fim).order("data", { ascending: true }).limit(10000),
  ]);
  const erro = pessoasErro || unidadesErro || baixasErro;
  const responsaveis = (pessoas ?? []).filter(p => p.categoria_fornecedor === "funcionario" || p.categoria_fornecedor === "corretor");
  const pessoasRelatorio = responsaveis.length ? responsaveis : (pessoas ?? []);
  const selecionada = (pessoas ?? []).find(p => p.id === sp.pessoa);
  const nomes = new Map((pessoas ?? []).map(p => [p.id, p.nome]));
  const unidadesMap = new Map((unidades ?? []).map(u => [u.id, u.nome]));
  const linhas = ((baixas ?? []) as unknown as Linha[]).filter(b => {
    const l = b.financeiro_lancamentos;
    return l?.tipo === "despesa" && !!l.pessoa_id &&
      (!sp.pessoa || l.pessoa_id === sp.pessoa) &&
      (!sp.unidade || l.unidade_id === sp.unidade) &&
      (sp.pessoa ? true : pessoasRelatorio.some(p => p.id === l.pessoa_id));
  });
  const total = linhas.reduce((n, l) => n + Number(l.valor), 0);
  const resumo = new Map<string, { nome: string; total: number; qtd: number }>();
  for (const b of linhas) {
    const pid = b.financeiro_lancamentos!.pessoa_id!;
    const anterior = resumo.get(pid) ?? { nome: nomes.get(pid) ?? "Pessoa não identificada", total: 0, qtd: 0 };
    anterior.total += Number(b.valor); anterior.qtd++;
    resumo.set(pid, anterior);
  }
  const agrupados = [...resumo.entries()].sort((a,b) => b[1].total - a[1].total);
  const parametros = new URLSearchParams({ inicio, fim, ...(sp.pessoa ? { pessoa: sp.pessoa } : {}), ...(sp.unidade ? { unidade: sp.unidade } : {}) });

  return (
    <div className="financeiro-ui mx-auto w-full min-w-0 space-y-5">
      <div className="print:hidden flex flex-wrap items-start justify-between gap-3">
        <CabecalhoPagina titulo="Demonstrativo de ganhos" descricao="Pagamentos realizados a colaboradores e corretores, detalhados por origem e período." />
        <div className="flex gap-2"><Link href="/financeiro/relatorios" className="rounded-md border border-border px-4 py-2 text-sm">Voltar</Link><ImprimirRelatorio /></div>
      </div>
      <form method="get" className="print:hidden flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
        <label className="text-xs text-ink-muted">Colaborador<select name="pessoa" defaultValue={sp.pessoa ?? ""} className={"mt-1 block " + INPUT_CLASS}><option value="">Todos</option>{(pessoas ?? []).map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
        <label className="text-xs text-ink-muted">Início<input type="date" name="inicio" defaultValue={inicio} className={"mt-1 block " + INPUT_CLASS} /></label>
        <label className="text-xs text-ink-muted">Fim<input type="date" name="fim" defaultValue={fim} className={"mt-1 block " + INPUT_CLASS} /></label>
        <label className="text-xs text-ink-muted">Empresa<select name="unidade" defaultValue={sp.unidade ?? ""} className={"mt-1 block " + INPUT_CLASS}><option value="">Todas</option>{(unidades ?? []).map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></label>
        <button type="submit" className="rounded-md bg-brand px-4 py-2 text-sm text-white">Aplicar filtros</button>
        <a href={"/api/financeiro/relatorio-csv?" + parametros.toString()} className="text-xs text-ink-muted underline">CSV financeiro geral</a>
      </form>
      {erro ? <p className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-800">Não foi possível carregar os dados do demonstrativo. Tente novamente.</p> : (
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm print:border-0 print:shadow-none">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
            <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-brand">Sacra · Gestão Financeira</p><h1 className="mt-2 text-2xl font-bold text-ink">Demonstrativo de ganhos</h1><p className="mt-1 text-sm text-ink-muted">{selecionada?.nome ?? "Consolidado de colaboradores"} · {dataBR(inicio)} a {dataBR(fim)}</p></div>
            <div className="rounded-xl bg-background px-5 py-3"><p className="text-xs text-ink-muted">Total efetivamente pago</p><p className="num text-2xl font-bold text-ink">{moeda(total)}</p><p className="text-xs text-ink-muted">{linhas.length} baixa(s) registrada(s)</p></div>
          </div>
          {!selecionada && <div className="mb-7"><h2 className="mb-3 text-base font-semibold">Consolidado por colaborador</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-xs text-ink-muted"><th className="py-3">Colaborador</th><th>Pagamentos</th><th className="text-right">Total recebido</th></tr></thead><tbody>{agrupados.map(([id, item]) => <tr key={id} className="border-b border-border/60"><td className="py-3">{item.nome}</td><td>{item.qtd}</td><td className="num text-right font-semibold">{moeda(item.total)}</td></tr>)}</tbody></table></div></div>}
          <h2 className="mb-3 text-base font-semibold">Discriminação dos pagamentos</h2>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-xs text-ink-muted"><th className="py-3">Data</th><th>Colaborador</th><th>Origem / descrição</th><th>Categoria</th><th>Empresa</th><th className="text-right">Valor pago</th></tr></thead><tbody>{linhas.map(b => <tr key={b.id} className="border-b border-border/60"><td className="py-3">{dataBR(b.data)}</td><td>{nomes.get(b.financeiro_lancamentos!.pessoa_id!) ?? "—"}</td><td>{b.financeiro_lancamentos!.descricao}</td><td>{b.financeiro_lancamentos!.financeiro_categorias?.nome ?? "Sem categoria"}</td><td>{unidadesMap.get(b.financeiro_lancamentos!.unidade_id ?? "") ?? "—"}</td><td className="num text-right font-medium">{moeda(Number(b.valor))}</td></tr>)}</tbody></table></div>
          {!linhas.length && <p className="py-7 text-center text-sm text-ink-muted">Nenhum pagamento de colaborador encontrado neste período.</p>}
          <div className="mt-6 border-t border-border pt-4 text-xs text-ink-muted">Relatório gerencial com base nas baixas registradas no Vitral. Valores previstos ou não pagos não estão incluídos. Utilize a opção de impressão para salvar como PDF.</div>
        </section>
      )}
    </div>
  );
}
