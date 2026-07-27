import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { anexarUrgencia, URGENCIA_COR, formatarPrazo } from "@/lib/alertas";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; responsavel?: string }>;
}) {
  const { mes, responsavel } = await searchParams;
  const supabase = await createClient();

  const referencia = mes ? parseISO(`${mes}-01`) : new Date();
  const inicioMes = startOfMonth(referencia);
  const fimMes = endOfMonth(referencia);
  const inicioGrade = startOfWeek(inicioMes, { weekStartsOn: 0 });
  const fimGrade = endOfWeek(fimMes, { weekStartsOn: 0 });
  const dias = eachDayOfInterval({ start: inicioGrade, end: fimGrade });

  const { data: usuarios } = await supabase.from("usuarios").select("id, nome").order("nome");

  let query = supabase
    .from("etapas")
    .select(
      `id, nome, data_prevista, status, responsavel_id,
       usuarios ( nome ),
       processos!inner ( id, numero_processo, imoveis ( endereco ), comprador:clientes!processos_comprador_id_fkey ( nome ) )`
    )
    .gte("data_prevista", format(inicioGrade, "yyyy-MM-dd"))
    .lte("data_prevista", format(fimGrade, "yyyy-MM-dd"));

  if (responsavel) query = query.eq("responsavel_id", responsavel);

  const { data: etapasRaw } = await query;

  type Row = {
    id: string;
    nome: string;
    data_prevista: string;
    status: string;
    responsavel_id: string | null;
    usuarios: { nome: string } | null;
    processos: {
      id: string;
      numero_processo: string;
      imoveis: { endereco: string } | null;
      comprador: { nome: string } | null;
    };
  };
  const rows = (etapasRaw ?? []) as unknown as Row[];
  const comUrgencia = anexarUrgencia(rows as unknown as Parameters<typeof anexarUrgencia>[0]);

  const porDia = new Map<string, typeof comUrgencia>();
  comUrgencia.forEach((e, i) => {
    const chave = rows[i].data_prevista;
    if (!porDia.has(chave)) porDia.set(chave, []);
    porDia.get(chave)!.push(e);
  });

  const mesAnterior = format(addMonths(referencia, -1), "yyyy-MM");
  const proximoMes = format(addMonths(referencia, 1), "yyyy-MM");

  const alertasCriticos = comUrgencia
    .filter((e) => e.status !== "concluida" && (e.urgencia === "atrasada" || e.urgencia === "vence_hoje" || e.urgencia === "vence_em_breve"))
    .sort((a, b) => (a.dias_para_vencer ?? 0) - (b.dias_para_vencer ?? 0));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-serif font-semibold text-ink">Calendário</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {format(referencia, "MMMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form className="flex items-center gap-1.5">
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
            {mes && <input type="hidden" name="mes" value={mes} />}
            <button
              type="submit"
              className="rounded-md border border-border px-2.5 py-1.5 text-sm text-ink-muted hover:bg-surface"
            >
              Filtrar
            </button>
          </form>
          <Link
            href={`/calendario?mes=${mesAnterior}${responsavel ? `&responsavel=${responsavel}` : ""}`}
            className="rounded-md border border-border px-2.5 py-1.5 text-sm text-ink-muted hover:bg-surface"
          >
            ← Anterior
          </Link>
          <Link
            href={`/calendario?mes=${proximoMes}${responsavel ? `&responsavel=${responsavel}` : ""}`}
            className="rounded-md border border-border px-2.5 py-1.5 text-sm text-ink-muted hover:bg-surface"
          >
            Próximo →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="grid grid-cols-7 border-b border-border bg-background text-center text-xs font-medium text-ink-muted">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {dias.map((dia) => {
              const chave = format(dia, "yyyy-MM-dd");
              const eventosDoDia = porDia.get(chave) ?? [];
              const foraDoMes = !isSameMonth(dia, referencia);

              return (
                <div
                  key={chave}
                  className={`min-h-[92px] border-b border-r border-border p-1.5 last:border-r-0 ${
                    foraDoMes ? "bg-background/50" : ""
                  }`}
                >
                  <p
                    className={`mb-1 text-xs ${
                      isToday(dia)
                        ? "flex h-5 w-5 items-center justify-center rounded-full bg-brand font-medium text-white"
                        : foraDoMes
                          ? "text-ink-muted/50"
                          : "text-ink-muted"
                    }`}
                  >
                    {format(dia, "d")}
                  </p>
                  <div className="space-y-1">
                    {eventosDoDia.slice(0, 3).map((e) => {
                      const orig = rows.find((r) => r.id === e.id);
                      const label = orig?.processos.imoveis?.endereco
                        ? `${orig.processos.imoveis.endereco} — ${e.nome}`
                        : e.nome;
                      return (
                        <Link
                          key={e.id}
                          href={`/processos/${orig?.processos.id}`}
                          className={`block truncate rounded border px-1 py-0.5 text-[10px] leading-tight ${
                            e.status === "concluida"
                              ? "border-stone-200 bg-stone-100 text-stone-500"
                              : URGENCIA_COR[e.urgencia]
                          }`}
                          title={label}
                        >
                          {label}
                        </Link>
                      );
                    })}
                    {eventosDoDia.length > 3 && (
                      <p className="text-[10px] text-ink-muted">+{eventosDoDia.length - 3} mais</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Alertas do período</h2>
          {alertasCriticos.length === 0 ? (
            <p className="text-sm text-ink-muted">Nada crítico neste mês.</p>
          ) : (
            <ul className="space-y-2">
              {alertasCriticos.map((e) => {
                const original = rows.find((r) => r.id === e.id)!;
                return (
                  <li key={e.id} className="rounded-lg border border-border bg-surface p-2.5">
                    <Link
                      href={`/processos/${original.processos.id}`}
                      className="text-xs font-medium text-ink hover:underline"
                    >
                      {original.processos.imoveis?.endereco
                        ? `${original.processos.imoveis.endereco} — ${e.nome}`
                        : e.nome}
                    </Link>
                    <p className="text-[11px] text-ink-muted">
                      {original.processos.comprador?.nome ?? "—"} · {original.usuarios?.nome ?? "sem responsável"}
                    </p>
                    <span
                      className={`mt-1 inline-block rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${URGENCIA_COR[e.urgencia]}`}
                    >
                      {formatarPrazo(e.dias_para_vencer)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
