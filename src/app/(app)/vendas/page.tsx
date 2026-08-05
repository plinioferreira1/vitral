import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEventosCalendario } from "@/lib/queries";
import { ResumoPrazos } from "@/components/resumo-prazos";
import { CalendarioGrid } from "@/components/calendario-grid";
import { TabelaProcessos, type ProcessoRow } from "@/components/tabela-processos";
import { hojeISO } from "@/lib/data-br";

type Aba = "resumo" | "andamento";

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba: abaParam } = await searchParams;
  const aba: Aba = abaParam === "andamento" ? "andamento" : "resumo";

  const supabase = await createClient();

  const { data: processos, error } = await supabase
    .from("processos")
    .select(
      `id, numero_processo, tipo, status, data_criacao, valor_total, valor_financiado, origem,
       imoveis ( endereco ),
       comprador:clientes!processos_comprador_id_fkey ( nome ),
       vendedor:clientes!processos_vendedor_id_fkey ( nome ),
       corretores!processos_corretor_id_fkey ( nome ), bancos ( nome ),
       indicacao:corretores!processos_indicacao_id_fkey ( nome ),
       modelos_processo ( nome )`
    )
    .eq("categoria", "venda")
    .order("criado_em", { ascending: false });

  if (error) {
    return <p className="text-sm text-rose-700">Erro ao carregar processos: {error.message}</p>;
  }

  const rows = (processos ?? []) as unknown as ProcessoRow[];
  const emAndamento = rows.filter((p) => p.status !== "concluido" && p.status !== "cancelado");
  const concluidos = rows.filter((p) => p.status === "concluido" || p.status === "cancelado");

  const eventos = (await getEventosCalendario()).filter((e) => e.categoria === "venda");
  const referencia = new Date(`${hojeISO()}T00:00:00`);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Vendas</h1>
          <p className="mt-1 text-sm text-ink-muted">{rows.length} processos nessa categoria</p>
        </div>
        <Link
          href="/processos/novo"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Novo processo
        </Link>
      </div>

      <div className="flex gap-1 rounded-lg bg-background p-1 text-sm w-fit">
        <Link
          href="/vendas?aba=resumo"
          className={`rounded-md px-4 py-1.5 text-center font-medium transition ${
            aba === "resumo" ? "bg-surface shadow-sm text-ink" : "text-ink-muted"
          }`}
        >
          Resumo
        </Link>
        <Link
          href="/vendas?aba=andamento"
          className={`rounded-md px-4 py-1.5 text-center font-medium transition ${
            aba === "andamento" ? "bg-surface shadow-sm text-ink" : "text-ink-muted"
          }`}
        >
          Em andamento
        </Link>
      </div>

      {aba === "resumo" ? (
        <div className="space-y-6">
          <ResumoPrazos eventos={eventos} hrefEmAberto="/calendario?categoria=venda" />
          <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">Calendário</p>
              <Link href="/calendario?categoria=venda" className="text-xs font-medium text-brand hover:underline">
                Abrir calendário completo →
              </Link>
            </div>
            <CalendarioGrid eventos={eventos} referencia={referencia} maxPorDia={2} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
            {emAndamento.length === 0 && concluidos.length === 0 ? (
              <p className="p-8 text-center text-sm text-ink-muted">
                Nenhum processo nessa categoria ainda.{" "}
                <Link href="/processos/novo" className="text-brand hover:underline">
                  Criar o primeiro
                </Link>
                .
              </p>
            ) : (
              <TabelaProcessos rows={emAndamento} ehFinanciamento={false} />
            )}
          </div>

          {concluidos.length > 0 && (
            <details className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
              <summary className="cursor-pointer select-none px-5 py-3 text-sm font-medium text-ink-muted hover:text-ink">
                {concluidos.length} processo{concluidos.length > 1 ? "s" : ""} concluído
                {concluidos.length > 1 ? "s" : ""} ou cancelado{concluidos.length > 1 ? "s" : ""}
              </summary>
              <div className="border-t border-border">
                <TabelaProcessos rows={concluidos} ehFinanciamento={false} />
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
