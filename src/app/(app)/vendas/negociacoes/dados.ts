import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { getPermissoesUsuario } from "@/lib/permissoes";
import { podeEditarNegociacoes } from "@/lib/negociacoes/regras";
import { redirect } from "next/navigation";

export async function acessoNegociacoes() {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id || !usuario.ativo) redirect("/login");
  const supabase = await createClient();
  const p = await getPermissoesUsuario(supabase, user.id, usuario.nivel_acesso);
  if (!p.temVenda || p.ehCorretor || p.ehSocialMedia) redirect("/");
  return {
    supabase,
    user,
    usuario,
    tenantId: usuario.tenant_id,
    podeEditar: podeEditarNegociacoes(usuario.nivel_acesso, p.temVenda),
  };
}

export async function carregarNegociacoes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  somenteAbertas = false,
) {
  const todas = [];
  // O limite padrão de 1.000 linhas do serviço não pode truncar os indicadores.
  for (let inicio = 0; ; inicio += 500) {
    let consulta = supabase
      .from("vendas_negociacoes")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("criado_em", { ascending: false })
      .order("id");
    if (somenteAbertas) consulta = consulta.eq("situacao", "em_andamento");
    const { data, error } = await consulta.range(inicio, inicio + 499);
    if (error)
      throw new Error(
        "Não foi possível carregar as negociações. Tente novamente.",
      );
    todas.push(...data);
    if (data.length < 500) return todas;
  }
}

export async function opcoesNegociacoes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
) {
  const [responsaveis, corretores, modelos, categorias] = await Promise.all([
    supabase
      .from("usuarios")
      .select("id,nome,nivel_acesso")
      .eq("tenant_id", tenantId)
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("corretores")
      .select("id,nome")
      .eq("tenant_id", tenantId)
      .order("nome"),
    supabase
      .from("modelos_processo")
      .select("id,nome")
      .eq("tenant_id", tenantId)
      .eq("categoria", "venda")
      .eq("ativo", true)
      .order("nome"),
    supabase
      .from("usuario_categorias")
      .select("usuario_id")
      .eq("categoria", "venda"),
  ]);
  if ([responsaveis, corretores, modelos, categorias].some((r) => r.error))
    throw new Error("Não foi possível carregar os cadastros de Vendas.");
  const usuariosVenda = new Set(categorias.data?.map((c) => c.usuario_id));
  return {
    responsaveis: (responsaveis.data ?? []).filter(
      (u) =>
        ["diretor", "gerente", "auxiliar"].includes(u.nivel_acesso) ||
        (["supervisor", "gerente_locacao"].includes(u.nivel_acesso) &&
          usuariosVenda.has(u.id)),
    ),
    corretores: corretores.data ?? [],
    modelos: modelos.data ?? [],
  };
}
