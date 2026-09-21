import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { apagarCartasPropostaSelecionadas } from "./bulk-actions";

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

export default async function PropostasPage() {
  const supabase = await createClient();
  const { data: propostas } = await supabase
    .from("cartas_proposta")
    .select(
      "id, status, criado_em, valor_total, imoveis ( endereco ), clientes!cartas_proposta_proponente_id_fkey ( nome ), usuarios!cartas_proposta_criado_por_fkey ( nome )"
    )
    .order("criado_em", { ascending: false });

  const rows = (propostas ?? []) as unknown as {
    id: string;
    status: string;
    criado_em: string;
    valor_total: number | null;
    imoveis: { endereco: string } | null;
    clientes: { nome: string } | null;
    usuarios: { nome: string } | null;
  }[];

  function brl(v: number | null): string {
    if (v === null) return "—";
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Cartas Proposta</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Proposta de compra — envie um link ou assine na hora, durante a visita.
          </p>
        </div>
        <Link
          href="/propostas/nova"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Nova proposta
        </Link>
      </div>

      <form action={apagarCartasPropostaSelecionadas} className="space-y-3">
        {rows.length > 0 && (
          <div className="flex justify-end">
            <BotaoComConfirmacao
              mensagem="Apagar as propostas selecionadas? Essa ação não pode ser desfeita."
              className="rounded-md border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              Apagar selecionadas
            </BotaoComConfirmacao>
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-ink-muted">
              Nenhuma proposta ainda.{" "}
              <Link href="/propostas/nova" className="text-brand hover:underline">
                Criar a primeira
              </Link>
              .
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
                  <th className="w-8 px-5 py-3"></th>
                  <th className="px-5 py-3 font-medium">Imóvel</th>
                  <th className="px-5 py-3 font-medium">Proponente</th>
                  <th className="px-5 py-3 font-medium">Valor</th>
                  <th className="px-5 py-3 font-medium">Criado por</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((p) => (
                  <tr key={p.id} className="transition hover:bg-background">
                    <td className="px-5 py-3">
                      <input type="checkbox" name="ids" value={p.id} className="accent-brand" />
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/propostas/${p.id}`} className="font-medium text-ink hover:underline">
                        {p.imoveis?.endereco ?? "—"}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-ink-muted">{p.clientes?.nome ?? "—"}</td>
                    <td className="px-5 py-3 text-ink-muted">{brl(p.valor_total)}</td>
                    <td className="px-5 py-3 text-ink-muted">{p.usuarios?.nome ?? "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COR[p.status]}`}
                        >
                          {STATUS_LABEL[p.status]}
                        </span>
                        {p.status === "pendente" && (
                          <Link
                            href={`/propostas/${p.id}/editar`}
                            className="text-xs font-medium text-brand hover:underline"
                          >
                            Editar
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </form>
    </div>
  );
}
