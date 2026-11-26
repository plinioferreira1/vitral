import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { redirect } from "next/navigation";
import type { MinhasVendas } from "@/lib/minhas-vendas";
import type { SupabaseClient } from "@supabase/supabase-js";

export const obterMinhasVendas = cache(async (id?: string): Promise<{ dados: MinhasVendas | null; erro: boolean }> => {
 const { user, usuario } = await getUsuarioAtual();
 if (!user || !usuario?.tenant_id) redirect("/login");
 if (!usuario.ativo) redirect("/acesso-desativado");
 // Diretores, gerentes e supervisores podem acumular a função de corretor
 // quando vinculados explicitamente a um cadastro profissional.
 if (usuario.nivel_acesso !== "corretor") {
  const db = await createClient();
  const { data: vinculo } = await db.from("corretores").select("id")
   .eq("usuario_id", user.id).eq("tenant_id", usuario.tenant_id).limit(1);
  if (!vinculo?.length) redirect("/");
 }
 const supabase = await createClient() as unknown as SupabaseClient;
 const { data, error } = await supabase.rpc("minhas_vendas", { p_id: id ?? null });
 return { dados: error ? null : data as MinhasVendas, erro: !!error };
});
