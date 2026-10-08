import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, CircleDollarSign, Clock3, Landmark, type LucideIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { identificacaoProcesso } from "@/lib/identificacao-processo";
import type { Urgencia } from "@/lib/alertas";
import type { ProcessoRow } from "@/components/tabela-processos";

export type PrioridadeResumo = { id: string; processo_id: string; nome: string; urgencia: Urgencia; dias_para_vencer: number | null; data_prevista: string | null; processo?: ProcessoRow };

export function PainelResumoProcessos({ categoria, ativos, encerrados, atrasados, proximos, hoje, volume, prioridades }: { categoria: "venda" | "financiamento"; ativos: number; encerrados: number; atrasados: number; proximos: number; hoje: number; volume: string; prioridades: PrioridadeResumo[] }) {
  const base = categoria === "venda" ? "/vendas" : "/financiamentos";
  return <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <IndicadorResumo
              icon={Clock3}
              label="Processos ativos"
              value={String(ativos)}
              detail={`${encerrados} encerrados no histórico`}
              href={`${base}?aba=andamento`}
            />
            <IndicadorResumo
              icon={AlertTriangle}
              label="Com atraso"
              value={String(atrasados)}
              detail={atrasados ? "Precisam de atenção" : "Nenhum processo atrasado"}
              href={`/calendario?categoria=${categoria}&urgencia=atrasada`}
              tom={atrasados ? "perigo" : "sucesso"}
            />
            <IndicadorResumo
              icon={CalendarClock}
              label="Próximos 7 dias"
              value={String(proximos)}
              detail={`${hoje} vencendo hoje`}
              href={`/calendario?categoria=${categoria}&urgencia=vence_em_breve`}
            />
            <IndicadorResumo
              icon={categoria === "venda" ? CircleDollarSign : Landmark}
              label={categoria === "venda" ? "Volume em negociação" : "Volume financiado"}
              value={volume}
              detail="Soma dos processos ativos"
              href={`${base}?aba=andamento`}
              tom="destaque"
            />
          </div>

          <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-ink">Prioridades agora</h2>
                <p className="mt-0.5 text-xs text-ink-muted">Etapas vencidas ou com prazo nos próximos 7 dias.</p>
              </div>
              <Link href={`/calendario?categoria=${categoria}`} className="text-xs font-semibold text-brand hover:underline">
                Ver todas
              </Link>
            </div>
            {prioridades.length === 0 ? (
              <div className="flex items-center gap-3 px-5 py-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <CheckCircle2 size={19} />
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">Tudo em dia</p>
                  <p className="text-xs text-ink-muted">Nenhuma etapa exige atenção agora.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {prioridades.slice(0, 5).map((prioridade) => {
                  const atrasada = prioridade.urgencia === "atrasada";
                  const venceHoje = prioridade.urgencia === "vence_hoje";
                  const diasParaVencer = prioridade.dias_para_vencer ?? 0;
                  const prazo =
                    diasParaVencer < 0
                      ? `Atrasada há ${Math.abs(diasParaVencer)} dia${Math.abs(diasParaVencer) === 1 ? "" : "s"}`
                      : venceHoje
                        ? "Vence hoje"
                        : `Vence em ${diasParaVencer} dia${diasParaVencer === 1 ? "" : "s"}`;
                  return (
                    <Link
                      key={prioridade.id}
                      href={`/processos/${prioridade.processo_id}#etapa-${prioridade.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-background"
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        atrasada ? "bg-rose-500" : venceHoje ? "bg-amber-500" : "bg-sky-500"
                      }`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{prioridade.nome}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {prioridade.processo?.imoveis?.endereco ?? identificacaoProcesso(prioridade.processo ?? {}, categoria)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className={`block text-xs font-semibold ${
                          atrasada ? "text-rose-600" : venceHoje ? "text-amber-700" : "text-sky-700"
                        }`}>{prazo}</span>
                        <span className="block text-[11px] text-ink-muted">
                          {format(parseISO(prioridade.data_prevista!), "dd MMM", { locale: ptBR })}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>


  </>;
}

function IndicadorResumo({
  icon: Icone,
  label,
  value,
  detail,
  href,
  tom = "neutro",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  href: string;
  tom?: "neutro" | "perigo" | "sucesso" | "destaque";
}) {
  const estilo =
    tom === "perigo"
      ? "border-rose-200 bg-rose-50/70 text-rose-700"
      : tom === "sucesso"
        ? "border-emerald-200 bg-emerald-50/70 text-emerald-700"
        : tom === "destaque"
          ? "border-brand/20 bg-brand text-white"
          : "border-border bg-surface text-brand";

  return (
    <Link
      href={href}
      className={`group min-w-0 rounded-xl border p-4 shadow-sm transition hover:opacity-90 ${estilo}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          tom === "destaque" ? "bg-white/15" : "bg-white/80"
        }`}>
          <Icone size={18} />
        </span>
        <span className={`hidden text-[11px] font-semibold uppercase tracking-wide sm:inline ${
          tom === "destaque" ? "text-white/65" : "text-current opacity-65"
        }`}>Ver detalhes</span>
      </div>
      <p className="mt-2 break-words text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
      <p className={`mt-0.5 text-sm font-medium ${tom === "destaque" ? "text-white/90" : "text-ink"}`}>{label}</p>
      <p className={`mt-1 text-xs ${tom === "destaque" ? "text-white/60" : "text-ink-muted"}`}>{detail}</p>
    </Link>
  );
}
