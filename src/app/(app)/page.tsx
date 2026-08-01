import Link from "next/link";
import { getEventosCalendario } from "@/lib/queries";
import { formatarPrazo } from "@/lib/alertas";
import { CATEGORIA_LABEL } from "@/lib/types";
import { CalendarioGrid } from "@/components/calendario-grid";
import { Icones } from "@/components/icone-badge";
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

const FILTRO_LABEL: Record<string, string> = {
  atrasada: "Atrasados",
  vence_hoje: "Vencendo hoje",
  vence_em_breve: "Vencendo em 7 dias",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { filtro } = await searchParams;
  const eventos = await getEventosCalendario();
  // Locação já tem o resumo dela própria na aba de Inadimplências — aqui só
  // Vendas e Financiamento, senão a contagem infla e perde o sentido.
  const pendentes = eventos.filter((e) => !e.concluida && e.categoria !== "locacao");

  const atrasados = pendentes.filter((e) => e.urgencia === "atrasada");
  const venceHoje = pendentes.filter((e) => e.urgencia === "vence_hoje");
  const venceEmBreve = pendentes.filter((e) => e.urgencia === "vence_em_breve");

  const todosCriticos = [...atrasados, ...venceHoje, ...venceEmBreve].sort(
    (a, b) => (a.diasParaVencer ?? 0) - (b.diasParaVencer ?? 0)
  );

  const criticos = filtro
    ? todosCriticos.filter((e) => e.urgencia === filtro).slice(0, 20)
    : todosCriticos.slice(0, 10);

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
        <StatCardLink href="/calendario" label="Em aberto" value={pendentes.length} bg="#6B5D57" icone={Icones.relogio} />
        <StatCardLink
          href="/?filtro=atrasada"
          label="Atrasados"
          value={atrasados.length}
          bg="#9F1D1D"
          icone={Icones.alerta}
          ativo={filtro === "atrasada"}
        />
        <StatCardLink
          href="/?filtro=vence_hoje"
          label="Vencendo hoje"
          value={venceHoje.length}
          bg="#B9822C"
          icone={Icones.calendario}
          ativo={filtro === "vence_hoje"}
        />
        <StatCardLink
          href="/?filtro=vence_em_breve"
          label="Vencendo em 7 dias"
          value={venceEmBreve.length}
          bg="#8C6423"
          icone={Icones.calendario}
          ativo={filtro === "vence_em_breve"}
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
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">
              {filtro ? FILTRO_LABEL[filtro] ?? "Prazos críticos" : "Prazos críticos"}
            </h2>
            {filtro && (
              <Link href="/" className="text-xs text-ink-muted hover:underline">
                limpar filtro
              </Link>
            )}
          </div>
          {criticos.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface p-5 text-center text-sm text-ink-muted">
              {filtro ? "Nada aqui." : "Nenhum prazo atrasado ou vencendo nos próximos dias. 🎉"}
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

function StatCardLink({
  href,
  label,
  value,
  bg,
  icone,
  ativo,
  detalhe,
}: {
  href: string;
  label: string;
  value: number;
  bg: string;
  icone: React.ReactNode;
  ativo?: boolean;
  detalhe?: string;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-xl p-5 text-white transition hover:opacity-90 ${
        ativo ? "ring-2 ring-offset-2 ring-offset-background" : ""
      }`}
      style={{ backgroundColor: bg, ...(ativo ? ({ ["--tw-ring-color" as string]: bg }) : {}) }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
        {icone}
      </div>
      <p className="mt-3 font-mono text-2xl font-semibold">{value}</p>
      <p className="mt-0.5 text-xs text-white/80">{label}</p>
      {detalhe && <p className="mt-1 text-[10px] text-white/60">{detalhe}</p>}
    </Link>
  );
}
