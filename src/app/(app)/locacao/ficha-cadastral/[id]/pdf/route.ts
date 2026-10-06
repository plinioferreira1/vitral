import { createClient } from "@/lib/supabase/server";
import { tipoLocatario, type DadosFicha } from "@/lib/ficha-locacao/campos";
import { gerarPdfFicha } from "@/lib/ficha-locacao/pdf";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient() as unknown as SupabaseClient;
  const [{ data: ficha }, { data: documentos }] = await Promise.all([
    supabase.from("fichas_cadastrais_locacao").select("*").eq("id", id).single(),
    supabase.from("ficha_locacao_documentos").select("nome_arquivo, tipo").eq("ficha_id", id).order("criado_em"),
  ]);
  if (!ficha) return new Response("Ficha não encontrada", { status: 404 });
  if (ficha.status !== "concluida") return new Response("A ficha ainda não foi concluída", { status: 400 });
  const { data: principal } = ficha.ficha_principal_id
    ? await supabase.from("fichas_cadastrais_locacao").select("proponente_nome, dados").eq("id", ficha.ficha_principal_id).maybeSingle()
    : { data: null };
  const dadosPrincipal = (principal?.dados ?? {}) as DadosFicha;
  const bytes = await gerarPdfFicha({
    proponente: ficha.proponente_nome, imovel: ficha.imovel_referencia, tipo: tipoLocatario(ficha.tipo_locatario),
    dados: (ficha.dados ?? {}) as DadosFicha,
    titular: principal ? { nome: String(dadosPrincipal.nome_completo ?? principal.proponente_nome ?? ""), garantia: String(dadosPrincipal.garantia ?? "") } : null,
    documentos: documentos ?? [], assinatura: ficha.assinatura_imagem, concluidoEm: ficha.concluido_em, ip: ficha.ip_conclusao,
  });
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="ficha-locacao-${id}.pdf"`, "Cache-Control": "private, no-store" } });
}
