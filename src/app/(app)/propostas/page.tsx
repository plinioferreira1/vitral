import { CabecalhoPagina } from "@/components/cabecalho-pagina";
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
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CabecalhoPagina titulo="Propostas de compra" descricao="Proposta de compra — envie um link ou assine na hora, durante a visita." />
        <Link
          href="/propostas/nova"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Nova proposta
        </Link>
      </div>

      <form action={apagarCartasPropostaSelecionadas} className="space-y-3">
        {rows.length > 0 && (
          <div className="flex justify-end">
            <BotaoComConfirmacao
              mensagem="Apagar as propostas selecionadas? Essa ação não pode ser desfeita."
              className="min-h-11 rounded-md border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
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
            <>
            <ul className="divide-y divide-border md:hidden" aria-label="Propostas de compra">
              {rows.map((p) => (
                <li key={p.id} className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <label className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border" title="Selecionar para exclusão">
                      <input type="checkbox" name="ids" value={p.id} aria-label={`Selecionar proposta de ${p.clientes?.nome ?? "cliente não informado"}`} className="h-5 w-5 accent-brand"/>
                    </label>
                    <div className="min-w-0 flex-1">
                      <Link href={`/propostas/${p.id}`} className="block break-words text-base font-semibold leading-snug text-brand hover:underline">
                        {p.imoveis?.endereco ?? "Imóvel não informado"}
                      </Link>
                      <p className="mt-1 break-words text-sm text-ink-muted">{p.clientes?.nome ?? "Proponente não informado"}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-base font-semibold tabular-nums text-ink">{brl(p.valor_total)}</span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_COR[p.status] ?? "border-border text-ink-muted"}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2">
                    <p className="min-w-0 break-words text-xs text-ink-muted">Criado por {p.usuarios?.nome ?? "—"}</p>
                    {p.status === "pendente" && (
                      <Link href={`/propostas/${p.id}/editar`} className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-brand hover:bg-background">Editar proposta</Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
                  <th className="w-8 px-5 py-3"><span className="sr-only">Selecionar</span></th>
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
                      <input type="checkbox" name="ids" value={p.id} aria-label={`Selecionar proposta de ${p.clientes?.nome ?? "cliente não informado"}`} className="h-5 w-5 accent-brand" />
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
            </>
          )}
        </div>
      </form>
    </div>
  );
}
