import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEtapasComContexto } from "@/lib/queries";
import { URGENCIA_COR, URGENCIA_LABEL, formatarPrazo } from "@/lib/alertas";
import { CATEGORIA_LABEL, TIPO_CONTA_LABEL, type CategoriaProcesso, type TipoContaLocacao } from "@/lib/types";

const CATEGORIA_COR: Record<CategoriaProcesso, string> = {
  venda: "bg-brand/10 text-brand border-brand/20",
  financiamento: "bg-gold-soft text-gold border-gold/30",
  locacao: "bg-stone-100 text-stone-600 border-stone-200",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const etapas = await getEtapasComContexto();
  const pendentes = etapas.filter((e) => e.status !== "concluida");

  const atrasadas = pendentes.filter((e) => e.urgencia === "atrasada");
  const venceHoje = pendentes.filter((e) => e.urgencia === "vence_hoje");
  const venceEmBreve = pendentes.filter((e) => e.urgencia === "vence_em_breve");

  const criticas = [...atrasadas, ...venceHoje, ...venceEmBreve].slice(0, 8);

  const { data: contasPendentesRaw } = await supabase
    .from("contas_locacao")
    .select(
      `id, tipo, competencia, vencimento, contrato_id,
       contratos_locacao ( numero, imoveis ( endereco ) )`
    )
    .eq("status", "pendente")
    .order("vencimento", { ascending: true, nullsFirst: true })
    .limit(6);

  type ContaPendente = {
    id: string;
    tipo: TipoContaLocacao;
    competencia: string;
    vencimento: string | null;
    contrato_id: string;
    contratos_locacao: { numero: string; imoveis: { endereco: string } | null } | null;
  };
  const contasLocacaoPendentes = (contasPendentesRaw ?? []) as unknown as ContaPendente[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-serif font-semibold text-ink">Início</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Resumo de prazos em aberto em todos os processos.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Etapas em aberto" value={pendentes.length} />
        <StatCard label="Atrasadas" value={atrasadas.length} tone="rose" />
        <StatCard label="Vencendo hoje" value={venceHoje.length} tone="amber" />
        <StatCard label="Vencendo em 7 dias" value={venceEmBreve.length} tone="amber" />
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Prazos críticos</h2>
          <Link href="/calendario" className="text-xs text-gold hover:underline">
            Ver calendário completo →
          </Link>
        </div>

        {criticas.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">
            Nenhum prazo atrasado ou vencendo nos próximos dias. 🎉
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {criticas.map((e) => {
              const categoria = (e.processo?.categoria ?? "venda") as CategoriaProcesso;
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 py-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${CATEGORIA_COR[categoria]}`}
                      >
                        {CATEGORIA_LABEL[categoria]}
                      </span>
                      <Link
                        href={`/processos/${e.processo_id}`}
                        className="truncate text-sm font-medium text-ink hover:underline"
                      >
                        {e.processo?.imoveis?.endereco
                          ? `${e.processo.imoveis.endereco} — ${e.nome}`
                          : e.nome}
                      </Link>
                    </div>
                    <p className="mt-0.5 pl-[3.1rem] text-xs text-ink-muted">
                      {e.processo?.numero_processo} · {e.processo?.comprador?.nome ?? "sem comprador"} ·{" "}
                      {e.responsavel_nome ?? "sem responsável"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${URGENCIA_COR[e.urgencia]}`}
                  >
                    {formatarPrazo(e.dias_para_vencer) || URGENCIA_LABEL[e.urgencia]}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">
            <span
              className={`mr-2 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${CATEGORIA_COR.locacao}`}
            >
              Locação
            </span>
            Contas pendentes
          </h2>
          <Link href="/locacao" className="text-xs text-gold hover:underline">
            Ver locação completo →
          </Link>
        </div>

        {contasLocacaoPendentes.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">
            Nenhuma conta de locação pendente. 🎉
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {contasLocacaoPendentes.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <Link
                    href={`/locacao/${c.contrato_id}`}
                    className="truncate text-sm font-medium text-ink hover:underline"
                  >
                    {c.contratos_locacao?.imoveis?.endereco ?? c.contratos_locacao?.numero} —{" "}
                    {TIPO_CONTA_LABEL[c.tipo]}
                  </Link>
                  <p className="text-xs text-ink-muted">
                    Competência:{" "}
                    {new Date(c.competencia + "T00:00:00").toLocaleDateString("pt-BR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                  Pendente
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-3">
        <Link
          href="/processos/novo"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Novo processo
        </Link>
        <Link
          href="/processos"
          className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-background"
        >
          Ver todos os processos
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "rose" | "amber";
}) {
  const toneClass =
    tone === "rose"
      ? "text-rose-700"
      : tone === "amber"
        ? "text-amber-700"
        : "text-ink";

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <p className={`font-mono text-2xl font-semibold ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{label}</p>
    </div>
  );
}
