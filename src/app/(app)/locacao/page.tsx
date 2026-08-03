import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { alternarTarefaMensal } from "./actions";
import { TIPO_CONTA_LABEL } from "@/lib/types";
import { calcularUrgencia, URGENCIA_COR } from "@/lib/alertas";
import { Icones } from "@/components/icone-badge";
import { hojeISO } from "@/lib/data-br";
import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function primeiroDiaDoMes(): string {
  return `${hojeISO().slice(0, 7)}-01`;
}

type Aba = "contratos" | "inadimplencias";
type Filtro = "mes" | "atrasadas" | "pagas" | undefined;

export default async function LocacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; aba?: string; filtro?: string }>;
}) {
  const { mes, aba: abaParam, filtro: filtroParam } = await searchParams;
  const aba: Aba = abaParam === "inadimplencias" ? "inadimplencias" : "contratos";
  const filtro: Filtro =
    filtroParam === "mes" || filtroParam === "atrasadas" || filtroParam === "pagas"
      ? filtroParam
      : undefined;

  const supabase = await createClient();
  const competenciaAtual = primeiroDiaDoMes();

  const mesReferencia = mes ? parseISO(`${mes}-01`) : new Date(`${hojeISO()}T00:00:00`);
  const inicioMes = format(mesReferencia, "yyyy-MM-01");
  const fimMes = format(addMonths(mesReferencia, 1), "yyyy-MM-01");
  const mesAnterior = format(addMonths(mesReferencia, -1), "yyyy-MM");
  const proximoMes = format(addMonths(mesReferencia, 1), "yyyy-MM");
  const mesLabel = format(mesReferencia, "MMMM yyyy", { locale: ptBR });

  const { data: contratos } = await supabase
    .from("contratos_locacao")
    .select(
      `id, numero, ativo,
       imoveis ( endereco ),
       locador:clientes!contratos_locacao_locador_id_fkey ( nome ),
       locatario:clientes!contratos_locacao_locatario_id_fkey ( nome )`
    )
    .order("numero", { ascending: true });

  const { data: contasPendentesRaw } = await supabase
    .from("contas_locacao")
    .select("id, tipo, status, competencia, contrato_id, vencimento")
    .eq("status", "pendente")
    .order("vencimento", { ascending: true, nullsFirst: true });

  type ContaLinha = {
    id: string;
    tipo: import("@/lib/types").TipoContaLocacao;
    status: string;
    competencia: string;
    contrato_id: string;
    vencimento: string | null;
  };
  const contasPendentes = (contasPendentesRaw ?? []) as ContaLinha[];

  const { data: contasPagasNoMesRaw } = await supabase
    .from("contas_locacao")
    .select("id, tipo, status, competencia, contrato_id, vencimento")
    .eq("status", "pago")
    .gte("competencia", inicioMes)
    .lt("competencia", fimMes)
    .order("competencia", { ascending: false });
  const contasPagasNoMes = (contasPagasNoMesRaw ?? []) as ContaLinha[];

  const pendentesNoMes = contasPendentes.filter(
    (c) => c.competencia >= inicioMes && c.competencia < fimMes
  );
  const atrasadasLista = contasPendentes.filter(
    (c) =>
      calcularUrgencia({ status: "pendente", data_prevista: c.vencimento ?? c.competencia }).urgencia ===
      "atrasada"
  );

  const { data: tarefas } = await supabase
    .from("tarefas_mensais")
    .select("id, nome, regra, ordem")
    .order("ordem", { ascending: true });

  const { data: tarefasStatus } = await supabase
    .from("tarefas_mensais_status")
    .select("id, tarefa_id, competencia, concluida")
    .eq("competencia", competenciaAtual);

  type ContratoRow = {
    id: string;
    numero: string;
    ativo: boolean;
    imoveis: { endereco: string } | null;
    locador: { nome: string } | null;
    locatario: { nome: string } | null;
  };
  const listaContratos = (contratos ?? []) as unknown as ContratoRow[];

  const contratosPorId = new Map(listaContratos.map((c) => [c.id, c]));

  const vencidasPorContrato = new Map<string, number>();
  contasPendentes.forEach((c) => {
    const { urgencia } = calcularUrgencia({
      status: "pendente",
      data_prevista: c.vencimento ?? c.competencia,
    });
    if (urgencia === "atrasada") {
      vencidasPorContrato.set(c.contrato_id, (vencidasPorContrato.get(c.contrato_id) ?? 0) + 1);
    }
  });
  const totalContratosAtivos = listaContratos.filter((c) => c.ativo).length;

  // qual lista mostrar embaixo, conforme o cartão clicado
  const listaExibida =
    filtro === "mes" ? pendentesNoMes : filtro === "atrasadas" ? atrasadasLista : filtro === "pagas" ? contasPagasNoMes : contasPendentes;
  const tituloLista =
    filtro === "mes"
      ? `Contas pendentes em ${mesLabel}`
      : filtro === "atrasadas"
        ? "Contas atrasadas"
        : filtro === "pagas"
          ? `Contas pagas em ${mesLabel}`
          : "Contas pendentes";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Locação</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {totalContratosAtivos} contratos ativos · {contasPendentes.length} contas
            pendentes
          </p>
        </div>
        {aba === "contratos" && (
          <Link
            href="/locacao/novo"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            + Novo contrato
          </Link>
        )}
      </div>

      {aba === "contratos" ? (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
            {listaContratos.length === 0 ? (
              <p className="p-8 text-center text-sm text-ink-muted">
                Nenhum contrato ainda.{" "}
                <Link href="/locacao/novo" className="text-brand hover:underline">
                  Criar o primeiro
                </Link>
                .
              </p>
            ) : listaContratos.filter((c) => c.ativo).length === 0 ? (
              <p className="p-8 text-center text-sm text-ink-muted">
                Nenhum contrato ativo no momento (veja os encerrados abaixo).
              </p>
            ) : (
              <TabelaContratos
                contratos={listaContratos.filter((c) => c.ativo)}
                pendentesPorContrato={vencidasPorContrato}
              />
            )}
          </div>

          {listaContratos.some((c) => !c.ativo) && (
            <details className="group overflow-hidden rounded-xl border border-border/60 bg-surface shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-semibold text-ink">
                Contratos encerrados
                <span className="text-xs font-normal text-ink-muted group-open:hidden">
                  mostrar ({listaContratos.filter((c) => !c.ativo).length})
                </span>
                <span className="hidden text-xs font-normal text-ink-muted group-open:inline">
                  ocultar
                </span>
              </summary>
              <div className="border-t border-border">
                <TabelaContratos
                  contratos={listaContratos.filter((c) => !c.ativo)}
                  pendentesPorContrato={vencidasPorContrato}
                />
              </div>
            </details>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Visão geral do mês */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold capitalize text-ink">Visão geral · {mesLabel}</p>
              <div className="flex gap-1.5">
                <Link
                  href={`/locacao?aba=inadimplencias&mes=${mesAnterior}${filtro ? `&filtro=${filtro}` : ""}`}
                  className="rounded-md border border-border px-2.5 py-1 text-xs text-ink-muted hover:bg-surface"
                >
                  ← Mês anterior
                </Link>
                <Link
                  href={`/locacao?aba=inadimplencias&mes=${proximoMes}${filtro ? `&filtro=${filtro}` : ""}`}
                  className="rounded-md border border-border px-2.5 py-1 text-xs text-ink-muted hover:bg-surface"
                >
                  Próximo mês →
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Link
                href={`/locacao?aba=inadimplencias&mes=${format(mesReferencia, "yyyy-MM")}&filtro=mes`}
                className={`rounded-xl p-5 text-white transition hover:opacity-90 ${
                  filtro === "mes" ? "ring-2 ring-offset-2 ring-offset-background" : ""
                }`}
                style={{ backgroundColor: "#F59E0B", ["--tw-ring-color" as string]: "#F59E0B" }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
                  {Icones.relogio}
                </div>
                <p className="mt-3 font-mono text-2xl font-semibold">{pendentesNoMes.length}</p>
                <p className="mt-0.5 text-xs text-white/80">Contas pendentes no mês</p>
              </Link>
              <Link
                href={`/locacao?aba=inadimplencias&mes=${format(mesReferencia, "yyyy-MM")}&filtro=pagas`}
                className={`rounded-xl p-5 text-white transition hover:opacity-90 ${
                  filtro === "pagas" ? "ring-2 ring-offset-2 ring-offset-background" : ""
                }`}
                style={{ backgroundColor: "#0F7A4E", ["--tw-ring-color" as string]: "#0F7A4E" }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
                  {Icones.check}
                </div>
                <p className="mt-3 font-mono text-2xl font-semibold">{contasPagasNoMes.length}</p>
                <p className="mt-0.5 text-xs text-white/80">Contas pagas no mês</p>
              </Link>
              <Link
                href={`/locacao?aba=inadimplencias&mes=${format(mesReferencia, "yyyy-MM")}&filtro=atrasadas`}
                className={`rounded-xl p-5 text-white transition hover:opacity-90 ${
                  filtro === "atrasadas" ? "ring-2 ring-offset-2 ring-offset-background" : ""
                }`}
                style={{ backgroundColor: "#DC2626", ["--tw-ring-color" as string]: "#DC2626" }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
                  {Icones.alerta}
                </div>
                <p className="mt-3 font-mono text-2xl font-semibold">{atrasadasLista.length}</p>
                <p className="mt-0.5 text-xs text-white/80">Atrasadas (todos os meses)</p>
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-surface shadow-sm p-5">
            <p className="mb-3 text-sm font-semibold text-ink">Tarefas do mês</p>
            <div className="space-y-2">
              {(tarefas ?? []).map((t) => {
                const statusExistente = (tarefasStatus ?? []).find((s) => s.tarefa_id === t.id);
                const concluida = statusExistente?.concluida ?? false;
                return (
                  <form key={t.id} action={alternarTarefaMensal}>
                    <input type="hidden" name="tarefa_id" value={t.id} />
                    <input type="hidden" name="competencia" value={competenciaAtual} />
                    <input type="hidden" name="concluida_atual" value={String(concluida)} />
                    {statusExistente && (
                      <input type="hidden" name="status_id" value={statusExistente.id} />
                    )}
                    <button type="submit" className="flex w-full items-center gap-2.5 text-left text-sm">
                      <span
                        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border ${
                          concluida ? "border-brand bg-brand text-white" : "border-border-strong bg-surface"
                        }`}
                      >
                        {concluida && (
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2 6.5L4.5 9L10 3"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                      <span className={concluida ? "text-ink-muted line-through" : "text-ink"}>
                        {t.nome}
                      </span>
                      {t.regra && <span className="text-xs text-ink-muted">· {t.regra}</span>}
                    </button>
                  </form>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-surface shadow-sm p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">{tituloLista}</p>
              {filtro && (
                <Link
                  href={`/locacao?aba=inadimplencias&mes=${format(mesReferencia, "yyyy-MM")}`}
                  className="text-xs text-ink-muted hover:underline"
                >
                  limpar filtro
                </Link>
              )}
            </div>
            {listaExibida.length === 0 ? (
              <p className="text-sm text-ink-muted">Nada aqui. 🎉</p>
            ) : (
              <ul className="space-y-1.5">
                {listaExibida.slice(0, 30).map((c) => {
                  const contrato = contratosPorId.get(c.contrato_id);
                  const pago = c.status === "pago";
                  const { urgencia } = calcularUrgencia({
                    status: pago ? "concluida" : "pendente",
                    data_prevista: c.vencimento ?? c.competencia,
                  });
                  const barra = pago
                    ? "border-l-emerald-500"
                    : urgencia === "atrasada"
                      ? "border-l-rose-500"
                      : "border-l-amber-500";
                  return (
                    <li
                      key={c.id}
                      className={`flex items-center justify-between gap-3 rounded-lg border border-l-[3px] border-border bg-background/40 px-3 py-2.5 text-sm ${barra}`}
                    >
                      <Link href={`/locacao/${c.contrato_id}`} className="hover:underline">
                        <span className="font-medium text-ink">
                          {contrato?.imoveis?.endereco ?? contrato?.numero ?? "—"}
                        </span>
                        <span className="text-ink-muted"> — {TIPO_CONTA_LABEL[c.tipo]}</span>
                      </Link>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                          pago ? URGENCIA_COR.concluida : URGENCIA_COR[urgencia]
                        }`}
                      >
                        {new Date(c.competencia + "T00:00:00").toLocaleDateString("pt-BR", {
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TabelaContratos({
  contratos,
  pendentesPorContrato,
}: {
  contratos: {
    id: string;
    numero: string;
    ativo: boolean;
    imoveis: { endereco: string } | null;
    locador: { nome: string } | null;
    locatario: { nome: string } | null;
  }[];
  pendentesPorContrato: Map<string, number>;
}) {
  return (
    <ul className="divide-y divide-border">
      {contratos.map((c) => {
        const pendentes = pendentesPorContrato.get(c.id) ?? 0;
        return (
          <li key={c.id}>
            <Link
              href={`/locacao/${c.id}`}
              className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-background"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{c.imoveis?.endereco ?? c.numero}</p>
                <p className="mt-0.5 truncate text-xs text-ink-muted">
                  {c.locador?.nome ?? "sem locador"}
                  <span className="mx-1">→</span>
                  {c.locatario?.nome ?? "sem locatário"}
                </p>
              </div>
              {pendentes > 0 ? (
                <span className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                  {pendentes} vencida{pendentes > 1 ? "s" : ""}
                </span>
              ) : (
                <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  em dia
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
