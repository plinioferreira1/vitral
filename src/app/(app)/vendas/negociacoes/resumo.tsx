import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/data-br";
import { formatarMoedaBR } from "@/lib/moeda";
import { metricasNegociacoes } from "@/lib/negociacoes/regras";
import { CARD_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/styles";
import { carregarNegociacoes } from "./dados";

export async function ResumoNegociacoes({
  tenantId,
  podeEditar,
}: {
  tenantId: string;
  podeEditar: boolean;
}) {
  const supabase = await createClient();
  const lista = await carregarNegociacoes(supabase, tenantId).catch(() => null);
  if (!lista)
    return (
      <section className={`${CARD_CLASS} p-5`}>
        <h2 className="font-semibold">Negociações de venda</h2>
        <p className="my-3 text-sm text-ink-muted">
          Não foi possível carregar o resumo.
        </p>
        <Link href="/vendas/negociacoes" className={SECONDARY_BUTTON_CLASS}>
          Abrir negociações
        </Link>
      </section>
    );
  const mes = hojeISO().slice(0, 7);
  const m = metricasNegociacoes(lista, mes);
  const proximas = lista
    .filter((n) => n.situacao === "em_andamento")
    .sort((a, b) =>
      (a.data_acompanhamento ?? "9999").localeCompare(
        b.data_acompanhamento ?? "9999",
      ),
    )
    .slice(0, 3);
  return (
    <section className={`${CARD_CLASS} space-y-4 p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">Negociações de venda</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Oportunidades em andamento e fechamentos deste mês.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {podeEditar && (
            <Link
              href="/vendas/negociacoes?nova=1#cadastro"
              className={SECONDARY_BUTTON_CLASS}
            >
              Nova negociação
            </Link>
          )}
          <Link href="/vendas/negociacoes" className={SECONDARY_BUTTON_CLASS}>
            Ver negociações →
          </Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link
          href="/vendas/negociacoes"
          className="rounded-lg bg-brand-soft p-4"
        >
          <p className="text-sm text-brand">Em andamento agora</p>
          <p className="mt-1 text-2xl font-bold text-brand">{m.abertas}</p>
          <p className="mt-1 text-sm text-brand">
            {formatarMoedaBR(m.valorAberto)}
          </p>
        </Link>
        <Link
          href={`/vendas/negociacoes?mes=${mes}&situacao=convertida`}
          className="rounded-lg border border-border p-4"
        >
          <p className="text-sm text-ink-muted">Convertidas no mês</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">
            {m.convertidas}
          </p>
        </Link>
        <Link
          href={`/vendas/negociacoes?mes=${mes}&situacao=perdida`}
          className="rounded-lg border border-border p-4"
        >
          <p className="text-sm text-ink-muted">Perdidas no mês</p>
          <p className="mt-1 text-2xl font-bold text-rose-800">{m.perdidas}</p>
        </Link>
        <Link
          href={`/vendas/negociacoes?mes=${mes}`}
          className="rounded-lg border border-border p-4"
        >
          <p className="text-sm text-ink-muted">Conversão dos encerramentos</p>
          <p className="mt-1 text-2xl font-bold">
            {m.taxa === null
              ? "—"
              : `${m.taxa.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {m.taxa === null
              ? "Sem encerramentos no mês"
              : "Convertidas ÷ encerradas no mês"}
          </p>
        </Link>
      </div>
      {proximas.length > 0 ? (
        <ul className="divide-y divide-border">
          {proximas.map((n) => (
            <li key={n.id}>
              <Link
                href={`/vendas/negociacoes/${n.id}`}
                className="flex flex-wrap justify-between gap-2 py-3 text-sm"
              >
                <span className="min-w-0 break-words">
                  <strong>{n.cliente_nome}</strong> ·{" "}
                  {n.proxima_acao || "Próxima ação a definir"}
                </span>
                <span
                  className={
                    n.data_acompanhamento && n.data_acompanhamento < hojeISO()
                      ? "font-semibold text-rose-800"
                      : "text-ink-muted"
                  }
                >
                  {n.data_acompanhamento
                    ? n.data_acompanhamento.split("-").reverse().join("/")
                    : "Sem data de acompanhamento"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">
          Nenhuma negociação em andamento.
        </p>
      )}
    </section>
  );
}
