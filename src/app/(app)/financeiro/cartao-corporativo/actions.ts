"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function contexto(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", user?.id ?? "")
    .single();
  return usuario?.tenant_id ?? null;
}

export async function criarCartao(formData: FormData) {
  const supabase = await createClient();
  const tenantId = await contexto(supabase);
  if (!tenantId) return;

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  await supabase.from("financeiro_cartoes").insert({
    tenant_id: tenantId,
    nome,
    banco: String(formData.get("banco") ?? "").trim() || null,
    final_digitos: String(formData.get("final_digitos") ?? "").trim() || null,
  });

  revalidatePath("/financeiro/cartao-corporativo");
}

function normalizarData(v: string): string | null {
  v = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const dia = m[1].padStart(2, "0");
    const mes = m[2].padStart(2, "0");
    const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${ano}-${mes}-${dia}`;
  }
  return null;
}

function normalizarValor(v: string): number | null {
  v = v.trim().replace(/^R\$\s?/i, "");
  // aceita "1.234,56" (BR) ou "1234.56" (US)
  if (/,\d{1,2}$/.test(v)) {
    v = v.replace(/\./g, "").replace(",", ".");
  } else {
    v = v.replace(/,/g, "");
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function detectarDelimitador(linha: string): string {
  return (linha.match(/;/g)?.length ?? 0) >= (linha.match(/,/g)?.length ?? 0) ? ";" : ",";
}

type LinhaFatura = {
  data: string;
  estabelecimento: string;
  descricao: string | null;
  valor: number;
  parcela_atual: number | null;
  parcela_total: number | null;
};

function parseCsvFatura(texto: string): { itens: LinhaFatura[]; erros: string[] } {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (linhas.length === 0) return { itens: [], erros: ["Arquivo vazio."] };

  const delimitador = detectarDelimitador(linhas[0]);
  const cabecalho = linhas[0].split(delimitador).map((c) => c.trim().toLowerCase().replace(/["']/g, ""));
  const idxData = cabecalho.findIndex((c) => c.includes("data"));
  const idxEstab = cabecalho.findIndex((c) => c.includes("estabelec") || c.includes("descri"));
  const idxDescricao = cabecalho.findIndex((c) => c.includes("descri") && c !== cabecalho[idxEstab]);
  const idxValor = cabecalho.findIndex((c) => c.includes("valor"));
  const idxParcela = cabecalho.findIndex((c) => c.includes("parcela"));

  if (idxData === -1 || idxEstab === -1 || idxValor === -1) {
    return {
      itens: [],
      erros: [
        'Não encontrei as colunas "data", "estabelecimento" e "valor" no cabeçalho do arquivo. Confira o formato esperado.',
      ],
    };
  }

  const itens: LinhaFatura[] = [];
  const erros: string[] = [];
  for (let i = 1; i < linhas.length; i++) {
    const colunas = linhas[i].split(delimitador).map((c) => c.trim().replace(/^"|"$/g, ""));
    const data = normalizarData(colunas[idxData] ?? "");
    const estabelecimento = colunas[idxEstab] ?? "";
    const valor = normalizarValor(colunas[idxValor] ?? "");
    if (!data || !estabelecimento || valor === null) {
      erros.push(`Linha ${i + 1}: dados inválidos, ignorada.`);
      continue;
    }
    let parcelaAtual: number | null = null;
    let parcelaTotal: number | null = null;
    if (idxParcela !== -1) {
      const m = (colunas[idxParcela] ?? "").match(/(\d+)\s*\/\s*(\d+)/);
      if (m) {
        parcelaAtual = Number(m[1]);
        parcelaTotal = Number(m[2]);
      }
    }
    itens.push({
      data,
      estabelecimento,
      descricao: idxDescricao !== -1 ? colunas[idxDescricao] || null : null,
      valor,
      parcela_atual: parcelaAtual,
      parcela_total: parcelaTotal,
    });
  }
  return { itens, erros };
}

export async function importarFatura(formData: FormData) {
  const supabase = await createClient();
  const tenantId = await contexto(supabase);
  if (!tenantId) return;

  const cartaoId = String(formData.get("cartao_id") ?? "");
  const competenciaMes = String(formData.get("competencia") ?? "").trim();
  const vencimento = String(formData.get("vencimento") ?? "").trim() || null;
  const arquivo = formData.get("arquivo");
  if (!cartaoId || !competenciaMes || !(arquivo instanceof File) || arquivo.size === 0) return;

  const competencia = `${competenciaMes}-01`;
  const texto = await arquivo.text();
  const { itens } = parseCsvFatura(texto);
  if (itens.length === 0) return;

  const { data: fatura } = await supabase
    .from("financeiro_faturas")
    .insert({ tenant_id: tenantId, cartao_id: cartaoId, competencia, vencimento })
    .select("id")
    .single();
  if (!fatura) return;

  await supabase.from("financeiro_fatura_itens").insert(
    itens.map((it) => ({
      tenant_id: tenantId,
      fatura_id: fatura.id,
      data: it.data,
      estabelecimento: it.estabelecimento,
      descricao: it.descricao,
      valor: it.valor,
      parcela_atual: it.parcela_atual,
      parcela_total: it.parcela_total,
    }))
  );

  revalidatePath("/financeiro/cartao-corporativo");
}

export async function categorizarItemFatura(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const categoriaId = String(formData.get("categoria_id") ?? "").trim();
  if (!id || !categoriaId) return;
  const centroCustoId = String(formData.get("centro_custo_id") ?? "").trim() || null;

  const supabase = await createClient();
  await supabase
    .from("financeiro_fatura_itens")
    .update({ categoria_id: categoriaId, centro_custo_id: centroCustoId })
    .eq("id", id);

  revalidatePath("/financeiro/cartao-corporativo");
}

/** Sugere categoria pra itens ainda sem categoria com base em outros itens
 * (de qualquer fatura) que já foram categorizados com o mesmo estabelecimento
 * — sugestão real, aprendida do próprio histórico, não inventada. */
export async function aplicarSugestaoCategoria(formData: FormData) {
  const faturaId = String(formData.get("fatura_id") ?? "");
  if (!faturaId) return;

  const supabase = await createClient();
  const [{ data: pendentes }, { data: historico }] = await Promise.all([
    supabase.from("financeiro_fatura_itens").select("id, estabelecimento").eq("fatura_id", faturaId).is("categoria_id", null),
    supabase.from("financeiro_fatura_itens").select("estabelecimento, categoria_id, centro_custo_id").not("categoria_id", "is", null),
  ]);
  if (!pendentes || pendentes.length === 0 || !historico) return;

  const sugestaoPorEstabelecimento = new Map<string, { categoria_id: string; centro_custo_id: string | null }>();
  historico.forEach((h) => {
    const chave = h.estabelecimento.trim().toLowerCase();
    if (!sugestaoPorEstabelecimento.has(chave) && h.categoria_id) {
      sugestaoPorEstabelecimento.set(chave, { categoria_id: h.categoria_id, centro_custo_id: h.centro_custo_id });
    }
  });

  for (const item of pendentes) {
    const sugestao = sugestaoPorEstabelecimento.get(item.estabelecimento.trim().toLowerCase());
    if (!sugestao) continue;
    await supabase
      .from("financeiro_fatura_itens")
      .update({ categoria_id: sugestao.categoria_id, centro_custo_id: sugestao.centro_custo_id })
      .eq("id", item.id);
  }

  revalidatePath("/financeiro/cartao-corporativo");
}

export async function limparCategorizacoes(formData: FormData) {
  const faturaId = String(formData.get("fatura_id") ?? "");
  if (!faturaId) return;
  const supabase = await createClient();
  await supabase
    .from("financeiro_fatura_itens")
    .update({ categoria_id: null, centro_custo_id: null })
    .eq("fatura_id", faturaId);
  revalidatePath("/financeiro/cartao-corporativo");
}

export async function apagarFatura(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("financeiro_faturas").delete().eq("id", id);
  revalidatePath("/financeiro/cartao-corporativo");
}
