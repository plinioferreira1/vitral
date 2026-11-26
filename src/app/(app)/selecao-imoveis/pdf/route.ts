import { gerarPdfSelecao } from "@/lib/vendas/pdf-selecao";
import { lerEntradaSelecao } from "@/lib/vendas/selecao-imoveis";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { carregarFontesTermo, carregarTimbrado } from "../../vendas/termos-entrega/dados";

export const maxDuration = 60;

/** Recebe perfil e anúncios da tela, confere tudo no servidor e devolve o PDF. Não grava nada. */
export async function POST(request: Request) {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id || !usuario.ativo) return Response.json({ erro: "Entre no Vitral novamente." }, { status: 401 });
  if (usuario.nivel_acesso === "social_media") return Response.json({ erro: "Sem permissão para esta ferramenta." }, { status: 403 });

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const entrada = lerEntradaSelecao(corpo);
  if ("erro" in entrada) return Response.json({ erro: entrada.erro }, { status: 422 });

  const supabase = await createClient();
  const origem = new URL(request.url).origin;
  const [timbrado, fontes] = await Promise.all([carregarTimbrado(supabase, "", origem), carregarFontesTermo(origem)]);
  const agora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date());
  const pdf = await gerarPdfSelecao(entrada.perfil, entrada.anuncios, entrada.mensagem, { corretor: usuario.nome ?? "", geradoEm: agora }, { timbrado, fontes });

  const nome = `imoveis-selecionados-${entrada.perfil.cliente.normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "cliente"}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${nome}"`, "Cache-Control": "no-store" },
  });
}
