import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BotaoComConfirmacao } from "@/components/botao-com-confirmacao";
import { apagarTermosSelecionados } from "./bulk-actions";

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

export default async function TermosVisitaPage() {
  const supabase = await createClient();
  const { data: termos } = await supabase
    .from("termos_visita")
    .select("id, status, data_visita, imoveis ( endereco ), clientes ( nome )")
    .order("criado_em", { ascending: false });

  const rows = (termos ?? []) as unknown as {
    id: string;
    status: string;
    data_visita: string;
    imoveis: { endereco: string } | null;
    clientes: { nome: string } | null;
  }[];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Termos de Visita</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Assinatura digital — envie um link ou assine na hora, ao fim da visita.
          </p>
        </div>
        <Link
          href="/termos-visita/nova"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Novo termo
        </Link>
      </div>

      <form action={apagarTermosSelecionados} className="space-y-3">
        {rows.length > 0 && (
          <div className="flex justify-end">
            <BotaoComConfirmacao
              mensagem="Apagar os termos selecionados? Essa ação não pode ser desfeita."
              className="rounded-md border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              Apagar selecionados
            </BotaoComConfirmacao>
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-ink-muted">
              Nenhum termo de visita ainda.{" "}
              <Link href="/termos-visita/nova" className="text-brand hover:underline">
                Criar o primeiro
              </Link>
              .
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-left text-xs text-ink-muted">
                  <th className="w-8 px-5 py-3"></th>
                  <th className="px-5 py-3 font-medium">Imóvel</th>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium">Data da visita</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((t) => (
                  <tr key={t.id} className="transition hover:bg-background">
                    <td className="px-5 py-3">
                      <input type="checkbox" name="ids" value={t.id} className="accent-brand" />
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/termos-visita/${t.id}`} className="font-medium text-ink hover:underline">
                        {t.imoveis?.endereco ?? "—"}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-ink-muted">{t.clientes?.nome ?? "—"}</td>
                    <td className="px-5 py-3 text-ink-muted">
                      {new Date(t.data_visita + "T00:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COR[t.status]}`}
                      >
                        {STATUS_LABEL[t.status]}
                      </span>
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
