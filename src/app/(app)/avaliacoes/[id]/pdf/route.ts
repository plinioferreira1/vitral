import { gerarPdfAvaliacao } from "@/lib/avaliacao/pdf";
import { podeAcessarModulo } from "@/lib/avaliacao/permissoes";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { carregarAvaliacao, carregarFontesPdf, carregarImagensPdf } from "../../dados";

export const maxDuration = 60;

/** Prévia do conteúdo atual: sempre com marca d'água e sem assinatura. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id || !podeAcessarModulo(usuario.nivel_acesso)) {
    return new Response("Não autorizado.", { status: 401 });
  }
  const supabase = await createClient();
  const c = await carregarAvaliacao(supabase, id, usuario.tenant_id);
  if (!c) return new Response("Avaliação não encontrada.", { status: 404 });

  const origem = new URL(request.url).origin;
  const [{ data: criador }, imagens, fontes] = await Promise.all([
    supabase.from("usuarios").select("nome").eq("id", c.linha.criado_por).maybeSingle(),
    carregarImagensPdf(supabase, c.conteudo, origem),
    carregarFontesPdf(origem),
  ]);
  const pdf = await gerarPdfAvaliacao(c.conteudo, {
    rascunho: true,
    versao: null,
    emitidoEm: null,
    elaboradoPor: criador?.nome ?? null,
    aprovacao: null,
    assinatura: null,
    imagens,
    fontes,
  });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="previa-${c.avaliacao.codigo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
