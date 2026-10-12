import type { SupabaseClient } from "@supabase/supabase-js";
import { escolhaCorretorValida } from "./corretores-comissao";

export async function validarCorretores(supabase: SupabaseClient, tenantId: string, escolhas: { id: string | null; atual?: string | null }[]) {
  try {
    const { data, error } = await supabase.from("corretores").select("id, nome, usuario_id").eq("tenant_id", tenantId).order("nome");
    if (error || !data) return "Não foi possível conferir os corretores. Tente novamente.";
    if (escolhas.some(e => !escolhaCorretorValida(data, e.id, e.atual))) return "Selecione um corretor da lista atualizada.";
    return null;
  } catch {
    return "Não foi possível conferir os corretores. Tente novamente.";
  }
}
