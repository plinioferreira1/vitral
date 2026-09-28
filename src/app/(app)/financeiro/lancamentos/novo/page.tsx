import Link from "next/link";
import { ArrowLeft, CalendarDays, FileText, Repeat, UserPlus, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BuscaOpcaoFinanceira } from "@/components/financeiro/busca-opcao";
import { CampoFormaPagamento } from "@/components/financeiro/campo-forma-pagamento";
import { CampoMascarado } from "@/components/financeiro/campo-mascarado";
import { CampoMoeda } from "@/components/financeiro/campo-moeda";
import { criarLancamento } from "../../lancamentos-actions";
import { hojeISO } from "@/lib/data-br";

const campoClasse =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10";

type LancamentoClone = {
  tipo: "receita" | "despesa";
  descricao: string;
  valor: number;
  vencimento: string;
  competencia: string | null;
  pessoa_id: string | null;
  categoria_id: string | null;
  centro_custo_id: string | null;
  conta_bancaria_id: string | null;
  forma_pagamento: string | null;
  numero_documento: string | null;
  observacoes: string | null;
};

export default async function NovoLancamentoFinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; clonar?: string }>;
}) {
  const { tipo: tipoParam, clonar } = await searchParams;
  const supabase = await createClient();
  const hoje = hojeISO();
  const { data: cloneRaw } = clonar
    ? await supabase
        .from("financeiro_lancamentos")
        .select(
          "tipo, descricao, valor, vencimento, competencia, pessoa_id, categoria_id, centro_custo_id, conta_bancaria_id, forma_pagamento, numero_documento, observacoes"
        )
        .eq("id", clonar)
        .single()
    : { data: null };
  const clone = cloneRaw as LancamentoClone | null;
  const tipo = clone ? clone.tipo : tipoParam === "receita" ? "receita" : "despesa";

  const [{ data: pessoas }, { data: categorias }, { data: centros }, { data: contas }] = await Promise.all([
    supabase.from("financeiro_pessoas").select("id, nome").order("nome"),
    supabase.from("financeiro_categorias").select("id, nome").eq("tipo", tipo).order("nome"),
    supabase.from("financeiro_centros_custo").select("id, nome").order("nome"),
    supabase.from("financeiro_contas_bancarias").select("id, nome").eq("ativa", true).order("nome"),
  ]);

  const titulo = clone
    ? tipo === "receita"
      ? "Clonar conta a receber"
      : "Clonar despesa"
    : tipo === "receita"
      ? "Nova conta a receber"
      : "Nova despesa";
  const rotuloPessoa = tipo === "receita" ? "Cliente" : "Fornecedor";
  const retorno = tipo === "receita" ? "/financeiro/contas-a-receber#lista" : "/financeiro/contas-a-pagar#lista";

  return (
    <form action={criarLancamento} className="financeiro-ui mx-auto max-w-[1180px] space-y-5 pb-24">
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="return_to" value={retorno} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={retorno} className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">
            <ArrowLeft size={16} />
            Voltar
          </Link>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">{titulo}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {clone
              ? "Revise os dados clonados, ajuste vencimento/valor se necessário e salve como um novo lançamento."
              : "Lance uma movimentação no modelo operacional do financeiro, com dados principais, condição de pagamento e recorrência."}
          </p>
        </div>
        <button type="submit" className="rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-90">
          Salvar lançamento
        </button>
      </div>

      <section className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <FileText size={18} className="text-brand" />
          <h2 className="text-base font-bold text-ink">Informações do lançamento</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_170px_1.8fr_170px]">
          <BuscaOpcaoFinanceira
            name="pessoa_id"
            label={rotuloPessoa}
            options={pessoas ?? []}
            initialId={clone?.pessoa_id ?? ""}
            emptyLabel={tipo === "receita" ? "Sem cliente vinculado" : "Sem fornecedor vinculado"}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Data de competência</label>
            <input name="competencia" type="date" defaultValue={clone?.competencia ?? hoje} className={campoClasse} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Descrição *</label>
            <input
              name="descricao"
              required
              defaultValue={clone?.descricao ?? ""}
              placeholder="Ex: aluguel, comissão, taxa, reembolso..."
              className={campoClasse}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Valor *</label>
            <CampoMoeda name="valor" required defaultValue={clone?.valor ?? ""} className={campoClasse} />
          </div>
        </div>

        {tipo === "despesa" && (
          <details className="mt-4 rounded-xl border border-dashed border-brand/30 bg-brand-soft/35 p-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-brand">
              <UserPlus size={16} />
              Cadastrar novo fornecedor nesta despesa
            </summary>
            <div className="mt-4 space-y-3">
              <p className="text-xs text-ink-muted">
                Preencha pelo menos o nome. Ao salvar, o fornecedor será criado em Clientes e fornecedores e já ficará vinculado a esta despesa.
              </p>
              <div className="grid gap-3 md:grid-cols-[1.5fr_1fr]">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">Nome do fornecedor</label>
                  <input name="novo_fornecedor_nome" placeholder="Ex: prestador, empresa, profissional..." className={campoClasse} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">Categoria</label>
                  <select name="novo_fornecedor_categoria" defaultValue="prestador_servico" className={campoClasse}>
                    <option value="prestador_servico">Prestador de serviço</option>
                    <option value="corretor">Corretor</option>
                    <option value="funcionario">Funcionário</option>
                    <option value="">Fornecedor sem categoria</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">CPF/CNPJ</label>
                  <CampoMascarado name="novo_fornecedor_cpf_cnpj" mask="cpf_cnpj" placeholder="Opcional" className={campoClasse} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">Telefone</label>
                  <CampoMascarado name="novo_fornecedor_telefone" mask="telefone" placeholder="Opcional" className={campoClasse} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">E-mail</label>
                  <input name="novo_fornecedor_email" type="email" placeholder="Opcional" className={campoClasse} />
                </div>
              </div>
            </div>
          </details>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1.4fr_1fr]">
          <BuscaOpcaoFinanceira name="categoria_id" label="Categoria" options={categorias ?? []} initialId={clone?.categoria_id ?? ""} />
          <BuscaOpcaoFinanceira name="centro_custo_id" label="Centro de resultado" options={centros ?? []} initialId={clone?.centro_custo_id ?? ""} />
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Código de referência</label>
            <input name="numero_documento" defaultValue={clone?.numero_documento ?? ""} placeholder="Opcional" className={campoClasse} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <Wallet size={18} className="text-brand" />
          <h2 className="text-base font-bold text-ink">Condição de pagamento</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-[150px_170px_1.2fr_1.2fr] lg:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Parcelamento</label>
            <select className={campoClasse} defaultValue="avista">
              <option value="avista">À vista</option>
              <option value="parcelado">Parcelado</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Vencimento *</label>
            <input name="vencimento" type="date" defaultValue={clone?.vencimento ?? hoje} required className={campoClasse} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Forma de pagamento</label>
            <CampoFormaPagamento defaultValue={clone?.forma_pagamento ?? ""} className={campoClasse} />
          </div>
          <BuscaOpcaoFinanceira name="conta_bancaria_id" label="Conta prevista" options={contas ?? []} initialId={clone?.conta_bancaria_id ?? ""} />
        </div>

        <div className="mt-5 rounded-xl border border-brand/15 bg-brand-soft/60 p-4">
          <p className="text-sm font-bold text-ink">Rotina da Sacra</p>
          <div className="mt-2 grid gap-2 text-sm text-ink-muted md:grid-cols-3">
            <span className="text-brand">✓ <span className="text-ink-muted">Vencimento entra em A Pagar ou A Receber</span></span>
            <span className="text-brand">✓ <span className="text-ink-muted">Baixa pode ser total ou parcial</span></span>
            <span className="text-brand">✓ <span className="text-ink-muted">Categoria ajuda nos relatórios</span></span>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <Repeat size={18} className="text-brand" />
          <h2 className="text-base font-bold text-ink">Recorrência</h2>
        </div>
        <label className="mb-4 flex items-center gap-2 text-sm font-medium text-ink">
          <input type="checkbox" name="recorrente" className="accent-brand" />
          Repetir lançamento
        </label>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Frequência</label>
            <select name="frequencia" defaultValue="mensal" className={campoClasse}>
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
              <option value="trimestral">Trimestral</option>
              <option value="semestral">Semestral</option>
              <option value="anual">Anual</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Data da 1ª ocorrência</label>
            <input name="data_inicio" type="date" defaultValue={clone?.vencimento ?? hoje} className={campoClasse} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Repetir até</label>
            <input name="data_fim" type="date" className={campoClasse} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Ou por quantas vezes</label>
            <input name="numero_ocorrencias" type="number" min={1} defaultValue={12} placeholder="Ex: 12" className={campoClasse} />
          </div>
        </div>

        <div className="mt-4 space-y-2 rounded-lg bg-background p-3">
          <p className="text-xs font-semibold text-ink">Vencimento de cada ocorrência</p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-xs text-ink">
              <input type="radio" name="tipo_vencimento" value="fixo" defaultChecked className="accent-brand" />
              Mesmo dia da primeira ocorrência
            </label>
            <label className="flex items-center gap-2 text-xs text-ink">
              <input type="radio" name="tipo_vencimento" value="dia_util" className="accent-brand" />
              Dia útil do mês
            </label>
          </div>
          <input name="dia_util" type="number" min={1} max={23} placeholder="Ex: 5" className={`${campoClasse} max-w-[120px]`} />
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 border-b border-border pb-3">
          <CalendarDays size={18} className="text-brand" />
          <h2 className="text-base font-bold text-ink">Observações</h2>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted">Observações</label>
          <textarea
            name="observacoes"
            rows={4}
            defaultValue={clone?.observacoes ?? ""}
            placeholder="Detalhes relevantes sobre este lançamento..."
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
            Salvar
          </button>
        </div>
      </div>
    </form>
  );
}
