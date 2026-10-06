import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { alternarTarefaMensal } from "./actions";
import { ListaContratosLocacao } from "@/components/lista-contratos-locacao";
import { TIPO_CONTA_LABEL } from "@/lib/types";
import { calcularUrgencia, URGENCIA_COR } from "@/lib/alertas";
import { CartaoIndicador } from "@/components/cartao-indicador";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { Clock, CheckCircle2, AlertTriangle, FileText, ListChecks, House, Plus } from "lucide-react";
import { CalculadoraMultaRescisoria } from "@/components/calculadora-multa-rescisoria";
import { hojeISO } from "@/lib/data-br";
import { addMonths, format, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BotaoEnviar } from "@/components/botao-enviar";

function primeiroDiaDoMes(): string {
  return `${hojeISO().slice(0, 7)}-01`;
}

function segundaFeiraDaSemana(): string {
  return format(startOfWeek(parseISO(hojeISO()), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

type Aba = "resumo" | "contratos" | "inadimplencias" | "multa";
type Filtro = "mes" | "atrasadas" | "pagas" | undefined;

export default async function LocacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; aba?: string; filtro?: string }>;
}) {
  const { mes, aba: abaParam, filtro: filtroParam } = await searchParams;
  const aba: Aba =
    abaParam === "contratos"
      ? "contratos"
      : abaParam === "inadimplencias"
        ? "inadimplencias"
        : abaParam === "multa"
          ? "multa"
          : "resumo";
  const filtro: Filtro =
    filtroParam === "mes" || filtroParam === "atrasadas" || filtroParam === "pagas"
      ? filtroParam
      : undefined;

  const supabase = await createClient();
  const competenciaAtual = primeiroDiaDoMes();
  const competenciaSemanaAtual = segundaFeiraDaSemana();

  const mesReferencia = mes ? parseISO(`${mes}-01`) : new Date(`${hojeISO()}T00:00:00`);
  const inicioMes = format(mesReferencia, "yyyy-MM-01");
  const fimMes = format(addMonths(mesReferencia, 1), "yyyy-MM-01");
  const mesAnterior = format(addMonths(mesReferencia, -1), "yyyy-MM");
  const proximoMes = format(addMonths(mesReferencia, 1), "yyyy-MM");
  const mesLabel = format(mesReferencia, "MMMM yyyy", { locale: ptBR });

  // As 5 consultas da tela são independentes — carregam em paralelo.
  const [
    { data: contratos },
    { data: contasPendentesRaw },
    { data: contasPagasNoMesRaw },
    { data: tarefas },
    { data: tarefasStatus },
  ] = await Promise.all([
    supabase
      .from("contratos_locacao")
      .select(
        `id, numero, ativo, criado_em,
         imoveis ( endereco ),
         locador:clientes!contratos_locacao_locador_id_fkey ( nome ),
         locatario:clientes!contratos_locacao_locatario_id_fkey ( nome )`
      )
      .order("criado_em", { ascending: false }),
    supabase
      .from("contas_locacao")
      .select("id, tipo, status, competencia, contrato_id, vencimento")
      .eq("status", "pendente")
      .order("vencimento", { ascending: true, nullsFirst: true }),
    supabase
      .from("contas_locacao")
      .select("id, tipo, status, competencia, contrato_id, vencimento")
      .eq("status", "pago")
      .gte("competencia", inicioMes)
      .lt("competencia", fimMes)
      .order("competencia", { ascending: false }),
    supabase
      .from("tarefas_mensais")
      .select("id, nome, regra, ordem, periodicidade")
      .order("ordem", { ascending: true }),
    supabase
      .from("tarefas_mensais_status")
      .select("id, tarefa_id, competencia, concluida")
      .in("competencia", [competenciaAtual, competenciaSemanaAtual]),
  ]);

  type ContaLinha = {
    id: string;
    tipo: import("@/lib/types").TipoContaLocacao;
    status: string;
    competencia: string;
    contrato_id: string;
    vencimento: string | null;
  };
  const contasPendentes = (contasPendentesRaw ?? []) as ContaLinha[];
  const contasPagasNoMes = (contasPagasNoMesRaw ?? []) as ContaLinha[];

  const pendentesNoMes = contasPendentes.filter(
    (c) => c.competencia >= inicioMes && c.competencia < fimMes
  );
  const atrasadasLista = contasPendentes.filter(
    (c) =>
      calcularUrgencia({ status: "pendente", data_prevista: c.vencimento ?? c.competencia }).urgencia ===
      "atrasada"
  );

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><House size={22} aria-hidden="true" /></div>
          <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink">Locação</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {totalContratosAtivos} contratos ativos · {contasPendentes.length} contas
            pendentes
          </p>
          </div>
        </div>
        {aba === "contratos" && (
          <Link
            href="/locacao/novo"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus size={17} aria-hidden="true" /> Novo contrato
          </Link>
        )}
      </div>

      <Link href="/locacao?aba=multa" className="inline-flex text-sm font-medium text-brand hover:underline">
        Cálculo de multa rescisória
      </Link>

      {aba === "contratos" ? (
        <div className="space-y-6">
          <CabecalhoSecao icon={House} titulo="Contratos ativos" descricao="Imóvel, partes do contrato e contas vencidas em um só lugar." />
          <ListaContratosLocacao contratos={listaContratos.filter(c => c.ativo)} vencidas={Object.fromEntries(vencidasPorContrato)} />
          {listaContratos.some(c => !c.ativo) && <details className="rounded-xl border border-border/60 bg-surface shadow-sm">
            <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-ink-muted hover:text-ink">Contratos encerrados ({listaContratos.filter(c => !c.ativo).length})</summary>
            <div className="border-t border-border p-3 sm:p-5"><ListaContratosLocacao contratos={listaContratos.filter(c => !c.ativo)} vencidas={Object.fromEntries(vencidasPorContrato)} encerrados /></div>
          </details>}
        </div>
      ) : aba === "resumo" ? (
        <div className="space-y-6">
          {/* Visão geral do mês */}
          <div>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold capitalize text-ink">Visão geral · {mesLabel}</p>
              <nav aria-label="Navegação entre meses" className="flex flex-wrap gap-1.5">
                <Link
                  href={`/locacao?aba=resumo&mes=${mesAnterior}`}
                  className="rounded-md border border-border px-2.5 py-1 text-xs text-ink-muted hover:bg-surface"
                >
                  ← Mês anterior
                </Link>
                <Link
                  href={`/locacao?aba=resumo&mes=${proximoMes}`}
                  className="rounded-md border border-border px-2.5 py-1 text-xs text-ink-muted hover:bg-surface"
                >
                  Próximo mês →
                </Link>
              </nav>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <CartaoIndicador compacto
                icon={Clock}
                valor={pendentesNoMes.length}
                label="Contas pendentes no mês"
                tom="alerta"
                href={`/locacao?aba=inadimplencias&mes=${format(mesReferencia, "yyyy-MM")}&filtro=mes`}
              />
              <CartaoIndicador compacto
                icon={CheckCircle2}
                valor={contasPagasNoMes.length}
                label="Contas pagas no mês"
                tom="sucesso"
                href={`/locacao?aba=inadimplencias&mes=${format(mesReferencia, "yyyy-MM")}&filtro=pagas`}
              />
              <CartaoIndicador compacto
                icon={AlertTriangle}
                valor={atrasadasLista.length}
                label="Atrasadas (todos os meses)"
                tom="perigo"
                href={`/locacao?aba=inadimplencias&mes=${format(mesReferencia, "yyyy-MM")}&filtro=atrasadas`}
              />
              <CartaoIndicador compacto
                icon={FileText}
                valor={listaContratos.filter((c) => c.ativo).length}
                label="Contratos ativos"
                href="/locacao?aba=contratos"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-surface shadow-sm p-5">
            <CabecalhoSecao icon={ListChecks} titulo="Tarefas do mês" />
            <div className="space-y-2">
              {(tarefas ?? []).map((t) => {
                const competenciaDaTarefa =
                  t.periodicidade === "semanal" ? competenciaSemanaAtual : competenciaAtual;
                const statusExistente = (tarefasStatus ?? []).find(
                  (s) => s.tarefa_id === t.id && s.competencia === competenciaDaTarefa
                );
                const concluida = statusExistente?.concluida ?? false;
                return (
                  <form key={t.id} action={alternarTarefaMensal}>
                    <input type="hidden" name="tarefa_id" value={t.id} />
                    <input type="hidden" name="competencia" value={competenciaDaTarefa} />
                    <input type="hidden" name="concluida_atual" value={String(concluida)} />
                    {statusExistente && (
                      <input type="hidden" name="status_id" value={statusExistente.id} />
                    )}
                    <BotaoEnviar className="flex w-full items-center gap-2.5 text-left text-sm">
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
                    </BotaoEnviar>
                  </form>
                );
              })}
            </div>
          </div>
        </div>
      ) : aba === "inadimplencias" ? (
        <div className="space-y-6">
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
      ) : aba === "multa" ? (
        <CalculadoraMultaRescisoria />
      ) : null}
    </div>
  );
}
