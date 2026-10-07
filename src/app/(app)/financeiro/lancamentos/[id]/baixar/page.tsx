import { CabecalhoPagina } from "@/components/cabecalho-pagina";
import { NavegacaoLancamento } from "@/components/financeiro/navegacao-lancamento";
import { BotaoEnviar } from "@/components/botao-enviar";
import { INPUT_CLASS } from "@/components/ui/styles";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileText, Undo2, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CampoFormaPagamento } from "@/components/financeiro/campo-forma-pagamento";
import { CampoMascarado } from "@/components/financeiro/campo-mascarado";
import { CampoMoeda } from "@/components/financeiro/campo-moeda";
import { estornarBaixa, registrarBaixa } from "../../../lancamentos-actions";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { hojeISO } from "@/lib/data-br";

const campoClasse =
  INPUT_CLASS;

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
    supabase
      .from("financeiro_baixas")
      .select("id, valor, data, forma_pagamento, gerar_recibo, financeiro_contas_bancarias ( nome )")
      .eq("lancamento_id", id)
      .order("data"),
  ]);

  if (!lancamentoRaw) notFound();
  const lancamento = lancamentoRaw as unknown as Lancamento;
  const totalBaixado = (baixas ?? []).reduce((s, b) => s + Number(b.valor), 0);
  const saldoAberto = Math.max(0, Number(lancamento.valor) - totalBaixado);
  const retorno = lancamento.tipo === "receita" ? "/financeiro/contas-a-receber#lista" : "/financeiro/contas-a-pagar#lista";
  const acao = lancamento.tipo === "receita" ? "recebimento" : "pagamento";
  const titulo = lancamento.tipo === "receita" ? "Registrar recebimento" : "Registrar pagamento";
  const botaoConfirmarClasse = "rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700";

  const listaBaixas = (baixas ?? []) as unknown as {
    id: string;
    valor: number;
    data: string;
    forma_pagamento: string | null;
    gerar_recibo: boolean;
    financeiro_contas_bancarias: { nome: string } | null;
  }[];
  const quitado = lancamento.status === "pago";

  return (
    <div className="financeiro-ui mx-auto max-w-[1180px] space-y-5 pb-24">
      <NavegacaoLancamento id={id} tipo={lancamento.tipo} status={lancamento.status} />
      <Link href={retorno} className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"><ArrowLeft size={16} /> Voltar à lista</Link>
      <CabecalhoPagina titulo={quitado ? `Histórico de ${acao}` : titulo} descricao={lancamento.descricao} />
      {listaBaixas.length > 0 && (
        <section id="pagamentos" className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
            <Undo2 size={18} className="text-brand" />
            <h2 className="text-base font-bold text-ink">
              {lancamento.tipo === "receita" ? "Recebimentos registrados" : "Pagamentos registrados"}
            </h2>
          </div>
          <p className="mb-3 text-xs text-ink-muted">
            Registrou algo errado? Estorne o {acao} — o valor volta para o saldo da conta e o lançamento volta a ficar em
            aberto. Depois é só registrar de novo com os dados certos.
          </p>
          <div className="divide-y divide-border">
            {listaBaixas.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="num font-semibold text-ink">{brl(b.valor)}</span>
                  <span className="num text-ink-muted">{dataBR(b.data)}</span>
                  <span className="text-ink-muted">{b.financeiro_contas_bancarias?.nome ?? "Sem conta"}</span>
                  {b.forma_pagamento && <span className="text-ink-muted">{b.forma_pagamento}</span>}
                  {b.gerar_recibo && (
                    <Link href={`/financeiro/baixas/${b.id}/recibo`} className="text-brand hover:underline">
                      Recibo
                    </Link>
                  )}
                </div>
                <form action={estornarBaixa}>
                  <input type="hidden" name="baixa_id" value={b.id} />
                  <BotaoComConfirmacao
                    mensagem={`Estornar este ${acao} de ${brl(b.valor)}? O valor volta para o saldo da conta.`}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                  >
                    Estornar
                  </BotaoComConfirmacao>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}
      {quitado ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
          Este lançamento já está totalmente {lancamento.tipo === "receita" ? "recebido" : "pago"}.{" "}
          <Link href={retorno} className="font-semibold underline">
            Voltar para a lista
          </Link>
        </div>
      ) : (
    <form action={registrarBaixa} className="space-y-5">
      <input type="hidden" name="lancamento_id" value={lancamento.id} />
      <input type="hidden" name="return_to" value={retorno} />

      <div className="flex justify-end">
        <BotaoEnviar className={botaoConfirmarClasse} textoEnviando="Registrando…">Confirmar {acao}</BotaoEnviar>
      </div>

      <section className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
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

      <section className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
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
            <CampoFormaPagamento defaultValue={lancamento.forma_pagamento ?? ""} className={campoClasse} />
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

      <section className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
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
          <BotaoEnviar className={botaoConfirmarClasse}>
            Confirmar {acao}
          </BotaoEnviar>
        </div>
      </div>
    </form>
      )}
    </div>
  );
}
