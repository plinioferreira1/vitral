"use server";

import { exigirUsuario, GESTORES } from "@/lib/usuario-atual";

import { checar } from "@/lib/aviso";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { parseCsvFatura } from "@/lib/fatura-csv";

/** Empresa de quem está logado — só diretor/gerente (senão, avisa e devolve null). */
async function contexto() {
  return (await exigirUsuario(GESTORES))?.tenantId ?? null;
}

export async function criarCartao(formData: FormData) {
  const supabase = await createClient();
  const tenantId = await contexto();
  if (!tenantId) return;

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) return;

  await checar(supabase.from("financeiro_cartoes").insert({
    tenant_id: tenantId,
    nome,
    banco: String(formData.get("banco") ?? "").trim() || null,
    final_digitos: String(formData.get("final_digitos") ?? "").trim() || null,
  }), "salvar");

  revalidatePath("/financeiro/cartao-corporativo");
}

export async function importarFatura(formData: FormData) {
  const supabase = await createClient();
  const tenantId = await contexto();
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

  await checar(supabase.from("financeiro_fatura_itens").insert(
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
  ), "salvar");

  revalidatePath("/financeiro/cartao-corporativo");
}

export async function categorizarItemFatura(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const id = String(formData.get("id") ?? "");
  const categoriaId = String(formData.get("categoria_id") ?? "").trim();
  if (!id || !categoriaId) return;
  const centroCustoId = String(formData.get("centro_custo_id") ?? "").trim() || null;

  const supabase = await createClient();
  await checar(supabase
    .from("financeiro_fatura_itens")
    .update({ categoria_id: categoriaId, centro_custo_id: centroCustoId })
    .eq("id", id), "atualizar");

  revalidatePath("/financeiro/cartao-corporativo");
}

/** Sugere categoria pra itens ainda sem categoria com base em outros itens
 * (de qualquer fatura) que já foram categorizados com o mesmo estabelecimento
 * — sugestão real, aprendida do próprio histórico, não inventada. */
export async function aplicarSugestaoCategoria(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
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

  await Promise.all(
    pendentes.flatMap((item) => {
      const sugestao = sugestaoPorEstabelecimento.get(item.estabelecimento.trim().toLowerCase());
      if (!sugestao) return [];
      return [
        checar(
          supabase
            .from("financeiro_fatura_itens")
            .update({ categoria_id: sugestao.categoria_id, centro_custo_id: sugestao.centro_custo_id })
            .eq("id", item.id),
          "aplicar a categoria sugerida"
        ),
      ];
    })
  );

  revalidatePath("/financeiro/cartao-corporativo");
}

export async function limparCategorizacoes(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const faturaId = String(formData.get("fatura_id") ?? "");
  if (!faturaId) return;
  const supabase = await createClient();
  await checar(supabase
    .from("financeiro_fatura_itens")
    .update({ categoria_id: null, centro_custo_id: null })
    .eq("fatura_id", faturaId), "atualizar");
  revalidatePath("/financeiro/cartao-corporativo");
}

export async function apagarFatura(formData: FormData) {
  if (!(await exigirUsuario(GESTORES))) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await checar(supabase.from("financeiro_faturas").delete().eq("id", id), "excluir");
  revalidatePath("/financeiro/cartao-corporativo");
}
