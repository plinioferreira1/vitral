import { createClient } from "@/lib/supabase/server";
import { anexarUrgencia } from "@/lib/alertas";
import type { Etapa } from "@/lib/types";

export async function getEtapasComContexto() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("etapas")
    .select(
      `id, processo_id, modelo_etapa_id, nome, responsavel_id, data_prevista,
       data_realizada, status, ordem, etapa_dependencia_id,
       processos!inner ( id, numero_processo, tipo, status, categoria, imoveis ( endereco ),
         comprador:clientes!processos_comprador_id_fkey ( nome ), corretores ( nome ), bancos ( nome ) ),
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
