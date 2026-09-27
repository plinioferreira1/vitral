import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CampoMascarado } from "@/components/financeiro/campo-mascarado";
import { CampoMoeda } from "@/components/financeiro/campo-moeda";
import { registrarBaixa } from "../../../lancamentos-actions";
import { hojeISO } from "@/lib/data-br";

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
  forma_pagamento: string | null;
  conta_bancaria_id: string | null;
  observacoes: string | null;
  financeiro_pessoas: { nome: string; cpf_cnpj?: string | null } | null;
  financeiro_categorias: { nome: string } | null;
};

export default async function BaixarLancamentoFinanceiroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const hoje = hojeISO();

  const [{ data: lancamentoRaw }, { data: contas }, { data: baixas }] = await Promise.all([
    supabase
      .from("financeiro_lancamentos")
      .select(
        "id, tipo, descricao, valor, vencimento, competencia, status, forma_pagamento, conta_bancaria_id, observacoes, financeiro_pessoas ( nome, cpf_cnpj ), financeiro_categorias ( nome )"
      )
      .eq("id", id)
      .single(),
    supabase.from("financeiro_contas_bancarias").select("id, nome").eq("ativa", true).order("nome"),
    supabase.from("financeiro_baixas").select("valor").eq("lancamento_id", id),
  ]);

  if (!lancamentoRaw) notFound();
  const lancamento = lancamentoRaw as unknown as Lancamento;
  const totalBaixado = (baixas ?? []).reduce((s, b) => s + Number(b.valor), 0);
  const saldoAberto = Math.max(0, Number(lancamento.valor) - totalBaixado);
  const retorno = lancamento.tipo === "receita" ? "/financeiro/contas-a-receber#lista" : "/financeiro/contas-a-pagar#lista";
  const acao = lancamento.tipo === "receita" ? "recebimento" : "pagamento";
  const titulo = lancamento.tipo === "receita" ? "Registrar recebimento" : "Registrar pagamento";

  return (
    <form action={registrarBaixa} className="financeiro-ui mx-auto max-w-[1180px] space-y-5 pb-24">
      <input type="hidden" name="lancamento_id" value={lancamento.id} />
      <input type="hidden" name="return_to" value={retorno} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={retorno} className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">
            <ArrowLeft size={16} />
            Voltar
          </Link>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">{titulo}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Baixe total ou parcialmente o lançamento e mantenha o saldo atualizado.
          </p>
        </div>
        <button type="submit" className="rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-90">
          Confirmar {acao}
        </button>
      </div>

      <section className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <FileText size={18} className="text-brand" />
          <h2 className="text-base font-bold text-ink">Resumo do lançamento</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_160px_160px_160px] lg:items-end">
          <div>
            <p className="text-xs font-medium text-ink-muted">Descrição</p>
            <p className="mt-1 text-base font-bold text-ink">{lancamento.descricao}</p>
            <p className="mt-1 text-sm text-ink-muted">
              {lancamento.financeiro_categorias?.nome ?? "Sem categoria"} · {lancamento.financeiro_pessoas?.nome ?? "Sem pessoa vinculada"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-muted">Vencimento</p>
            <p className="num mt-1 text-sm font-semibold text-ink">{dataBR(lancamento.vencimento)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-ink-muted">Valor original</p>
            <p className="num mt-1 text-sm font-semibold text-ink">{brl(lancamento.valor)}</p>
          </div>
          <div className="rounded-lg bg-brand-soft p-3 text-right">
            <p className="text-xs font-medium text-brand">Saldo em aberto</p>
            <p className="num text-xl font-bold text-brand">{brl(saldoAberto)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <Wallet size={18} className="text-brand" />
          <h2 className="text-base font-bold text-ink">Condição do {acao}</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-[170px_1.2fr_1.2fr] lg:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Data *</label>
            <input name="data" type="date" defaultValue={hoje} required className={campoClasse} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Forma de pagamento</label>
            <input name="forma_pagamento" defaultValue={lancamento.forma_pagamento ?? ""} placeholder="Pix, boleto, TED..." className={campoClasse} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Conta</label>
            <select name="conta_bancaria_id" defaultValue={lancamento.conta_bancaria_id ?? ""} className={campoClasse}>
              <option value="">Selecione...</option>
              {(contas ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-brand/15 bg-brand-soft/60 p-4">
          <p className="text-sm font-bold text-ink">Valor do {acao}</p>
          <div className="mt-3 max-w-[240px]">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Valor a baixar *</label>
                <CampoMoeda name="valor" required defaultValue={saldoAberto} className={campoClasse} />
            </div>
          </div>
        </div>

        {lancamento.tipo === "despesa" && (
          <div className="mt-5 rounded-xl border border-border bg-background p-4">
            <label className="flex items-start gap-3 text-sm text-ink">
              <input type="checkbox" name="gerar_recibo" className="mt-1 accent-brand" />
              <span>
                <span className="block font-semibold">Gerar recibo deste pagamento</span>
                <span className="mt-0.5 block text-xs leading-5 text-ink-muted">
                  Use quando precisar emitir um recibo no padrão Sacra para o favorecido assinar.
                </span>
              </span>
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">Emitido para</label>
                <input
                  name="recibo_emitido_para"
                  defaultValue={lancamento.financeiro_pessoas?.nome ?? ""}
                  placeholder="Nome do favorecido"
                  className={campoClasse}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-muted">CPF/CNPJ do favorecido</label>
                <CampoMascarado
                  name="recibo_documento"
                  mask="cpf_cnpj"
                  defaultValue={lancamento.financeiro_pessoas?.cpf_cnpj ?? ""}
                  placeholder="Opcional"
                  className={campoClasse}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <CheckCircle2 size={18} className="text-brand" />
          <h2 className="text-base font-bold text-ink">Observações</h2>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Observações</label>
          <textarea
            name="observacoes"
            rows={4}
            defaultValue={lancamento.observacoes ?? ""}
            placeholder={`Observações sobre este ${acao}...`}
            className={campoClasse}
          />
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] justify-between gap-3">
          <Link href={retorno} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink-muted hover:bg-background">
            Voltar
          </Link>
          <button type="submit" className="rounded-lg bg-brand px-5 py-2 text-sm font-bold text-white shadow-sm hover:opacity-90">
            Confirmar
          </button>
        </div>
      </div>
    </form>
  );
}
