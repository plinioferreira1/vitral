import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { BUCKET_DP, acessoDP } from "../dados";

/**
 * Abre um arquivo do Departamento Pessoal por link temporário. A linha é
 * lida com a permissão de quem está logado (RLS): se a pessoa não pode
 * ver o registro, não chega ao arquivo.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo");
  const id = url.searchParams.get("id") ?? "";
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario) return new Response("Não autorizado.", { status: 401 });
  const supabase = await createClient();
  if (!(await acessoDP(supabase, user.id, usuario.nivel_acesso)).liberado || !/^[0-9a-f-]{36}$/i.test(id)) return new Response("Não autorizado.", { status: 403 });

  let caminho: string | null = null;
  if (tipo === "documento") caminho = (await supabase.from("dp_documentos").select("caminho").eq("id", id).maybeSingle()).data?.caminho ?? null;
  else if (tipo === "ausencia") caminho = (await supabase.from("dp_ausencias").select("anexo_caminho").eq("id", id).maybeSingle()).data?.anexo_caminho ?? null;
  else if (tipo === "correcao") caminho = (await supabase.from("dp_ponto_correcoes").select("anexo_caminho").eq("id", id).maybeSingle()).data?.anexo_caminho ?? null;
  else if (tipo === "foto") caminho = (await supabase.from("dp_colaboradores").select("foto_caminho").eq("id", id).maybeSingle()).data?.foto_caminho ?? null;
  if (!caminho) return new Response("Arquivo não encontrado.", { status: 404 });

  const { data } = await createAdminClient().storage.from(BUCKET_DP).createSignedUrl(caminho, tipo === "foto" ? 3600 : 120);
  if (!data?.signedUrl) return new Response("Arquivo indisponível.", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
