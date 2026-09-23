import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEventosCalendario } from "@/lib/queries";
import { CalendarioGrid } from "@/components/calendario-grid";
import { KanbanProcessos, type CardKanban, type CardPrazo } from "@/components/kanban-processos";
import { colunasKanban, etapaAtualPorProcesso } from "@/lib/kanban";
import { getPermissoesUsuario } from "@/lib/permissoes";
import { hojeISO } from "@/lib/data-br";
import { ocorrenciasDaTarefa, type RegraTarefa } from "@/lib/tarefas-recorrentes";
import { alternarTarefaMensal } from "@/app/(app)/locacao/actions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CategoriaProcesso } from "@/lib/types";
import { calcularUrgencia } from "@/lib/alertas";

function saudacao(): string {
  const horaBrasilia = new Date().toLocaleString("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    hour12: false,
  });
  const hora = Number(horaBrasilia);
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nome, nivel_acesso, perfil, tenant_id")
    .eq("id", user?.id ?? "")
    .single();

  if (!usuario) return null;

  const ehAdmin = usuario.perfil === "admin";

  const { temVenda, temFinanciamento, temLocacao } = await getPermissoesUsuario(
    supabase,
    user!.id,
    usuario.nivel_acesso
  );

  const eventos = await getEventosCalendario();
  const referencia = new Date(`${hojeISO()}T00:00:00`);
  const mesLabel = format(referencia, "MMMM 'de' yyyy", { locale: ptBR });
  const mesCapitalizado = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);

  const atalhos = [
    ...(temVenda || temFinanciamento
      ? [{ href: "/processos/novo", label: "Novo processo" }]
      : []),
    ...(temLocacao ? [{ href: "/locacao/novo", label: "Novo contrato de locação" }] : []),
    { href: "/autorizacoes/nova", label: "Nova autorização de venda" },
    { href: "/termos-visita/nova", label: "Novo termo de visita" },
  ];

  let tarefasHoje: {
    tarefaId: string;
    nome: string;
    competencia: string;
    statusId: string | null;
    concluida: boolean;
  }[] = [];

  if (temLocacao) {
    const { data: tarefasRaw } = await supabase
      .from("tarefas_mensais")
      .select("id, nome, tipo_regra, dia_fixo, periodicidade");

    const ocorrenciasHoje = (tarefasRaw ?? []).flatMap((t) =>
      ocorrenciasDaTarefa(t as unknown as RegraTarefa, referencia)
        .filter((oc) => oc.data.toISOString().slice(0, 10) === hojeISO())
        .map((oc) => ({ tarefa: t, ocorrencia: oc }))
    );

    if (ocorrenciasHoje.length > 0) {
      const { data: statusRaw } = await supabase
        .from("tarefas_mensais_status")
        .select("id, tarefa_id, competencia, concluida")
        .in(
          "tarefa_id",
          ocorrenciasHoje.map((o) => o.tarefa.id)
        );

      tarefasHoje = ocorrenciasHoje.map(({ tarefa, ocorrencia }) => {
        const status = (statusRaw ?? []).find(
          (s) => s.tarefa_id === tarefa.id && s.competencia === ocorrencia.competencia
        );
        return {
          tarefaId: tarefa.id,
          nome: tarefa.nome,
          competencia: ocorrencia.competencia,
          statusId: status?.id ?? null,
          concluida: status?.concluida ?? false,
        };
      });
    }
  }

  let quadrosKanban: {
    categoria: CategoriaProcesso;
    titulo: string;
    colunas: string[];
    cards: CardKanban[];
    colunaPrazos?: { titulo: string; cards: CardPrazo[] };
  }[] = [];

  if (ehAdmin && usuario.tenant_id) {
    const tenantId = usuario.tenant_id;
    async function montarQuadro(categoria: "venda" | "financiamento", titulo: string) {
      const { data: processosRaw } = await supabase
        .from("processos")
        .select(
          "id, numero_processo, status, data_final_contrato, imoveis ( endereco ), comprador:clientes!processos_comprador_id_fkey ( nome ), vendedor:clientes!processos_vendedor_id_fkey ( nome )"
        )
        .eq("categoria", categoria)
        .not("status", "in", "(concluido,cancelado)");

      const processos = (processosRaw ?? []) as unknown as {
        id: string;
        numero_processo: string;
        data_final_contrato: string | null;
        imoveis: { endereco: string } | null;
        comprador: { nome: string } | null;
        vendedor: { nome: string } | null;
      }[];

      const idsProcessos = processos.map((p) => p.id);
      const { data: etapasRaw } =
        idsProcessos.length > 0
          ? await supabase
              .from("etapas")
              .select("processo_id, status, data_prevista")
              .in("processo_id", idsProcessos)
          : { data: [] as { processo_id: string; status: string; data_prevista: string | null }[] };

      const atrasosPorProcesso = new Map<string, number>();
      (etapasRaw ?? []).forEach((e) => {
        const { urgencia } = calcularUrgencia({
          status: e.status as "pendente" | "em_andamento" | "concluida" | "bloqueada",
          data_prevista: e.data_prevista,
        });
        if (urgencia === "atrasada") {
          atrasosPorProcesso.set(e.processo_id, (atrasosPorProcesso.get(e.processo_id) ?? 0) + 1);
        }
      });

      const [colunas, etapaAtualMap] = await Promise.all([
        colunasKanban(supabase, tenantId, categoria),
        etapaAtualPorProcesso(supabase, idsProcessos),
      ]);

      // Só pra Venda: coluna extra fixa com o prazo final do contrato
      // de cada processo, colorida por urgência.
      let colunaPrazos: { titulo: string; cards: CardPrazo[] } | undefined;
      if (categoria === "venda") {
        const hoje = new Date(`${hojeISO()}T00:00:00`);
        const cardsPrazo = processos
          .filter((p) => p.data_final_contrato)
          .map((p) => {
            const dataFinal = new Date(`${p.data_final_contrato}T00:00:00`);
            const diasRestantes = Math.round((dataFinal.getTime() - hoje.getTime()) / 86_400_000);
            const cor: CardPrazo["cor"] =
              diasRestantes <= 15 ? "vermelho" : diasRestantes <= 60 ? "amarelo" : "verde";
            const subtitulo =
              diasRestantes < 0
                ? `Venceu há ${Math.abs(diasRestantes)} dia${Math.abs(diasRestantes) === 1 ? "" : "s"}`
                : diasRestantes === 0
                  ? "Vence hoje"
                  : `Vence em ${diasRestantes} dia${diasRestantes === 1 ? "" : "s"}`;
            return {
              id: p.id,
              titulo: p.imoveis?.endereco ?? p.numero_processo,
              subtitulo,
              cor,
              diasRestantes,
            };
          })
          .sort((a, b) => a.diasRestantes - b.diasRestantes);

        colunaPrazos = { titulo: "Prazo final do contrato", cards: cardsPrazo };
      }

      return {
        categoria,
        titulo,
        colunas,
        cards: processos.map((p) => ({
          id: p.id,
          titulo: p.imoveis?.endereco ?? p.numero_processo,
          subtitulo: `${p.comprador?.nome ?? "—"} / ${p.vendedor?.nome ?? "—"}`,
          etapaAtual: etapaAtualMap.get(p.id) ?? null,
          atrasos: atrasosPorProcesso.get(p.id) ?? 0,
        })),
        colunaPrazos,
      };
    }

    quadrosKanban = await Promise.all([
      ...(temVenda ? [montarQuadro("venda", "Vendas")] : []),
      ...(temFinanciamento ? [montarQuadro("financiamento", "Financiamento")] : []),
    ]);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {saudacao()}, {usuario.nome.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-ink-muted capitalize">{mesCapitalizado}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {atalhos.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="rounded-xl border border-border/60 bg-surface p-4 text-sm font-medium text-ink shadow-sm transition hover:border-brand hover:bg-background"
          >
            + {a.label}
          </Link>
        ))}
      </div>

      {tarefasHoje.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-ink">Tarefas do dia</p>
          <div className="space-y-2">
            {tarefasHoje.map((t) => (
              <form key={`${t.tarefaId}-${t.competencia}`} action={alternarTarefaMensal}>
                <input type="hidden" name="tarefa_id" value={t.tarefaId} />
                <input type="hidden" name="competencia" value={t.competencia} />
                <input type="hidden" name="concluida_atual" value={String(t.concluida)} />
                {t.statusId && <input type="hidden" name="status_id" value={t.statusId} />}
                <button type="submit" className="flex w-full items-center gap-2.5 text-left text-sm">
                  <span
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border ${
                      t.concluida ? "border-brand bg-brand text-white" : "border-border-strong bg-surface"
                    }`}
                  >
                    {t.concluida && (
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
                  <span className={t.concluida ? "text-ink-muted line-through" : "text-ink"}>{t.nome}</span>
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      {ehAdmin && (
        <>
          {quadrosKanban.length > 0 && (
            <div className="space-y-6">
              {quadrosKanban.map((q) => (
                <div key={q.categoria} className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
                  <p className="mb-3 text-sm font-semibold text-ink">Quadro — {q.titulo}</p>
                  <KanbanProcessos colunas={q.colunas} cards={q.cards} colunaPrazos={q.colunaPrazos} />
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-border/60 bg-surface p-5 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-ink">Calendário</p>
            <CalendarioGrid eventos={eventos} referencia={referencia} maxPorDia={3} />
          </div>
        </>
      )}
    </div>
  );
}
