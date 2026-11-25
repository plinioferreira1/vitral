import { NextResponse } from "next/server";
import { BUCKET_DOCUMENTOS_LOCACAO } from "@/lib/locacao/documentos";
import { tabelaDocumentos, type LinhaDocumentoLocacao } from "@/lib/locacao/documentos-banco";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";

/** Abre (ou baixa, com ?baixar=1) um documento do contrato por link de 60 s. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string; documentoId: string }> }) {
  const { user, usuario } = await getUsuarioAtual();
  if (!user) return new Response("Entre no Vitral para abrir este arquivo.", { status: 401 });
  if (!usuario?.ativo || !usuario.tenant_id) return new Response("Sem permissão.", { status: 403 });
  const { id, documentoId } = await params;
  const supabase = await createClient();
  // RLS: só retorna para quem tem Locação na mesma empresa.
  const { data: doc } = await tabelaDocumentos(supabase)
    .select("arquivo_caminho, nome, arquivo_nome_original")
    .eq("id", documentoId)
    .eq("contrato_id", id)
    .eq("tenant_id", usuario.tenant_id)
    .maybeSingle<Pick<LinhaDocumentoLocacao, "arquivo_caminho" | "nome" | "arquivo_nome_original">>();
  if (!doc || !doc.arquivo_caminho.startsWith(`${usuario.tenant_id}/${id}/`)) return new Response("Documento não encontrado.", { status: 404 });
  const extensao = doc.arquivo_caminho.split(".").pop();
  const baixar = new URL(request.url).searchParams.get("baixar") === "1";
  const { data, error } = await createAdminClient().storage.from(BUCKET_DOCUMENTOS_LOCACAO).createSignedUrl(
    doc.arquivo_caminho, 60, baixar ? { download: `${doc.nome.replace(/[\\/:*?"<>|]/g, "-")}.${extensao}` } : undefined,
  );
  if (error || !data?.signedUrl) return new Response("Não foi possível abrir o arquivo. Tente novamente.", { status: 503 });
  const resposta = NextResponse.redirect(data.signedUrl);
  resposta.headers.set("Cache-Control", "private, no-store");
  resposta.headers.set("Referrer-Policy", "no-referrer");
  return resposta;
}
