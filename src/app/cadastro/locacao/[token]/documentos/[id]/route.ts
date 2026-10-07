import { visualizarDocumento } from "../../actions";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const resultado = await visualizarDocumento(token, id);
  if (!resultado.url) return new Response(resultado.erro ?? "Documento indisponível", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  return new Response(null, { status: 302, headers: { Location: resultado.url, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
