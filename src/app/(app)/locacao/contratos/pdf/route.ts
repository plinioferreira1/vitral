import { lerCps, lerLocacao } from "@/lib/contratos-locacao/entrada";
import { montarCps, montarLocacao, validarCps, validarLocacao } from "@/lib/contratos-locacao/montar";
import { gerarPdfContrato } from "@/lib/contratos-locacao/pdf";
import { createClient } from "@/lib/supabase/server";
import { GESTORES, getUsuarioAtual } from "@/lib/usuario-atual";
import { carregarFontesTermo, carregarTimbrado } from "../../../vendas/termos-entrega/dados";

export const maxDuration = 60;

/**
 * Gera o PDF do contrato de locação ou do contrato de prestação de serviços.
 * Só gestores. Nada é gravado: os dados (inclusive os bancários dos
 * beneficiários) vão direto para o PDF e são descartados.
 */
export async function POST(request: Request) {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id || !usuario.ativo) return Response.json({ erro: "Entre no Vitral novamente." }, { status: 401 });
  if (!GESTORES.includes(usuario.nivel_acesso)) return Response.json({ erro: "Só a gestão gera contratos." }, { status: 403 });

  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ erro: "Dados inválidos." }, { status: 400 });
  }
  const tipo = corpo.tipo === "cps" ? "cps" : "locacao";
  const minuta = corpo.minuta === true;
  let documento;
  let nome: string;
  if (tipo === "cps") {
    const dados = lerCps(corpo.dados);
    const erros = minuta ? [] : validarCps(dados);
    if (erros.length) return Response.json({ erro: erros.join(" ") }, { status: 422 });
    documento = montarCps(dados);
    nome = `CPS - ${dados.contratante.nome || "proprietario"}`;
  } else {
    const dados = lerLocacao(corpo.dados);
    const erros = minuta ? [] : validarLocacao(dados);
    if (erros.length) return Response.json({ erro: erros.join(" ") }, { status: 422 });
    documento = montarLocacao(dados);
    nome = `Contrato de locacao - ${dados.locatario.nome || "locatario"}`;
  }

  const supabase = await createClient();
  const origem = new URL(request.url).origin;
  const [timbrado, fontes] = await Promise.all([carregarTimbrado(supabase, "", origem), carregarFontesTermo(origem)]);
  const pdf = await gerarPdfContrato(documento, { timbrado, fontes, marcaDagua: minuta ? "MINUTA" : null });
  const arquivo = `${nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w -]+/g, "").trim()}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${arquivo}"`, "Cache-Control": "no-store" },
  });
}
