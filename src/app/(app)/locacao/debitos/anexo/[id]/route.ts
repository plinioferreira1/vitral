import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { BUCKET_DEBITOS, carregarPermissoes } from "../../dados";

/** Abre o anexo de um débito por um link temporário (o arquivo fica em pasta privada). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario) return new Response("Não autorizado.", { status: 401 });
  const supabase = await createClient();
  if (!(await carregarPermissoes(supabase, user.id, usuario.nivel_acesso)).ver) return new Response("Não autorizado.", { status: 403 });
  const { data: item } = await supabase.from("debitos_itens").select("anexo_caminho").eq("id", id).maybeSingle();
  if (!item?.anexo_caminho) return new Response("Anexo não encontrado.", { status: 404 });
  const { data } = await supabase.storage.from(BUCKET_DEBITOS).createSignedUrl(item.anexo_caminho, 120);
  if (!data?.signedUrl) return new Response("Anexo indisponível.", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
