import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEventosCalendario } from "@/lib/queries";
import { URGENCIA_COR, formatarPrazo } from "@/lib/alertas";
import { CalendarioGrid } from "@/components/calendario-grid";
import { CATEGORIA_LABEL } from "@/lib/types";
import { hojeISO } from "@/lib/data-br";
import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BotaoEnviar } from "@/components/botao-enviar";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; responsavel?: string; categoria?: string; urgencia?: string }>;
}) {
  const { mes, responsavel, categoria, urgencia } = await searchParams;
  const supabase = await createClient();

  const referencia = mes ? parseISO(`${mes}-01`) : new Date(`${hojeISO()}T00:00:00`);

  const { data: usuarios } = await supabase.from("usuarios").select("id, nome").order("nome");

  const todosEventos = await getEventosCalendario();
  const nomeResponsavelFiltro = usuarios?.find((u) => u.id === responsavel)?.nome;
  // filtro de responsável só afeta eventos que têm responsável (etapas);
  // contas de locação ainda não têm responsável individual, então
  // continuam aparecendo mesmo com o filtro ativo.
  const eventosFiltrados = todosEventos
    .filter((e) => (responsavel ? e.href.startsWith("/locacao") || e.responsavelNome === nomeResponsavelFiltro : true))
    .filter((e) => (categoria ? e.categoria === categoria : true))
    .filter((e) =>
      urgencia && ["atrasada", "vence_hoje", "vence_em_breve"].includes(urgencia)
        ? !e.concluida && e.urgencia === urgencia
        : true
    );

  const mesAnterior = format(addMonths(referencia, -1), "yyyy-MM");
  const proximoMes = format(addMonths(referencia, 1), "yyyy-MM");

  const inicioMesStr = format(referencia, "yyyy-MM");
  const eventosDoMes = eventosFiltrados.filter((e) => e.data.startsWith(inicioMesStr));
  const filtrosNavegacao = `${responsavel ? `&responsavel=${responsavel}` : ""}${categoria ? `&categoria=${categoria}` : ""}${urgencia ? `&urgencia=${urgencia}` : ""}`;

  const alertasCriticos = eventosDoMes
    .filter((e) => !e.concluida && (e.urgencia === "atrasada" || e.urgencia === "vence_hoje" || e.urgencia === "vence_em_breve"))
    .sort((a, b) => (a.diasParaVencer ?? 0) - (b.diasParaVencer ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Calendário</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {format(referencia, "MMMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form className="flex items-center gap-1.5">
            <select
              name="categoria"
              defaultValue={categoria ?? ""}
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-brand"
            >
              <option value="">Todos os processos</option>
              <option value="venda">Venda</option>
              <option value="financiamento">Financiamento</option>
              <option value="locacao">Locação</option>
            </select>
            <select
              name="responsavel"
              defaultValue={responsavel ?? ""}
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-brand"
            >
              <option value="">Todos os responsáveis</option>
              {(usuarios ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
            <select
              name="urgencia"
              defaultValue={urgencia ?? ""}
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-brand"
            >
              <option value="">Todos os prazos</option>
              <option value="atrasada">Atrasados</option>
              <option value="vence_hoje">Vencendo hoje</option>
              <option value="vence_em_breve">Vencendo em 7 dias</option>
            </select>
            {mes && <input type="hidden" name="mes" value={mes} />}
            <BotaoEnviar
              className="rounded-md border border-border px-2.5 py-1.5 text-sm text-ink-muted hover:bg-surface"
            >
              Filtrar
            </BotaoEnviar>
          </form>
          <Link
            href={`/calendario?mes=${mesAnterior}${filtrosNavegacao}`}
            className="rounded-md border border-border px-2.5 py-1.5 text-sm text-ink-muted hover:bg-surface"
          >
            ← Anterior
          </Link>
          <Link
            href={`/calendario?mes=${proximoMes}${filtrosNavegacao}`}
            className="rounded-md border border-border px-2.5 py-1.5 text-sm text-ink-muted hover:bg-surface"
          >
            Próximo →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <CalendarioGrid eventos={eventosFiltrados} referencia={referencia} />

        <aside className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Alertas do período</h2>
          {alertasCriticos.length === 0 ? (
            <p className="text-sm text-ink-muted">Nada crítico neste mês.</p>
          ) : (
            <ul className="space-y-2">
              {alertasCriticos.map((e) => (
                <li key={e.id} className="rounded-lg border border-border bg-surface p-2.5">
                  <Link href={e.href} className="text-xs font-medium text-ink hover:underline">
                    {e.titulo}
                  </Link>
                  <p className="text-[11px] text-ink-muted">
                    {CATEGORIA_LABEL[e.categoria]}
                    {e.responsavelNome ? ` · ${e.responsavelNome}` : ""}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${URGENCIA_COR[e.urgencia]}`}
                  >
                    {formatarPrazo(e.diasParaVencer)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
