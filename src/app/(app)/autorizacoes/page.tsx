import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STATUS_COR: Record<string, string> = {
  pendente: "bg-amber-50 text-amber-700 border-amber-100",
  assinado: "bg-emerald-50 text-emerald-700 border-emerald-100",
  cancelado: "bg-stone-100 text-stone-500 border-stone-200",
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Aguardando assinatura",
  assinado: "Assinado",
  cancelado: "Cancelado",
};

export default async function AutorizacoesPage() {
  const supabase = await createClient();
  const { data: autorizacoes } = await supabase
    .from("autorizacoes_venda")
    .select("id, status, criado_em, imoveis ( endereco ), clientes ( nome )")
    .order("criado_em", { ascending: false });

  const rows = (autorizacoes ?? []) as unknown as {
    id: string;
    status: string;
    criado_em: string;
    imoveis: { endereco: string } | null;
    clientes: { nome: string } | null;
  }[];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Autorizações de Venda</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Assinatura digital — envie um link ou assine na hora, durante a visita.
          </p>
        </div>
        <Link
          href="/autorizacoes/nova"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Nova autorização
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">
            Nenhuma autorização ainda.{" "}
            <Link href="/autorizacoes/nova" className="text-brand hover:underline">
              Criar a primeira
            </Link>
            .
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
                <th className="px-5 py-3 font-medium">Imóvel</th>
                <th className="px-5 py-3 font-medium">Proprietário</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((a) => (
                <tr key={a.id} className="transition hover:bg-background">
                  <td className="px-5 py-3">
                    <Link href={`/autorizacoes/${a.id}`} className="font-medium text-ink hover:underline">
                      {a.imoveis?.endereco ?? "—"}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{a.clientes?.nome ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COR[a.status]}`}
                    >
                      {STATUS_LABEL[a.status]}
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
