import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Assina no clique, para a ficha continuar utilizável após muito tempo aberta. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; documentoId: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
  const erro = (mensagem: string, status: number) => new Response(mensagem, { status, headers });
  const { user, usuario } = await getUsuarioAtual();
  if (!user) return erro("Entre no Vitral para abrir este documento.", 401);
  if (!usuario?.ativo || !usuario.tenant_id) return erro("Sem permissão para abrir este documento.", 403);
  const supabase = await createClient() as unknown as SupabaseClient;
  const { data: podeVer, error: erroPermissao } = await supabase.rpc("usuario_tem_categoria", { p_categoria: "locacao" });
  if (erroPermissao) return erro("Não foi possível conferir o acesso. Tente novamente.", 503);
  if (!podeVer) return erro("Sem permissão para acessar Locação.", 403);
  const { id, documentoId } = await params;
  // O vínculo à ficha e a empresa são conferidos novamente, além das regras RLS.
  const { data: documento, error: erroDocumento } = await supabase.from("ficha_locacao_documentos")
    .select("caminho_storage, fichas_cadastrais_locacao!inner(tenant_id)")
    .eq("id", documentoId).eq("ficha_id", id)
    .eq("fichas_cadastrais_locacao.tenant_id", usuario.tenant_id).maybeSingle();
  if (erroDocumento) return erro("Não foi possível consultar o documento. Tente novamente.", 503);
  if (!documento) return erro("Documento não encontrado.", 404);
  const partes = documento.caminho_storage.split("/");
  if (partes.length !== 3 || partes[0] !== usuario.tenant_id || partes[1] !== id || !partes[2] || partes[2] === "." || partes[2] === "..") {
    return erro("Documento não encontrado.", 404);
  }
  const { data, error } = await supabase.storage.from("fichas-locacao").createSignedUrl(documento.caminho_storage, 60);
  if (error || !data?.signedUrl) return erro("Não foi possível abrir o documento. Tente novamente; se persistir, avise a gestão.", 503);
  const resposta = NextResponse.redirect(data.signedUrl);
  for (const [nome, valor] of Object.entries(headers)) resposta.headers.set(nome, valor);
  return resposta;
}
