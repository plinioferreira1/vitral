import { NextResponse } from "next/server";
import { BUCKET_DESPESAS, caminhoAnexoValido } from "@/lib/anexo-despesa";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual, GESTORES } from "@/lib/usuario-atual";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, usuario } = await getUsuarioAtual();
  if (!user) return new Response("Entre no Vitral para abrir este arquivo.", { status: 401 });
  if (!usuario?.ativo || !usuario.tenant_id || !GESTORES.includes(usuario.nivel_acesso)) return new Response("Sem permissão.", { status: 403 });
  const { id } = await params;
  const supabase = await createClient();
  const { data: anexo } = await supabase.from("financeiro_anexos").select("caminho, nome")
    .eq("lancamento_id", id).eq("tenant_id", usuario.tenant_id).single();
  if (!anexo || !caminhoAnexoValido(anexo.caminho, usuario.tenant_id, id)) return new Response("Anexo não encontrado.", { status: 404 });
  const { data, error } = await createAdminClient().storage.from(BUCKET_DESPESAS).createSignedUrl(
    anexo.caminho, 60, new URL(request.url).searchParams.get("baixar") === "1" ? { download: anexo.nome } : undefined,
  );
  if (error || !data?.signedUrl) return new Response("Não foi possível abrir o arquivo. Tente novamente.", { status: 503 });
  const resposta = NextResponse.redirect(data.signedUrl);
  resposta.headers.set("Cache-Control", "private, no-store");
  resposta.headers.set("Referrer-Policy", "no-referrer");
  return resposta;
}
