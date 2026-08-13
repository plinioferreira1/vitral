import type { SupabaseClient } from "@supabase/supabase-js";

export interface PermissoesUsuario {
  ehCorretor: boolean;
  nivelComAcessoTotal: boolean;
  podeConfigurar: boolean;
  temVenda: boolean;
  temFinanciamento: boolean;
  temLocacao: boolean;
}

export async function getPermissoesUsuario(
  supabase: SupabaseClient,
  userId: string,
  nivelAcesso: string
): Promise<PermissoesUsuario> {
  const ehCorretor = nivelAcesso === "corretor";
  const nivelComAcessoTotal = ["diretor", "gerente", "auxiliar"].includes(nivelAcesso);
  const podeConfigurar = ["diretor", "gerente"].includes(nivelAcesso);

  let categorias: string[] = [];
  if (!ehCorretor && !nivelComAcessoTotal) {
    const { data: cats } = await supabase
      .from("usuario_categorias")
      .select("categoria")
      .eq("usuario_id", userId);
    categorias = (cats ?? []).map((c: { categoria: string }) => c.categoria);
  }

  return {
    ehCorretor,
    nivelComAcessoTotal,
    podeConfigurar,
    temVenda: nivelComAcessoTotal || categorias.includes("venda"),
    temFinanciamento: nivelComAcessoTotal || categorias.includes("financiamento"),
    temLocacao: nivelComAcessoTotal || categorias.includes("locacao"),
  };
}
