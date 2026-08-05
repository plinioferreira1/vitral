import { createClient } from "@/lib/supabase/server";
import { anexarUrgencia, calcularUrgencia, type Urgencia } from "@/lib/alertas";
import type { Etapa, CategoriaProcesso, TipoContaLocacao } from "@/lib/types";
import { TIPO_CONTA_LABEL } from "@/lib/types";
import { ocorrenciasDaTarefa, type RegraTarefa } from "@/lib/tarefas-recorrentes";
import { hojeISO } from "@/lib/data-br";
import { addMonths } from "date-fns";

export async function getEtapasComContexto() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("etapas")
    .select(
      `id, processo_id, modelo_etapa_id, nome, responsavel_id, data_prevista,
       data_realizada, status, ordem, etapa_dependencia_id,
       processos!inner ( id, numero_processo, tipo, status, categoria, imoveis ( endereco ),
         comprador:clientes!processos_comprador_id_fkey ( nome ), corretores!processos_corretor_id_fkey ( nome ), bancos ( nome ) ),
       usuarios ( nome )`
    )
    .neq("processos.status", "cancelado")
    .neq("processos.status", "arquivado")
    .order("data_prevista", { ascending: true, nullsFirst: false });

  if (error) throw error;

  type Row = Etapa & {
    processos: {
      id: string;
      numero_processo: string;
      tipo: string | null;
      status: string;
      categoria: string;
      imoveis: { endereco: string } | null;
      comprador: { nome: string } | null;
      corretores: { nome: string } | null;
      bancos: { nome: string } | null;
    };
    usuarios: { nome: string } | null;
  };

  const rows = (data ?? []) as unknown as Row[];
  const comUrgencia = anexarUrgencia(rows);

  return comUrgencia.map((e, i) => ({
    ...e,
    processo: rows[i].processos,
    responsavel_nome: rows[i].usuarios?.nome ?? null,
  }));
}

export interface EventoCalendario {
  id: string;
  data: string;
  titulo: string;
  categoria: CategoriaProcesso;
  urgencia: Urgencia;
  diasParaVencer: number | null;
  href: string;
  responsavelNome: string | null;
  concluida: boolean;
}

/**
 * Une etapas (Vendas/Financiamento) e contas de locação num só
 * calendário. A restrição de "quem vê o quê" já acontece
 * sozinha via RLS (usuario_tem_categoria) — essa função só
 * busca tudo que o usuário logado tem permissão de ver.
 */
export async function getEventosCalendario(): Promise<EventoCalendario[]> {
  const supabase = await createClient();

  const { data: etapasRaw } = await supabase
    .from("etapas")
    .select(
      `id, nome, data_prevista, status, responsavel_id,
       usuarios ( nome ),
       processos!inner ( id, categoria, status, imoveis ( endereco ) )`
    )
    .neq("processos.status", "cancelado")
    .neq("processos.status", "arquivado")
    .not("data_prevista", "is", null);

  type EtapaRow = {
    id: string;
    nome: string;
    data_prevista: string;
    status: string;
    responsavel_id: string | null;
    usuarios: { nome: string } | null;
    processos: {
      id: string;
      categoria: CategoriaProcesso;
      status: string;
      imoveis: { endereco: string } | null;
    };
  };

  const eventosEtapas: EventoCalendario[] = ((etapasRaw ?? []) as unknown as EtapaRow[]).map((e) => {
    const { urgencia, dias_para_vencer } = calcularUrgencia({
      status: e.status as Etapa["status"],
      data_prevista: e.data_prevista,
    });
    const titulo = e.processos.imoveis?.endereco ? `${e.processos.imoveis.endereco} — ${e.nome}` : e.nome;
    return {
      id: `etapa-${e.id}`,
      data: e.data_prevista,
      titulo,
      categoria: e.processos.categoria,
      urgencia,
      diasParaVencer: dias_para_vencer,
      href: `/processos/${e.processos.id}`,
      responsavelNome: e.usuarios?.nome ?? null,
      concluida: e.status === "concluida",
    };
  });

  const { data: contasRaw } = await supabase
    .from("contas_locacao")
    .select(
      `id, tipo, status, competencia, vencimento, contrato_id,
       contratos_locacao ( id, imoveis ( endereco ) )`
    )
    .neq("status", "nao_aplicavel");

  type ContaRow = {
    id: string;
    tipo: TipoContaLocacao;
    status: string;
    competencia: string;
    vencimento: string | null;
    contrato_id: string;
    contratos_locacao: { id: string; imoveis: { endereco: string } | null } | null;
  };

  const eventosLocacao: EventoCalendario[] = ((contasRaw ?? []) as unknown as ContaRow[]).map((c) => {
    const dataReferencia = c.vencimento ?? c.competencia;
    const { urgencia, dias_para_vencer } = calcularUrgencia({
      status: c.status === "pago" ? "concluida" : "pendente",
      data_prevista: dataReferencia,
    });
    const endereco = c.contratos_locacao?.imoveis?.endereco ?? "Contrato de locação";
    return {
      id: `conta-${c.id}`,
      data: dataReferencia,
      titulo: `${endereco} — ${TIPO_CONTA_LABEL[c.tipo]}`,
      categoria: "locacao",
      urgencia,
      diasParaVencer: dias_para_vencer,
      href: `/locacao/${c.contrato_id}`,
      responsavelNome: null,
      concluida: c.status === "pago",
    };
  });

  const { data: tarefasRaw } = await supabase
    .from("tarefas_mensais")
    .select("id, nome, periodicidade, tipo_regra, dia_fixo");

  const { data: statusRaw } = await supabase
    .from("tarefas_mensais_status")
    .select("tarefa_id, competencia, concluida");

  const statusPorChave = new Map(
    (statusRaw ?? []).map((s) => [`${s.tarefa_id}-${s.competencia}`, s.concluida])
  );

  const hoje = new Date(`${hojeISO()}T00:00:00`);
  const eventosTarefas: EventoCalendario[] = [];
  // Só do mês atual em diante — meses passados não geram ocorrência
  // (uma tarefa recorrente "atrasada" de um mês que já virou não faz
  // sentido ficar acumulando; o que importa é o período atual).
  for (let deslocamento = 0; deslocamento <= 3; deslocamento++) {
    const mesReferencia = addMonths(hoje, deslocamento);
    for (const tarefa of (tarefasRaw ?? []) as unknown as RegraTarefa[]) {
      for (const ocorrencia of ocorrenciasDaTarefa(tarefa, mesReferencia)) {
        const dataStr = ocorrencia.data.toISOString().slice(0, 10);
        const concluida = statusPorChave.get(`${tarefa.id}-${ocorrencia.competencia}`) ?? false;
        const { urgencia, dias_para_vencer } = calcularUrgencia({
          status: concluida ? "concluida" : "pendente",
          data_prevista: dataStr,
        });
        eventosTarefas.push({
          id: `tarefa-${tarefa.id}-${ocorrencia.competencia}`,
          data: dataStr,
          titulo: tarefa.nome,
          categoria: "locacao",
          urgencia,
          diasParaVencer: dias_para_vencer,
          href: "/locacao?aba=resumo",
          responsavelNome: null,
          concluida,
        });
      }
    }
  }

  return [...eventosEtapas, ...eventosLocacao, ...eventosTarefas].sort((a, b) => a.data.localeCompare(b.data));
}
