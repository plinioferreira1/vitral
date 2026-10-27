import { getPermissoesUsuario } from "@/lib/permissoes";
import { calcularAtraso, percentual, validarAtraso, INDICES, type EntradaAtraso } from "@/lib/locacao/atraso";
import { gerarPdfMemoriaAtraso } from "@/lib/locacao/pdf-atraso";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioAtual } from "@/lib/usuario-atual";
import { carregarFontesTermo, carregarTimbrado } from "../../../vendas/termos-entrega/dados";

export const maxDuration = 60;

const texto = (v: unknown, max = 300) => String(v ?? "").trim().slice(0, max);

/** Recebe os dados da tela, refaz o cálculo no servidor e devolve o PDF da memória de cálculo. */
export async function POST(request: Request) {
  const { user, usuario } = await getUsuarioAtual();
  if (!user || !usuario?.tenant_id || !usuario.ativo) return Response.json({ erro: "Entre no Vitral novamente." }, { status: 401 });
  const supabase = await createClient();
  const perms = await getPermissoesUsuario(supabase, user.id, usuario.nivel_acesso);
  if (!perms.temLocacao || perms.ehCorretor || perms.ehSocialMedia) return Response.json({ erro: "Sem permissão para a Locação." }, { status: 403 });

  let corpo: Record<string, unknown>;
  try { corpo = await request.json(); } catch { return Response.json({ erro: "Dados inválidos." }, { status: 400 }); }

  const indice = texto(corpo.indice, 10);
  const itensBrutos = Array.isArray(corpo.itens) ? corpo.itens.slice(0, 61) : [];
  const entrada: EntradaAtraso = {
    dataCalculo: texto(corpo.dataCalculo, 10),
    multaPct: percentual(corpo.multaPct) ?? NaN,
    jurosMensalPct: percentual(corpo.jurosMensalPct) ?? NaN,
    indice: (INDICES as readonly string[]).includes(indice) ? indice : indice ? "inválido" : null,
    itens: itensBrutos.map((b: Record<string, unknown>) => ({
      descricao: texto(b?.descricao, 80),
      competencia: texto(b?.competencia, 7) || null,
      vencimento: texto(b?.vencimento, 10),
      valorCentavos: Number(b?.valorCentavos),
      correcaoPct: percentual(b?.correcaoPct) ?? 0,
    })),
  };
  const erros = validarAtraso(entrada);
  if (erros.length) return Response.json({ erro: erros.join(" ") }, { status: 422 });

  const memoria = calcularAtraso(entrada);
  const origem = new URL(request.url).origin;
  const [timbrado, fontes] = await Promise.all([carregarTimbrado(supabase, "", origem), carregarFontesTermo(origem)]);
  const agora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date());
  const pdf = await gerarPdfMemoriaAtraso(memoria, {
    contrato: texto(corpo.contrato, 120),
    locatario: texto(corpo.locatario, 160),
    locador: texto(corpo.locador, 160),
    imovel: texto(corpo.imovel, 240),
    seguradora: texto(corpo.seguradora, 160),
    observacoes: texto(corpo.observacoes, 1500),
    elaboradoPor: usuario.nome ?? "",
    geradoEm: agora,
  }, { timbrado, fontes });

  const nome = `memoria-multa-juros-${(texto(corpo.contrato, 40) || "locacao").replace(/[^\w-]+/g, "-")}-${entrada.dataCalculo}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${nome}"`, "Cache-Control": "no-store" },
  });
}
