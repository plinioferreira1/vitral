import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

/**
 * Cliente com a chave "service_role" — ignora RLS e pode gerenciar
 * contas de autenticação (editar e-mail, excluir usuário). Só usar
 * em server actions/rotas que já verificaram que quem está pedindo
 * é diretor/gerente. Nunca importar isso num componente client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. Essa ação exige a chave de administrador."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
