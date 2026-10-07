import { BotaoEnviar } from "@/components/botao-enviar";
import { INPUT_CLASS } from "@/components/ui/styles";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Landmark, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { baixasParaMovimento, movimentoPorConta as calcularMovimento } from "@/lib/saldos";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { CampoMoeda } from "@/components/financeiro/campo-moeda";
import { LogoBanco } from "@/components/financeiro/logo-banco";
import { editarContaBancaria } from "../../actions";

const campoClasse =
  INPUT_CLASS;

function brl(v: number): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function EditarContaBancariaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: conta }, { data: baixas }, { data: transferencias }] = await Promise.all([
    supabase
      .from("financeiro_contas_bancarias")
      .select("id, nome, banco, agencia, numero_conta, titular, tipo, saldo_inicial, data_abertura, ativa")
      .eq("id", id)
      .single(),
    supabase
      .from("financeiro_baixas")
      .select("valor, financeiro_lancamentos ( tipo )")
      .eq("conta_bancaria_id", id),
    supabase
      .from("financeiro_transferencias")
      .select("conta_origem_id, conta_destino_id, valor, data")
      .or(`conta_origem_id.eq.${id},conta_destino_id.eq.${id}`),
  ]);

  if (!conta) notFound();

  // Baixas + transferências (src/lib/saldos.ts).
  const movimento =
    calcularMovimento(
      baixasParaMovimento((baixas ?? []).map((b) => ({ ...b, conta_bancaria_id: id }))),
      transferencias ?? []
    ).get(id) ?? 0;
  const saldoAtual = Number(conta.saldo_inicial) + movimento;

  return (
    <div className="financeiro-ui mx-auto max-w-[1180px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/financeiro/contas-bancarias"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-brand"
          >
            <ArrowLeft size={15} /> Voltar para contas
          </Link>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Editar conta bancária</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Atualize os dados da conta sem perder o histórico de baixas e lançamentos vinculados.
          </p>
        </div>
        <LogoBanco banco={conta.banco} mostrarNome />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <form action={editarContaBancaria} className="space-y-5 rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
          <input type="hidden" name="id" value={conta.id} />
          <CabecalhoSecao icon={Landmark} titulo="Dados da conta" />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-ink">
              Nome
              <input name="nome" required defaultValue={conta.nome} className={campoClasse} />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-ink">
              Banco
              <input name="banco" defaultValue={conta.banco ?? ""} className={campoClasse} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1.5 text-sm font-medium text-ink">
              Agência
              <input name="agencia" defaultValue={conta.agencia ?? ""} className={campoClasse} />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-ink">
              Número da conta
              <input name="numero_conta" defaultValue={conta.numero_conta ?? ""} className={campoClasse} />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-ink">
              Tipo
              <select name="tipo" defaultValue={conta.tipo ?? "corrente"} className={campoClasse}>
                <option value="corrente">Conta corrente</option>
                <option value="poupanca">Poupança</option>
                <option value="investimento">Investimento</option>
                <option value="cartao_credito">Cartão de crédito</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1.5 text-sm font-medium text-ink">
              Titular
              <input name="titular" defaultValue={conta.titular ?? ""} className={campoClasse} />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-ink">
              Saldo inicial
              <CampoMoeda name="saldo_inicial" defaultValue={conta.saldo_inicial} className={campoClasse} />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-ink">
              Data de abertura
              <input name="data_abertura" type="date" defaultValue={conta.data_abertura ?? ""} className={campoClasse} />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" name="ativa" defaultChecked={conta.ativa} className="accent-brand" />
            Conta ativa
          </label>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Link
              href="/financeiro/contas-bancarias"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-ink-muted hover:bg-background"
            >
              Cancelar
            </Link>
            <BotaoEnviar

              className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <Save size={15} /> Salvar alterações
            </BotaoEnviar>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
            <p className="text-xs text-ink-muted">Saldo inicial</p>
            <p className="num mt-1 text-xl font-bold text-ink">{brl(Number(conta.saldo_inicial))}</p>
            <p className="mt-4 text-xs text-ink-muted">Movimento registrado</p>
            <p className={`num mt-1 text-xl font-bold ${movimento < 0 ? "text-rose-600" : "text-emerald-700"}`}>
              {brl(movimento)}
            </p>
            <p className="mt-4 text-xs text-ink-muted">Saldo atual calculado</p>
            <p className={`num mt-1 text-2xl font-bold ${saldoAtual < 0 ? "text-rose-600" : "text-ink"}`}>{brl(saldoAtual)}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
