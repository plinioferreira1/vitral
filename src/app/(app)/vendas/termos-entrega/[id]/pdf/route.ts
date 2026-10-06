import { createClient } from "@/lib/supabase/server";
import { montarRetrato } from "@/lib/termo-entrega/conteudo";
import { gerarPdfTermo } from "@/lib/termo-entrega/pdf";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { carregarFontesTermo, carregarPermissoes, carregarTermo, carregarTimbrado, paraAssinaturas } from "../../dados";

export const maxDuration = 60;

/**
 * PDF do termo. Em rascunho é a pré-visualização (marca "MINUTA");
 * depois de gerado, sai sempre do retrato guardado da versão — nunca dos
 * cadastros atuais. `?versao=N` abre uma versão anterior; `?baixar=1` baixa.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id) return new Response("Não autorizado.", { status: 401 });
  const supabase = await createClient();
  if (!(await carregarPermissoes(supabase, user.id, usuario.nivel_acesso)).ver) return new Response("Não autorizado.", { status: 403 });
  const t = await carregarTermo(supabase, id, usuario.tenant_id);
  if (!t) return new Response("Termo não encontrado.", { status: 404 });

  const url = new URL(request.url);
  const pedida = Number(url.searchParams.get("versao")) || null;
  const numero = pedida ?? t.termo.versao;
  const guardada = t.versoes.find((v) => v.versao === numero);
  const emRascunho = t.termo.status === "rascunho" && numero === t.termo.versao;

  let retrato = guardada?.retrato ?? null;
  let marca: string | null = null;
  if (emRascunho || !retrato) {
    if (numero !== t.termo.versao) return new Response("Versão não encontrada.", { status: 404 });
    retrato = montarRetrato(t.documento, { codigo: t.termo.codigo, versao: t.termo.versao, geradoEm: new Date().toISOString(), geradoPorNome: usuario.nome, modelo: t.modelo });
    marca = "MINUTA";
  } else if (numero < t.termo.versao) marca = "SUBSTITUÍDA";
  else if (t.termo.status === "cancelado") marca = "CANCELADO";

  const [timbrado, fontes] = await Promise.all([carregarTimbrado(supabase, retrato.modelo.timbradoCaminho, url.origin), carregarFontesTermo(url.origin)]);
  const pdf = await gerarPdfTermo(retrato, { timbrado, fontes, assinaturas: marca === "MINUTA" ? [] : paraAssinaturas(t.signatarios, numero), marcaDagua: marca });
  const nome = `termo-entrega-${t.termo.codigo}-v${numero}${marca === "MINUTA" ? "-minuta" : ""}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${url.searchParams.get("baixar") ? "attachment" : "inline"}; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
