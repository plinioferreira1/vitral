import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  pendente: "Pendente",
  concluido: "Concluído",
  arquivado: "Arquivado",
  cancelado: "Cancelado",
};

const STATUS_COR: Record<string, string> = {
  ativo: "bg-emerald-50 text-emerald-700 border-emerald-100",
  pendente: "bg-amber-50 text-amber-700 border-amber-100",
  concluido: "bg-stone-100 text-stone-600 border-stone-200",
  arquivado: "bg-stone-100 text-stone-500 border-stone-200",
  cancelado: "bg-rose-50 text-rose-700 border-rose-200",
};

export default async function ProcessosPage() {
  const supabase = await createClient();

  const { data: processos, error } = await supabase
    .from("processos")
    .select(
      `id, numero_processo, tipo, status, data_criacao,
       comprador:clientes!processos_comprador_id_fkey ( nome ),
       vendedor:clientes!processos_vendedor_id_fkey ( nome ),
       corretores ( nome ), bancos ( nome ),
       modelos_processo ( nome )`
    )
    .order("criado_em", { ascending: false });

  if (error) {
    return <p className="text-sm text-rose-700">Erro ao carregar processos: {error.message}</p>;
  }

  type Row = {
    id: string;
    numero_processo: string;
    tipo: string | null;
    status: string;
    data_criacao: string;
    comprador: { nome: string } | null;
    vendedor: { nome: string } | null;
    corretores: { nome: string } | null;
    bancos: { nome: string } | null;
    modelos_processo: { nome: string } | null;
  };
  const rows = (processos ?? []) as unknown as Row[];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-serif font-semibold text-ink">Processos</h1>
          <p className="mt-1 text-sm text-ink-muted">{rows.length} processos no total</p>
        </div>
        <Link
          href="/processos/novo"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Novo processo
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">
            Nenhum processo ainda.{" "}
            <Link href="/processos/novo" className="text-brand hover:underline">
              Criar o primeiro
            </Link>
            .
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
                <th className="px-5 py-3 font-medium">Nº</th>
                <th className="px-5 py-3 font-medium">Comprador</th>
                <th className="px-5 py-3 font-medium">Vendedor</th>
                <th className="px-5 py-3 font-medium">Modelo</th>
                <th className="px-5 py-3 font-medium">Corretor</th>
                <th className="px-5 py-3 font-medium">Banco</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p) => (
                <tr key={p.id} className="transition hover:bg-background">
                  <td className="px-5 py-3 font-mono text-xs text-ink-muted">
                    <Link href={`/processos/${p.id}`} className="hover:underline">
                      {p.numero_processo}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/processos/${p.id}`} className="font-medium text-ink hover:underline">
                      {p.comprador?.nome ?? "—"}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{p.vendedor?.nome ?? "—"}</td>
                  <td className="px-5 py-3 text-ink-muted">{p.modelos_processo?.nome ?? "—"}</td>
                  <td className="px-5 py-3 text-ink-muted">{p.corretores?.nome ?? "—"}</td>
                  <td className="px-5 py-3 text-ink-muted">{p.bancos?.nome ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COR[p.status]}`}
                    >
                      {STATUS_LABEL[p.status]}
                    </span>
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
