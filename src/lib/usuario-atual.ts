import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Usuário logado + linha em `usuarios`, memorizado por requisição
 * (React `cache`): o layout e a página que chamarem isto na mesma
 * renderização fazem uma única ida ao Supabase, em vez de repetir
 * getUser() + select em usuarios em cada um.
 */
export const getUsuarioAtual = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, usuario: null };

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nome, perfil, tenant_id, cargo, foto_url, nivel_acesso")
    .eq("id", user.id)
    .single();

  return { user, usuario };
});
