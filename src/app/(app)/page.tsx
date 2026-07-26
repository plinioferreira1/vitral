import Link from "next/link";
import { getEtapasComContexto } from "@/lib/queries";
import { URGENCIA_COR, URGENCIA_LABEL, formatarPrazo } from "@/lib/alertas";

export default async function DashboardPage() {
  const etapas = await getEtapasComContexto();
  const pendentes = etapas.filter((e) => e.status !== "concluida");

  const atrasadas = pendentes.filter((e) => e.urgencia === "atrasada");
  const venceHoje = pendentes.filter((e) => e.urgencia === "vence_hoje");
  const venceEmBreve = pendentes.filter((e) => e.urgencia === "vence_em_breve");

  const criticas = [...atrasadas, ...venceHoje, ...venceEmBreve].slice(0, 8);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">Início</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Resumo de prazos em aberto em todos os processos.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Etapas em aberto" value={pendentes.length} />
        <StatCard label="Atrasadas" value={atrasadas.length} tone="rose" />
        <StatCard label="Vencendo hoje" value={venceHoje.length} tone="amber" />
        <StatCard label="Vencendo em 7 dias" value={venceEmBreve.length} tone="amber" />
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Prazos críticos</h2>
          <Link href="/calendario" className="text-xs text-brand hover:underline">
            Ver calendário completo →
          </Link>
        </div>

        {criticas.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">
            Nenhum prazo atrasado ou vencendo nos próximos dias. 🎉
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {criticas.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <Link
                    href={`/processos/${e.processo_id}`}
                    className="truncate text-sm font-medium text-ink hover:underline"
                  >
                    {e.nome} — {e.processo?.comprador?.nome ?? "Sem comprador"}
                  </Link>
                  <p className="text-xs text-ink-muted">
                    {e.processo?.numero_processo} · {e.responsavel_nome ?? "sem responsável"}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${URGENCIA_COR[e.urgencia]}`}
                >
                  {formatarPrazo(e.dias_para_vencer) || URGENCIA_LABEL[e.urgencia]}
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
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className={`font-mono text-2xl font-semibold ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{label}</p>
    </div>
  );
}
