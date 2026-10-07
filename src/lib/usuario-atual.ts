import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { avisar } from "@/lib/aviso";
import type { Database } from "@/lib/database.types";

/** O que as telas e ações usam do login: quem é e o e-mail. */
export type UsuarioLogado = { id: string; email?: string };

/**
 * Usuário logado + linha em `usuarios`, memorizado por requisição
 * (React `cache`): o layout e a página que chamarem isto na mesma
 * renderização fazem uma única ida ao Supabase, em vez de repetir
 * a conferência do login + select em usuarios em cada um.
 */
export const getUsuarioAtual = cache(async () => {
  const supabase = await createClient();
  // O proxy já conferiu (e renovou, se preciso) este mesmo login no começo da
  // requisição; aqui basta ler quem é, sem outra ida ao servidor de
  // autenticação quando o projeto usa chaves assimétricas.
  const { data: sessao } = await supabase.auth.getClaims();
  const claims = sessao?.claims;
  if (!claims?.sub) return { user: null, usuario: null };
  const user: UsuarioLogado = {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
  };

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nome, perfil, tenant_id, cargo, foto_url, nivel_acesso, ativo")
    .eq("id", user.id)
    .single();

  return { user, usuario };
});

export type NivelAcesso = Database["public"]["Enums"]["nivel_acesso_usuario"];

/** Diretor e gerente — os únicos que acessam Financeiro e Configurações. */
export const GESTORES: readonly NivelAcesso[] = ["diretor", "gerente"];

/**
 * Porta de entrada de toda Server Action: confirma que há alguém logado,
 * com empresa, e (se `niveis` for informado) com o nível de acesso
 * exigido. Se não, deixa um aviso para a pessoa e devolve `null` — quem
 * chama só faz `if (!sessao) return;`.
 *
 * O banco (RLS) continua sendo a proteção final; isto evita chegar até
 * ele e dá uma mensagem clara em vez de uma falha silenciosa.
 */
export async function exigirUsuario(niveis?: readonly NivelAcesso[]) {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) {
    await avisar("erro", "Sua sessão expirou. Entre novamente.");
    return null;
  }
  if (!usuario.ativo) {
    await avisar("erro", "Seu acesso ao Vitral está desativado.");
    return null;
  }
  if (niveis && !niveis.includes(usuario.nivel_acesso)) {
    await avisar("erro", "Você não tem permissão para esta ação.");
    return null;
  }
  return {
    user,
    usuario,
    userId: user.id,
    tenantId: usuario.tenant_id,
    nivel: usuario.nivel_acesso,
  };
}
