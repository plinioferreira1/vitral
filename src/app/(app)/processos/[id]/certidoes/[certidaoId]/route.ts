import { NextResponse } from "next/server";
import { BUCKET_CERTIDOES } from "@/lib/certidoes/catalogo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";

/** Abre a certidão por link temporário (60 s), só para quem enxerga o processo. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; certidaoId: string }> }) {
  const { user, usuario } = await getUsuarioAtual();
  if (!user) return new Response("Entre no Vitral para abrir este arquivo.", { status: 401 });
  if (!usuario?.ativo || !usuario.tenant_id) return new Response("Sem permissão.", { status: 403 });
  const { id, certidaoId } = await params;
  const supabase = await createClient();
  // A leitura passa pela regra do banco: só retorna se a pessoa enxerga o processo.
  const { data: certidao } = await supabase.from("processo_certidoes").select("caminho, nome_arquivo")
    .eq("id", certidaoId).eq("processo_id", id).eq("tenant_id", usuario.tenant_id).maybeSingle();
  if (!certidao || !certidao.caminho.startsWith(`${usuario.tenant_id}/${id}/`)) return new Response("Certidão não encontrada.", { status: 404 });
  const { data, error } = await createAdminClient().storage.from(BUCKET_CERTIDOES).createSignedUrl(
    certidao.caminho, 60, new URL(request.url).searchParams.get("baixar") === "1" ? { download: certidao.nome_arquivo } : undefined,
  );
  if (error || !data?.signedUrl) return new Response("Não foi possível abrir o arquivo. Tente novamente.", { status: 503 });
  const resposta = NextResponse.redirect(data.signedUrl);
  resposta.headers.set("Cache-Control", "private, no-store");
  resposta.headers.set("Referrer-Policy", "no-referrer");
  return resposta;
}
