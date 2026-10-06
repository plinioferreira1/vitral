import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { BUCKET_TERMOS, carregarPermissoes } from "../../../dados";

/** Abre o comprovante por um link temporário (o arquivo fica em pasta privada). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string; anexoId: string }> }) {
  const { id, anexoId } = await params;
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario) return new Response("Não autorizado.", { status: 401 });
  const supabase = await createClient();
  if (!(await carregarPermissoes(supabase, user.id, usuario.nivel_acesso)).ver) return new Response("Não autorizado.", { status: 403 });
  const { data: anexo } = await supabase.from("termo_entrega_anexos").select("caminho").eq("id", anexoId).eq("termo_id", id).maybeSingle();
  if (!anexo) return new Response("Anexo não encontrado.", { status: 404 });
  const { data } = await supabase.storage.from(BUCKET_TERMOS).createSignedUrl(anexo.caminho, 120);
  if (!data?.signedUrl) return new Response("Anexo indisponível.", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
