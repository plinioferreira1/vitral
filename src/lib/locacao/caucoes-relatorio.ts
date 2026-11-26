import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { resumoCaucoes } from "./garantias";

export type LinhaCaucao = {
  id: string;
  numero: string | null;
  ativo: boolean;
  garantia_locaticia: string | null;
  caucao_valor_centavos: number | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  data_encerramento: string | null;
  endereco: string;
  locatario: string;
  locador: string;
};

/** Contratos com caução (RLS) e soma dos valores contratuais, não dos depósitos comprovados. */
export async function carregarCaucoes(supabase: SupabaseClient<Database>, tenantId: string) {
  const { data } = await supabase
    .from("contratos_locacao")
    .select("id, numero, ativo, garantia_locaticia, caucao_valor_centavos, vigencia_inicio, vigencia_fim, data_encerramento, imoveis ( endereco ), locatario:clientes!contratos_locacao_locatario_id_fkey ( nome ), locador:clientes!contratos_locacao_locador_id_fkey ( nome )")
    .eq("tenant_id", tenantId)
    .eq("garantia_locaticia", "Caução")
    .order("numero");
  const linhas: LinhaCaucao[] = (data ?? []).map((c) => ({
    id: c.id,
    numero: c.numero,
    ativo: c.ativo,
    garantia_locaticia: c.garantia_locaticia,
    caucao_valor_centavos: c.caucao_valor_centavos,
    vigencia_inicio: c.vigencia_inicio,
    vigencia_fim: c.vigencia_fim,
    data_encerramento: c.data_encerramento,
    endereco: (c.imoveis as { endereco: string | null } | null)?.endereco ?? "",
    locatario: (c.locatario as { nome: string } | null)?.nome ?? "",
    locador: (c.locador as { nome: string } | null)?.nome ?? "",
  }));
  return resumoCaucoes(linhas);
}

/** CSV (separador ;, padrão do Excel em português). */
export function csvCaucoes(r: ReturnType<typeof resumoCaucoes<LinhaCaucao>>): string {
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const valor = (c: number | null) => (c ? (c / 100).toFixed(2).replace(".", ",") : "");
  const data = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");
  const linhas = [
    ["Situação", "Contrato", "Imóvel", "Locatário", "Locador", "Início", "Fim", "Valor da caução (R$)"],
    ...[...r.ativos, ...r.encerrados].map((c) => [
      c.ativo ? "Ativo" : "Encerrado",
      c.numero ?? "",
      c.endereco,
      c.locatario,
      c.locador,
      data(c.vigencia_inicio),
      data(c.data_encerramento ?? c.vigencia_fim),
      valor(c.caucao_valor_centavos),
    ]),
    [],
    ["Total contratual previsto (contratos ativos)", "", "", "", "", "", "", valor(r.totalCentavos)],
  ];
  return "﻿" + linhas.map((l) => l.map((v) => esc(String(v))).join(";")).join("\r\n");
}
