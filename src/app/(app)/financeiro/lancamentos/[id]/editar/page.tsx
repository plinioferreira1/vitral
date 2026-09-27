import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowLeft, CalendarDays, FileText, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BuscaOpcaoFinanceira } from "@/components/financeiro/busca-opcao";
import { CampoMoeda } from "@/components/financeiro/campo-moeda";
import { editarLancamento } from "../../../lancamentos-actions";

const campoClasse =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10";

function brl(v: number): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dataBR(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

type Lancamento = {
  id: string;
  tipo: "receita" | "despesa";
  descricao: string;
  valor: number;
  vencimento: string;
  competencia: string | null;
  status: string;
  recorrencia_id: string | null;
  pessoa_id: string | null;
  categoria_id: string | null;
  centro_custo_id: string | null;
  unidade_id: string | null;
  conta_bancaria_id: string | null;
  forma_pagamento: string | null;
  numero_documento: string | null;
  observacoes: string | null;
};

type OcorrenciaResumo = {
  id: string;
  status: string;
  vencimento: string;
  valor: number;
};

export default async function EditarLancamentoFinanceiroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lancamentoRaw } = await supabase
    .from("financeiro_lancamentos")
    .select(
      "id, tipo, descricao, valor, vencimento, competencia, status, recorrencia_id, pessoa_id, categoria_id, centro_custo_id, unidade_id, conta_bancaria_id, forma_pagamento, numero_documento, observacoes"
    )
    .eq("id", id)
    .single();

  if (!lancamentoRaw) notFound();
  const lancamento = lancamentoRaw as Lancamento;

  const [{ data: pessoas }, { data: categorias }, { data: centros }, { data: contas }, { data: baixas }] =
    await Promise.all([
      supabase.from("financeiro_pessoas").select("id, nome").order("nome"),
      supabase.from("financeiro_categorias").select("id, nome").eq("tipo", lancamento.tipo).order("nome"),
      supabase.from("financeiro_centros_custo").select("id, nome").order("nome"),
      supabase.from("financeiro_contas_bancarias").select("id, nome").eq("ativa", true).order("nome"),
      supabase.from("financeiro_baixas").select("valor").eq("lancamento_id", id),
    ]);

  const { data: ocorrenciasRaw } = lancamento.recorrencia_id
    ? await supabase
        .from("financeiro_lancamentos")
        .select("id, status, vencimento, valor")
        .eq("recorrencia_id", lancamento.recorrencia_id)
        .order("vencimento")
    : { data: [] };

  const totalBaixado = (baixas ?? []).reduce((s, b) => s + Number(b.valor), 0);
  const saldoAberto = Math.max(0, Number(lancamento.valor) - totalBaixado);
  const rotuloPessoa = lancamento.tipo === "receita" ? "Cliente" : "Fornecedor";
  const retorno = lancamento.tipo === "receita" ? "/financeiro/contas-a-receber#lista" : "/financeiro/contas-a-pagar#lista";
  const ocorrencias = (ocorrenciasRaw ?? []) as OcorrenciaResumo[];
  const ocorrenciasAbertas = ocorrencias.filter((o) => o.status === "pendente" || o.status === "pago_parcial");
  const primeiraOcorrencia = ocorrencias[0]?.vencimento;
  const ultimaOcorrencia = ocorrencias[ocorrencias.length - 1]?.vencimento;

  return (
    <form action={editarLancamento} className="financeiro-ui mx-auto max-w-[1180px] space-y-5 pb-24">
      <input type="hidden" name="id" value={lancamento.id} />
      <input type="hidden" name="return_to" value={retorno} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={retorno} className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">
            <ArrowLeft size={16} />
            Voltar
          </Link>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Editar lançamento</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Ajuste dados cadastrais, vencimento e condição de pagamento sem perder o histórico financeiro.
          </p>
        </div>
        <button type="submit" className="rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-90">
          Salvar alterações
        </button>
      </div>

      {lancamento.recorrencia_id && (
        <div className="rounded-xl border border-brand/25 bg-brand-soft p-4">
          <div className="flex gap-3">
            <AlertCircle size={20} className="mt-0.5 shrink-0 text-brand" />
            <div>
              <p className="font-bold text-ink">Lançamento recorrente</p>
              <p className="mt-1 text-sm text-ink-muted">
                Você pode editar somente este lançamento ou aplicar os dados cadastrais nas próximas ocorrências em aberto.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-surface px-3 py-2">
              <p className="text-xs text-ink-muted">Ocorrências geradas</p>
              <p className="num text-lg font-bold text-ink">{ocorrencias.length}</p>
            </div>
            <div className="rounded-lg bg-surface px-3 py-2">
              <p className="text-xs text-ink-muted">Em aberto</p>
              <p className="num text-lg font-bold text-ink">{ocorrenciasAbertas.length}</p>
            </div>
            <div className="rounded-lg bg-surface px-3 py-2">
              <p className="text-xs text-ink-muted">Período</p>
              <p className="text-sm font-semibold text-ink">
                {primeiraOcorrencia && ultimaOcorrencia ? `${dataBR(primeiraOcorrencia)} a ${dataBR(ultimaOcorrencia)}` : "A confirmar"}
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <FileText size={18} className="text-brand" />
          <h2 className="text-base font-bold text-ink">Informações do lançamento</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_170px_1.8fr_170px]">
          <BuscaOpcaoFinanceira name="pessoa_id" label={rotuloPessoa} options={pessoas ?? []} initialId={lancamento.pessoa_id ?? ""} />
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Data de competência</label>
            <input name="competencia" type="date" defaultValue={lancamento.competencia ?? lancamento.vencimento} className={campoClasse} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Descrição *</label>
            <input name="descricao" required defaultValue={lancamento.descricao} className={campoClasse} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Valor *</label>
            <CampoMoeda name="valor" required defaultValue={lancamento.valor} className={campoClasse} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1.4fr_1fr_150px]">
          <BuscaOpcaoFinanceira
            name="categoria_id"
            label="Categoria"
            options={categorias ?? []}
            initialId={lancamento.categoria_id ?? ""}
          />
          <BuscaOpcaoFinanceira
            name="centro_custo_id"
            label="Centro de resultado"
            options={centros ?? []}
            initialId={lancamento.centro_custo_id ?? ""}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Código de referência</label>
            <input name="numero_documento" defaultValue={lancamento.numero_documento ?? ""} className={campoClasse} />
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-muted">Saldo em aberto</p>
            <p className="num text-xl font-bold text-ink">{brl(saldoAberto)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <Wallet size={18} className="text-brand" />
          <h2 className="text-base font-bold text-ink">Condição de pagamento</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-[170px_1.2fr_1.2fr] lg:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Vencimento *</label>
            <input name="vencimento" type="date" defaultValue={lancamento.vencimento} required className={campoClasse} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Forma de pagamento</label>
            <input name="forma_pagamento" defaultValue={lancamento.forma_pagamento ?? ""} autoComplete="off" className={campoClasse} />
          </div>
          <BuscaOpcaoFinanceira
            name="conta_bancaria_id"
            label="Conta prevista"
            options={contas ?? []}
            initialId={lancamento.conta_bancaria_id ?? ""}
          />
        </div>

        {lancamento.recorrencia_id && (
          <div className="mt-5 rounded-xl border border-border bg-background p-4">
            <p className="text-sm font-bold text-ink">Aplicar alterações</p>
            <p className="mt-1 text-xs text-ink-muted">
              Valor, categoria, pessoa, conta e observações podem ser replicados nas ocorrências futuras ainda em aberto.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-sm text-ink">
                <input type="radio" name="escopo" value="um" defaultChecked className="accent-brand" />
                <span>
                  <span className="block font-semibold">Somente este lançamento</span>
                  <span className="text-xs text-ink-muted">Use para uma correção pontual.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-sm text-ink">
                <input type="radio" name="escopo" value="todos_futuros" className="accent-brand" />
                <span>
                  <span className="block font-semibold">Este e todos os futuros em aberto</span>
                  <span className="text-xs text-ink-muted">Mantém pagamentos já feitos e atualiza a sequência.</span>
                </span>
              </label>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <CalendarDays size={18} className="text-brand" />
          <h2 className="text-base font-bold text-ink">Observações</h2>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Observações</label>
          <textarea name="observacoes" rows={4} defaultValue={lancamento.observacoes ?? ""} className={campoClasse} />
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] justify-between gap-3">
          <Link href={retorno} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink-muted hover:bg-background">
            Voltar
          </Link>
          <button type="submit" className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90">
            Salvar
          </button>
        </div>
      </div>
    </form>
  );
}
