import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { alternarTarefaMensal } from "./actions";
import { TIPO_CONTA_LABEL } from "@/lib/types";
import { calcularUrgencia, URGENCIA_COR } from "@/lib/alertas";
import { Icones } from "@/components/icone-badge";
import { addMonths, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function primeiroDiaDoMes(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function LocacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const supabase = await createClient();
  const competenciaAtual = primeiroDiaDoMes();

  const mesReferencia = mes ? parseISO(`${mes}-01`) : new Date();
  const inicioMes = format(mesReferencia, "yyyy-MM-01");
  const fimMes = format(addMonths(mesReferencia, 1), "yyyy-MM-01");
  const mesAnterior = format(addMonths(mesReferencia, -1), "yyyy-MM");
  const proximoMes = format(addMonths(mesReferencia, 1), "yyyy-MM");

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

  type ContaPendente = {
    id: string;
    tipo: import("@/lib/types").TipoContaLocacao;
    status: string;
    competencia: string;
    contrato_id: string;
    vencimento: string | null;
  };
  const contasPendentes = (contasPendentesRaw ?? []) as ContaPendente[];

  // resumo do mês selecionado (pra visão geral do Gerente)
  const { count: pendentesNoMes } = await supabase
    .from("contas_locacao")
    .select("id", { count: "exact", head: true })
    .eq("status", "pendente")
    .gte("competencia", inicioMes)
    .lt("competencia", fimMes);

  const { count: pagasNoMes } = await supabase
    .from("contas_locacao")
    .select("id", { count: "exact", head: true })
    .eq("status", "pago")
    .gte("competencia", inicioMes)
    .lt("competencia", fimMes);

  const atrasadas = contasPendentes.filter(
    (c) => calcularUrgencia({ status: "pendente", data_prevista: c.vencimento ?? c.competencia }).urgencia === "atrasada"
  ).length;

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

  const pendentesPorContrato = new Map<string, number>();
  contasPendentes.forEach((c) => {
    pendentesPorContrato.set(c.contrato_id, (pendentesPorContrato.get(c.contrato_id) ?? 0) + 1);
  });
  const totalContratosAtivos = listaContratos.filter((c) => c.ativo).length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-serif font-bold uppercase tracking-wide text-ink">Locação</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {totalContratosAtivos} contratos ativos · {contasPendentes.length} contas
            pendentes
          </p>
        </div>
        <Link
          href="/locacao/novo"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Novo contrato
        </Link>
      </div>

      {/* Visão geral do mês */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold capitalize text-ink">
            Visão geral · {format(mesReferencia, "MMMM yyyy", { locale: ptBR })}
          </p>
          <div className="flex gap-1.5">
            <Link
              href={`/locacao?mes=${mesAnterior}`}
              className="rounded-md border border-border px-2.5 py-1 text-xs text-ink-muted hover:bg-surface"
            >
              ← Mês anterior
            </Link>
            <Link
              href={`/locacao?mes=${proximoMes}`}
              className="rounded-md border border-border px-2.5 py-1 text-xs text-ink-muted hover:bg-surface"
            >
              Próximo mês →
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl p-5 text-white" style={{ backgroundColor: "#731515" }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
              {Icones.relogio}
            </div>
            <p className="mt-3 font-mono text-2xl font-semibold">{pendentesNoMes ?? 0}</p>
            <p className="mt-0.5 text-xs text-white/80">Contas pendentes no mês</p>
          </div>
          <div className="rounded-xl p-5 text-white" style={{ backgroundColor: "#0F7A4E" }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
              {Icones.check}
            </div>
            <p className="mt-3 font-mono text-2xl font-semibold">{pagasNoMes ?? 0}</p>
            <p className="mt-0.5 text-xs text-white/80">Contas pagas no mês</p>
          </div>
          <div className="rounded-xl p-5 text-white" style={{ backgroundColor: "#9F1D1D" }}>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
              {Icones.alerta}
            </div>
            <p className="mt-3 font-mono text-2xl font-semibold">{atrasadas}</p>
            <p className="mt-0.5 text-xs text-white/80">Atrasadas (todos os meses)</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
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
                {statusExistente && <input type="hidden" name="status_id" value={statusExistente.id} />}
                <button type="submit" className="flex w-full items-center gap-2.5 text-left text-sm">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                      concluida ? "border-brand bg-brand text-white" : "border-border bg-surface"
                    }`}
                  >
                    {concluida ? "✓" : ""}
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

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
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
          <TabelaContratos contratos={listaContratos.filter((c) => c.ativo)} pendentesPorContrato={pendentesPorContrato} />
        )}
      </div>

      {listaContratos.some((c) => !c.ativo) && (
        <details className="group overflow-hidden rounded-xl border border-border bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between p-4 text-sm font-semibold text-ink">
            Contratos encerrados
            <span className="text-xs font-normal text-ink-muted group-open:hidden">
              mostrar ({listaContratos.filter((c) => !c.ativo).length})
            </span>
            <span className="hidden text-xs font-normal text-ink-muted group-open:inline">ocultar</span>
          </summary>
          <div className="border-t border-border">
            <TabelaContratos contratos={listaContratos.filter((c) => !c.ativo)} pendentesPorContrato={pendentesPorContrato} />
          </div>
        </details>
      )}

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="mb-3 text-sm font-semibold text-ink">Contas pendentes</p>
        {contasPendentes.length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhuma conta pendente no momento. 🎉</p>
        ) : (
          <ul className="space-y-1.5">
            {contasPendentes.slice(0, 15).map((c) => {
              const contrato = contratosPorId.get(c.contrato_id);
              const { urgencia } = calcularUrgencia({
                status: "pendente",
                data_prevista: c.vencimento ?? c.competencia,
              });
              const barra =
                urgencia === "atrasada"
                  ? "border-l-rose-500"
                  : urgencia === "vence_hoje" || urgencia === "vence_em_breve"
                    ? "border-l-amber-500"
                    : "border-l-emerald-500";
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
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${URGENCIA_COR[urgencia]}`}>
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
                  {pendentes} pendente{pendentes > 1 ? "s" : ""}
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
