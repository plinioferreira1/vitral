import Link from "next/link";
import { getEventosCalendario } from "@/lib/queries";
import { formatarPrazo } from "@/lib/alertas";
import { CATEGORIA_LABEL } from "@/lib/types";
import { CalendarioGrid } from "@/components/calendario-grid";
import { IconeBadge, Icones, type TomBadge } from "@/components/icone-badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const URGENCIA_BARRA: Record<string, string> = {
  atrasada: "border-l-rose-500",
  vence_hoje: "border-l-amber-500",
  vence_em_breve: "border-l-amber-400",
  no_prazo: "border-l-emerald-500",
  concluida: "border-l-stone-300",
  sem_data: "border-l-stone-300",
};

export default async function DashboardPage() {
  const eventos = await getEventosCalendario();
  const pendentes = eventos.filter((e) => !e.concluida);

  const atrasados = pendentes.filter((e) => e.urgencia === "atrasada");
  const venceHoje = pendentes.filter((e) => e.urgencia === "vence_hoje");
  const venceEmBreve = pendentes.filter((e) => e.urgencia === "vence_em_breve");

  const criticos = [...atrasados, ...venceHoje, ...venceEmBreve]
    .sort((a, b) => (a.diasParaVencer ?? 0) - (b.diasParaVencer ?? 0))
    .slice(0, 10);

  const referencia = new Date();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-serif font-bold uppercase tracking-wide text-ink">Início</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {format(referencia, "MMMM yyyy", { locale: ptBR })} · prazos de vendas, financiamento e
          locação, tudo num só lugar.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Em aberto" value={pendentes.length} tom="brand" icone={Icones.relogio} />
        <StatCard label="Atrasados" value={atrasados.length} tom="rose" icone={Icones.alerta} />
        <StatCard label="Vencendo hoje" value={venceHoje.length} tom="amber" icone={Icones.calendario} />
        <StatCard
          label="Vencendo em 7 dias"
          value={venceEmBreve.length}
          tom="gold"
          icone={Icones.calendario}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Calendário</h2>
            <Link href="/calendario" className="text-xs font-medium text-brand hover:underline">
              Abrir calendário completo →
            </Link>
          </div>
          <CalendarioGrid eventos={eventos} referencia={referencia} maxPorDia={2} />
        </div>

        <aside className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Prazos críticos</h2>
          {criticos.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface p-5 text-center text-sm text-ink-muted">
              Nenhum prazo atrasado ou vencendo nos próximos dias. 🎉
            </p>
          ) : (
            <ul className="space-y-2">
              {criticos.map((e) => (
                <li
                  key={e.id}
                  className={`rounded-lg border border-l-[3px] border-border bg-surface p-3 ${URGENCIA_BARRA[e.urgencia]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link href={e.href} className="text-xs font-medium text-ink hover:underline">
                      {e.titulo}
                    </Link>
                    <span className="shrink-0 text-[10px] font-medium text-ink-muted">
                      {formatarPrazo(e.diasParaVencer)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {CATEGORIA_LABEL[e.categoria]}
                    {e.responsavelNome ? ` · ${e.responsavelNome}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>
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
  tom,
  icone,
}: {
  label: string;
  value: number;
  tom: TomBadge;
  icone: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <IconeBadge tom={tom} icone={icone} />
      <p className="mt-3 font-mono text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{label}</p>
    </div>
  );
}
