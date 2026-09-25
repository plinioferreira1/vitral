import { createClient } from "@/lib/supabase/server";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { Users } from "lucide-react";
import { criarPessoaFinanceiro, editarPessoaFinanceiro, apagarPessoaFinanceiro } from "./actions";

const PAPEL_LABEL: Record<string, string> = {
  cliente: "Cliente",
  fornecedor: "Fornecedor",
  ambos: "Cliente e fornecedor",
};

const campoClasse =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

export default async function FinanceiroPessoasPage() {
  const supabase = await createClient();
  const { data: pessoas } = await supabase
    .from("financeiro_pessoas")
    .select("id, nome, cpf_cnpj, papel, telefone, email, observacoes")
    .order("nome");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">
          Clientes e Fornecedores
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Cadastro central de pessoas do financeiro — usado em contas a pagar e a receber.
        </p>
      </div>

      <form
        action={criarPessoaFinanceiro}
        className="space-y-3 rounded-xl border border-border/60 bg-surface p-5 shadow-sm"
      >
        <CabecalhoSecao icon={Users} titulo="Nova pessoa" />
        <div className="grid gap-3 sm:grid-cols-2">
          <input name="nome" required placeholder="Nome" className={campoClasse} />
          <input name="cpf_cnpj" placeholder="CPF/CNPJ" className={campoClasse} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <select name="papel" defaultValue="fornecedor" className={campoClasse}>
            <option value="fornecedor">Fornecedor</option>
            <option value="cliente">Cliente</option>
            <option value="ambos">Cliente e fornecedor</option>
          </select>
          <input name="telefone" placeholder="Telefone (opcional)" className={campoClasse} />
          <input name="email" placeholder="E-mail (opcional)" className={campoClasse} />
        </div>
        <input name="observacoes" placeholder="Observações (opcional)" className={campoClasse} />
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Adicionar
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
        {(pessoas ?? []).length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">Nenhuma pessoa cadastrada ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">CPF/CNPJ</th>
                <th className="px-4 py-2.5 font-medium">Papel</th>
                <th className="px-4 py-2.5 font-medium">Contato</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(pessoas ?? []).map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 font-medium text-ink">{p.nome}</td>
                  <td className="px-4 py-2.5 text-ink-muted">{p.cpf_cnpj || "—"}</td>
                  <td className="px-4 py-2.5 text-ink-muted">{PAPEL_LABEL[p.papel]}</td>
                  <td className="px-4 py-2.5 text-ink-muted">
                    {[p.telefone, p.email].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <details className="relative">
                        <summary className="cursor-pointer list-none text-xs font-medium text-brand hover:underline">
                          editar
                        </summary>
                        <form
                          action={editarPessoaFinanceiro}
                          className="absolute right-0 z-10 mt-1 w-72 space-y-2 rounded-md border border-border bg-surface p-3 shadow-md"
                        >
                          <input type="hidden" name="id" value={p.id} />
                          <input name="nome" required defaultValue={p.nome} className={campoClasse} />
                          <input
                            name="cpf_cnpj"
                            defaultValue={p.cpf_cnpj ?? ""}
                            placeholder="CPF/CNPJ"
                            className={campoClasse}
                          />
                          <select name="papel" defaultValue={p.papel} className={campoClasse}>
                            <option value="fornecedor">Fornecedor</option>
                            <option value="cliente">Cliente</option>
                            <option value="ambos">Cliente e fornecedor</option>
                          </select>
                          <input
                            name="telefone"
                            defaultValue={p.telefone ?? ""}
                            placeholder="Telefone"
                            className={campoClasse}
                          />
                          <input
                            name="email"
                            defaultValue={p.email ?? ""}
                            placeholder="E-mail"
                            className={campoClasse}
                          />
                          <input
                            name="observacoes"
                            defaultValue={p.observacoes ?? ""}
                            placeholder="Observações"
                            className={campoClasse}
                          />
                          <button
                            type="submit"
                            className="w-full rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                          >
                            Salvar
                          </button>
                        </form>
                      </details>
                      <form action={apagarPessoaFinanceiro}>
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-ink-muted hover:text-rose-600"
                        >
                          apagar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
