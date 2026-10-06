import { carregarFontesTermo, carregarTimbrado } from "@/app/(app)/vendas/termos-entrega/dados";
import { createAdminClient } from "@/lib/supabase/admin";
import { gerarPdfTermo } from "@/lib/termo-entrega/pdf";
import { buscarPorToken } from "../dados";

export const maxDuration = 60;

/** PDF da versão enviada para assinatura, para quem tem o link pessoal. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const dados = await buscarPorToken(token);
  if (!dados) return new Response("Link inválido ou expirado.", { status: 404 });

  const origem = new URL(request.url).origin;
  const caminho = dados.retrato.modelo.timbradoCaminho;
  // timbrado enviado fica em pasta privada: só o servidor lê (e só o arquivo citado no retrato)
  let leitor: Parameters<typeof carregarTimbrado>[0] | null = null;
  if (caminho) {
    try {
      leitor = createAdminClient() as unknown as Parameters<typeof carregarTimbrado>[0];
    } catch {
      leitor = null;
    }
  }
  const [timbrado, fontes] = await Promise.all([
    leitor ? carregarTimbrado(leitor, caminho, origem) : carregarTimbrado({ storage: null as never }, "", origem),
    carregarFontesTermo(origem),
  ]);
  const pdf = await gerarPdfTermo(dados.retrato, { timbrado, fontes, assinaturas: dados.assinaturas, marcaDagua: null });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="termo-entrega-${dados.termo.codigo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
