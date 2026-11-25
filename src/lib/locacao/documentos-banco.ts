import type { SupabaseClient } from "@supabase/supabase-js";
import type { TipoDocumento } from "./documentos";

/**
 * Tabela `locacao_documentos` (migration 20261125200000). Enquanto o
 * `database.types.ts` não for regenerado depois de a migration rodar, as
 * consultas usam este tipo local. Ao regenerar, trocar por
 * `Database["public"]["Tables"]["locacao_documentos"]["Row"]` e remover isto.
 */
export type LinhaDocumentoLocacao = {
  id: string;
  tenant_id: string;
  contrato_id: string;
  tipo: TipoDocumento;
  nome: string;
  data_documento: string | null;
  observacao: string | null;
  arquivo_caminho: string;
  arquivo_nome_original: string;
  mime: string;
  tamanho: number;
  criado_por: string | null;
  criado_em: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tabelaDocumentos(cliente: SupabaseClient<any, any, any>) {
  return (cliente as unknown as SupabaseClient).from("locacao_documentos");
}
