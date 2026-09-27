import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Users, User, Landmark, Briefcase, UserCog, Wrench } from "lucide-react";
import { criarPessoaFinanceiro, apagarPessoaFinanceiro } from "./actions";

const PAPEL_LABEL: Record<string, string> = {
  cliente: "Cliente",
  fornecedor: "Fornecedor",
  ambos: "Cliente e fornecedor",
};
const CATEGORIA_FORNECEDOR_LABEL: Record<string, string> = {
  funcionario: "Funcionário",
  corretor: "Corretor",
  prestador_servico: "Prestador de Serviço",
};

const campoClasse =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand";

function brl(v: number): string {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Pessoa = {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  papel: string;
  categoria_fornecedor: string | null;
  telefone: string | null;
  email: string | null;
  observacoes: string | null;
};

export default async function FinanceiroPessoasPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; q?: string }>;
}) {
  const { tipo, q } = await searchParams;

  const supabase = await createClient();
  const [{ data: pessoasRaw }, { data: ultimos }] = await Promise.all([
    supabase
      .from("financeiro_pessoas")
      .select("id, nome, cpf_cnpj, papel, categoria_fornecedor, telefone, email, observacoes")
      .order("nome"),
    supabase
      .from("financeiro_lancamentos")
      .select("pessoa_id, tipo, valor, vencimento")
      .not("pessoa_id", "is", null)
      .order("vencimento", { ascending: false }),
  ]);
  const pessoas = (pessoasRaw ?? []) as Pessoa[];

  const ultimoPorPessoa = new Map<string, { tipo: string; valor: number; vencimento: string }>();
  (ultimos ?? []).forEach((l) => {
    if (l.pessoa_id && !ultimoPorPessoa.has(l.pessoa_id)) {
      ultimoPorPessoa.set(l.pessoa_id, { tipo: l.tipo, valor: Number(l.valor), vencimento: l.vencimento });
    }
  });

  const clientes = pessoas.filter((p) => p.papel === "cliente" || p.papel === "ambos");
  const fornecedores = pessoas.filter((p) => p.papel === "fornecedor" || p.papel === "ambos");
  const funcionarios = pessoas.filter((p) => p.categoria_fornecedor === "funcionario");
  const corretores = pessoas.filter((p) => p.categoria_fornecedor === "corretor");
  const prestadores = pessoas.filter((p) => p.categoria_fornecedor === "prestador_servico");

  const ABAS = [
    { chave: "", label: "Todos", icon: Users, lista: pessoas },
    { chave: "cliente", label: "Clientes", icon: User, lista: clientes },
    { chave: "fornecedor", label: "Fornecedores", icon: Landmark, lista: fornecedores },
    { chave: "funcionario", label: "Funcionários", icon: UserCog, lista: funcionarios },
    { chave: "corretor", label: "Corretores", icon: Briefcase, lista: corretores },
    { chave: "prestador_servico", label: "Prestadores de serviço", icon: Wrench, lista: prestadores },
  ] as const;

  const abaAtiva = tipo ?? "";
  let listaBase = ABAS.find((a) => a.chave === abaAtiva)?.lista ?? pessoas;
  if (q) {
    const termo = q.toLowerCase();
    listaBase = listaBase.filter((p) =>
      `${p.nome} ${p.cpf_cnpj ?? ""} ${p.email ?? ""} ${p.telefone ?? ""}`.toLowerCase().includes(termo)
    );
  }

  return (
    <div className="financeiro-ui mx-auto max-w-[1480px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">
            Clientes e fornecedores
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Cadastro central de pessoas e empresas usado em contas a pagar e a receber.
          </p>
        </div>
        <details className="shrink-0">
          <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            + Nova pessoa
          </summary>
          <form
            action={criarPessoaFinanceiro}
            className="mt-3 space-y-3 rounded-xl border border-border/60 bg-surface p-5 text-left shadow-sm"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="nome" required placeholder="Nome" className={campoClasse} />
              <input name="cpf_cnpj" placeholder="CPF/CNPJ" className={campoClasse} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <select name="papel" defaultValue="fornecedor" className={campoClasse}>
                <option value="fornecedor">Fornecedor</option>
                <option value="cliente">Cliente</option>
                <option value="ambos">Cliente e fornecedor</option>
              </select>
              <select name="categoria_fornecedor" defaultValue="" className={campoClasse}>
                <option value="">Categoria do fornecedor (opcional)</option>
                <option value="funcionario">Funcionário</option>
                <option value="corretor">Corretor</option>
                <option value="prestador_servico">Prestador de Serviço</option>
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
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
        </details>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ABAS.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.chave || "todos"}
              href={a.chave ? `/financeiro/pessoas?tipo=${a.chave}` : "/financeiro/pessoas"}
              className={`flex items-center gap-2.5 rounded-xl border p-3 shadow-sm transition ${
                abaAtiva === a.chave ? "border-brand bg-brand/5" : "border-border/60 bg-surface hover:bg-background"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  abaAtiva === a.chave ? "bg-brand text-white" : "bg-background text-ink-muted"
                }`}
              >
                <Icon size={16} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="num text-lg font-bold leading-tight text-ink">{a.lista.length}</p>
                <p className="truncate text-[11px] text-ink-muted">{a.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <form method="get" className="flex items-center gap-3">
        {tipo && <input type="hidden" name="tipo" value={tipo} />}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nome, documento, e-mail ou telefone..."
          className={`${campoClasse} max-w-sm`}
        />
        <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm text-ink-muted hover:bg-background">
          Buscar
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-surface shadow-sm">
        {listaBase.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">Nenhuma pessoa encontrada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 font-medium">Categoria do fornecedor</th>
                <th className="px-4 py-2.5 font-medium">Documento</th>
                <th className="px-4 py-2.5 font-medium">Contato</th>
                <th className="px-4 py-2.5 font-medium">Último lançamento</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listaBase.map((p) => {
                const ultimo = ultimoPorPessoa.get(p.id);
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5 font-medium text-ink">{p.nome}</td>
                    <td className="px-4 py-2.5 text-ink-muted">{PAPEL_LABEL[p.papel]}</td>
                    <td className="px-4 py-2.5 text-ink-muted">
                      {p.categoria_fornecedor ? CATEGORIA_FORNECEDOR_LABEL[p.categoria_fornecedor] : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">{p.cpf_cnpj || "—"}</td>
                    <td className="px-4 py-2.5 text-ink-muted">
                      {[p.telefone, p.email].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {ultimo ? (
                        <span className={ultimo.tipo === "receita" ? "text-emerald-700" : "text-rose-700"}>
                          {brl(ultimo.valor)}
                        </span>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/financeiro/pessoas/${p.id}/editar`}
                          className="text-xs font-medium text-brand hover:underline"
                        >
                          editar
                        </Link>
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
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
