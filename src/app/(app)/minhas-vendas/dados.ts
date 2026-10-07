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
 if (usuario.nivel_acesso !== "corretor") redirect("/");
 const supabase = await createClient() as unknown as SupabaseClient;
 const { data, error } = await supabase.rpc("minhas_vendas", { p_id: id ?? null });
 return { dados: error ? null : data as MinhasVendas, erro: !!error };
});
