import { BotaoEnviar } from "@/components/botao-enviar";
import { INPUT_CLASS } from "@/components/ui/styles";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Save, UserRound, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { CampoMascarado } from "@/components/financeiro/campo-mascarado";
import { editarPessoaFinanceiro } from "../../actions";

const campoClasse =
  INPUT_CLASS;

const PAPEL_LABEL: Record<string, string> = {
  cliente: "Cliente",
  fornecedor: "Fornecedor",
  ambos: "Cliente e fornecedor",
};

function brl(v: number): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBR(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

export default async function EditarPessoaFinanceiroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: pessoa }, { data: lancamentos }] = await Promise.all([
    supabase
      .from("financeiro_pessoas")
      .select("id, nome, cpf_cnpj, papel, categoria_fornecedor, telefone, email, observacoes")
      .eq("id", id)
      .single(),
    supabase
      .from("financeiro_lancamentos")
      .select("id, descricao, tipo, valor, vencimento, status")
      .eq("pessoa_id", id)
      .order("vencimento", { ascending: false })
      .limit(8),
  ]);

  if (!pessoa) notFound();

  const totalReceber = (lancamentos ?? [])
    .filter((l) => l.tipo === "receita")
    .reduce((soma, l) => soma + Number(l.valor), 0);
  const totalPagar = (lancamentos ?? [])
    .filter((l) => l.tipo === "despesa")
    .reduce((soma, l) => soma + Number(l.valor), 0);

  return (
    <div className="financeiro-ui mx-auto w-full min-w-0 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/financeiro/pessoas"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-brand"
          >
            <ArrowLeft size={15} /> Voltar para pessoas
          </Link>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Editar pessoa</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Atualize cadastro, papel financeiro e contatos de {pessoa.nome}.
          </p>
        </div>
        <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted">
          {PAPEL_LABEL[pessoa.papel] ?? pessoa.papel}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <form
          action={editarPessoaFinanceiro}
          className="space-y-5 rounded-2xl border border-border/70 bg-surface p-5 shadow-sm"
        >
          <input type="hidden" name="id" value={pessoa.id} />
          <input type="hidden" name="return_to" value="/financeiro/pessoas" />
          <CabecalhoSecao
            icon={UserRound}
            titulo="Dados cadastrais"
            descricao="Use esta tela para edições completas, sem sobrepor a tabela."
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-ink">
              Nome
              <input name="nome" required defaultValue={pessoa.nome} className={campoClasse} />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-ink">
              CPF/CNPJ
              <CampoMascarado name="cpf_cnpj" mask="cpf_cnpj" defaultValue={pessoa.cpf_cnpj ?? ""} className={campoClasse} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-ink">
              Tipo
              <select name="papel" defaultValue={pessoa.papel} className={campoClasse}>
                <option value="fornecedor">Fornecedor</option>
                <option value="cliente">Cliente</option>
                <option value="ambos">Cliente e fornecedor</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium text-ink">
              Categoria do fornecedor
              <select name="categoria_fornecedor" defaultValue={pessoa.categoria_fornecedor ?? ""} className={campoClasse}>
                <option value="">Sem categoria</option>
                <option value="funcionario">Funcionário</option>
                <option value="corretor">Corretor</option>
                <option value="prestador_servico">Prestador de serviço</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-ink">
              Telefone
              <CampoMascarado name="telefone" mask="telefone" defaultValue={pessoa.telefone ?? ""} className={campoClasse} />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-ink">
              E-mail
              <input name="email" type="email" defaultValue={pessoa.email ?? ""} className={campoClasse} />
            </label>
          </div>

          <label className="space-y-1.5 text-sm font-medium text-ink">
            Observações
            <textarea
              name="observacoes"
              defaultValue={pessoa.observacoes ?? ""}
              rows={5}
              className={campoClasse}
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Link
              href="/financeiro/pessoas"
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
            <CabecalhoSecao icon={FileText} titulo="Resumo financeiro" />
            <div className="mt-4 grid gap-3">
              <div className="rounded-lg bg-background p-3">
                <p className="text-xs text-ink-muted">A receber vinculado</p>
                <p className="num text-lg font-bold text-emerald-700">{brl(totalReceber)}</p>
              </div>
              <div className="rounded-lg bg-background p-3">
                <p className="text-xs text-ink-muted">A pagar vinculado</p>
                <p className="num text-lg font-bold text-rose-700">{brl(totalPagar)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
            <CabecalhoSecao icon={FileText} titulo="Últimos lançamentos" />
            {(lancamentos ?? []).length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">Nenhum lançamento vinculado ainda.</p>
            ) : (
              <ul className="mt-2 divide-y divide-border">
                {(lancamentos ?? []).map((l) => (
                  <li key={l.id} className="py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{l.descricao}</p>
                        <p className="text-xs text-ink-muted">
                          {dataBR(l.vencimento)} · {l.status}
                        </p>
                      </div>
                      <p className={`num shrink-0 font-semibold ${l.tipo === "receita" ? "text-emerald-700" : "text-rose-700"}`}>
                        {brl(l.valor)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
