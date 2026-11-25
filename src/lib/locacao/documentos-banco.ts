import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { TipoDocumento } from "./documentos";

/** Linha de `locacao_documentos` (migration 20261125195210), com o tipo já restrito à lista fixa. */
export type LinhaDocumentoLocacao = Omit<Database["public"]["Tables"]["locacao_documentos"]["Row"], "tipo"> & { tipo: TipoDocumento };

export function tabelaDocumentos(cliente: SupabaseClient<Database>) {
  return cliente.from("locacao_documentos");
}
