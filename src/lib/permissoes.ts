import type { SupabaseClient } from "@supabase/supabase-js";

export interface PermissoesUsuario {
  ehCorretor: boolean;
  temPapelCorretor?: boolean;
  ehDiretor?: boolean;
  ehSocialMedia: boolean;
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
  // Vínculo profissional é independente do nível administrativo.
  // Corretores com nível principal "corretor" já têm essa função.
  let temPapelCorretor = ehCorretor;
  if (!ehCorretor) {
    const { data: vinculo } = await supabase
      .from("corretores").select("id").eq("usuario_id", userId).limit(1);
    temPapelCorretor = !!vinculo?.length;
  }
  const ehSocialMedia = nivelAcesso === "social_media";
  const nivelComAcessoTotal = ["diretor", "gerente", "auxiliar"].includes(nivelAcesso);
  const podeConfigurar = ["diretor", "gerente"].includes(nivelAcesso);

  let categorias: string[] = [];
  if (!ehCorretor && !ehSocialMedia && !nivelComAcessoTotal) {
    const { data: cats } = await supabase
      .from("usuario_categorias")
      .select("categoria")
      .eq("usuario_id", userId);
    categorias = (cats ?? []).map((c: { categoria: string }) => c.categoria);
  }

  return {
    ehCorretor,
    temPapelCorretor,
    ehDiretor: nivelAcesso === "diretor",
    ehSocialMedia,
    nivelComAcessoTotal,
    podeConfigurar,
    temVenda: nivelComAcessoTotal || categorias.includes("venda"),
    temFinanciamento: nivelComAcessoTotal || categorias.includes("financiamento"),
    temLocacao: nivelComAcessoTotal || categorias.includes("locacao"),
  };
}
