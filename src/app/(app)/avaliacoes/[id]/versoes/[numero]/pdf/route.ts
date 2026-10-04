import { podeAcessarModulo } from "@/lib/avaliacao/permissoes";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { BUCKET_AVALIACOES } from "../../../../dados";

/** PDF de uma versão emitida: o arquivo guardado na emissão, sem regerar. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string; numero: string }> }) {
  const { id, numero } = await params;
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id || !podeAcessarModulo(usuario.nivel_acesso)) {
    return new Response("Não autorizado.", { status: 401 });
  }
  const n = Number(numero);
  if (!Number.isInteger(n) || n < 1) return new Response("Versão inválida.", { status: 400 });

  const supabase = await createClient();
  const { data: versao } = await supabase
    .from("avaliacao_versoes")
    .select("pdf_caminho, avaliacoes ( codigo )")
    .eq("avaliacao_id", id)
    .eq("numero", n)
    .maybeSingle();
  if (!versao) return new Response("Versão não encontrada.", { status: 404 });

  const { data: arquivo } = await supabase.storage.from(BUCKET_AVALIACOES).download(versao.pdf_caminho);
  if (!arquivo) return new Response("Arquivo da versão não encontrado.", { status: 404 });
  const codigo = (versao.avaliacoes as unknown as { codigo: string } | null)?.codigo ?? "avaliacao";
  return new Response(new Uint8Array(await arquivo.arrayBuffer()), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${codigo}-v${n}.pdf"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}
