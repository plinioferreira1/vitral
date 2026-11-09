"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/usuario-atual";
import { avisar } from "@/lib/aviso";

const mesValido = (s: string) => /^20[0-9]{2}-(0[1-9]|1[0-2])$/.test(s);
const uuidValido = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

export async function salvarFonteLead(formData: FormData) {
  const sessao = await exigirUsuario(["diretor", "gerente"]);
  if (!sessao) return;
  const id = String(formData.get("processo_id") || "");
  const fonte = String(formData.get("fonte_lead") || "").trim();
  const observacoes = String(formData.get("fonte_lead_observacoes") || "").trim();
  const mes = String(formData.get("mes_venda") || "");
  if (!uuidValido(id) || fonte.length > 100 || observacoes.length > 500 || (mes && !mesValido(mes))) {
    await avisar("erro", "Confira os dados informados.");
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("processos")
    .update({ fonte_lead: fonte || null, fonte_lead_observacoes: observacoes || null, mes_venda: mes || null })
    .eq("id", id).eq("tenant_id", sessao.tenantId).eq("categoria", "venda");
  if (error) { await avisar("erro", "Não foi possível salvar a fonte do lead: " + error.message); return; }
  revalidatePath("/vendas/fontes-leads");
  revalidatePath(`/processos/${id}`);
  await avisar("sucesso", "Fonte do lead atualizada.");
}

export async function salvarHistoricoFonteLead(formData: FormData) {
  const sessao = await exigirUsuario(["diretor", "gerente"]);
  if (!sessao) return;
  const id = String(formData.get("historico_id") || "").trim();
  const imovel = String(formData.get("imovel_nome") || "").trim();
  const fonte = String(formData.get("fonte_lead") || "").trim();
  const observacoes = String(formData.get("fonte_lead_observacoes") || "").trim();
  const mes = String(formData.get("mes_venda") || "").trim();
  if ((!id && !imovel) || (id && !uuidValido(id)) || imovel.length > 180 || fonte.length > 100 || observacoes.length > 500 || !mesValido(mes)) {
    await avisar("erro", "Confira o imóvel, a fonte do lead e o mês da venda.");
    return;
  }
  const supabase = await createClient();
  const payload = { imovel_nome: imovel, mes_venda: mes, fonte_lead: fonte || null, fonte_lead_observacoes: observacoes || null };
  const resultado = id
    ? await supabase.from("vendas_fontes_historicas").update(payload).eq("id", id).eq("tenant_id", sessao.tenantId).select("id").maybeSingle()
    : await supabase.from("vendas_fontes_historicas").insert({ ...payload, tenant_id: sessao.tenantId }).select("id").maybeSingle();
  if (resultado.error) { await avisar("erro", "Não foi possível salvar a venda histórica: " + resultado.error.message); return; }
  if (!resultado.data) { await avisar("erro", "Registro não encontrado ou sem permissão."); return; }
  revalidatePath("/vendas/fontes-leads");
  await avisar("sucesso", id ? "Venda histórica atualizada." : "Venda histórica cadastrada.");
}

export async function salvarInvestimentoCanal(formData: FormData) {
  const sessao = await exigirUsuario(["diretor", "gerente"]);
  if (!sessao) return;
  const canal = String(formData.get("canal") ?? "").trim();
  const mes = String(formData.get("mes") ?? "").trim();
  const valorTexto = String(formData.get("valor") ?? "").trim().replace(/\s/g, "").replace(/R\$/gi, "");
  const valor = Number(valorTexto.includes(",") ? valorTexto.replace(/\./g, "").replace(",", ".") : valorTexto);
  const observacoes = String(formData.get("observacoes") ?? "").trim();
  if (!canal || canal.length > 100 || !mesValido(mes) || !valorTexto || !Number.isFinite(valor) || valor < 0 || valor > 999999999 || observacoes.length > 500) {
    await avisar("erro", "Confira o canal, o mês e o investimento informado.");
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("vendas_investimentos_canais").upsert({
    tenant_id: sessao.tenantId,
    canal,
    mes,
    valor: Math.round(valor * 100) / 100,
    observacoes: observacoes || null,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: "tenant_id,canal,mes" });
  if (error) { await avisar("erro", "Não foi possível salvar o investimento: " + error.message); return; }
  revalidatePath("/vendas/fontes-leads");
  revalidatePath("/vendas/fontes-leads/investimentos");
  await avisar("sucesso", "Investimento mensal salvo.");
}


/** Edição rápida da planilha: altera somente a fonte, sem mexer em datas ou no status. */
export async function salvarFonteRapida(tipo: "processo" | "historico", id: string, fonte: string):
  Promise<{ ok: boolean; erro?: string }> {
  const sessao = await exigirUsuario(["diretor", "gerente"]);
  if (!sessao) return { ok: false, erro: "Sessão expirada." };
  if (!uuidValido(id) || fonte.length > 100 || !["processo", "historico"].includes(tipo)) {
    return { ok: false, erro: "Dados inválidos." };
  }
  const supabase = await createClient();
  const resultado = tipo === "processo"
    ? await supabase.from("processos").update({ fonte_lead: fonte || null })
        .eq("id", id).eq("tenant_id", sessao.tenantId).eq("categoria", "venda")
        .select("id").maybeSingle()
    : await supabase.from("vendas_fontes_historicas").update({ fonte_lead: fonte || null })
        .eq("id", id).eq("tenant_id", sessao.tenantId)
        .select("id").maybeSingle();
  const { data, error } = resultado;
  if (error || !data) return { ok: false, erro: error?.message ?? "Registro não encontrado." };
  revalidatePath("/vendas/fontes-leads");
  return { ok: true };
}


/** Cadastro de canais próprios — visíveis também no novo processo e na planilha. */
export async function adicionarFonteLead(formData: FormData) {
  const sessao = await exigirUsuario(["diretor", "gerente"]);
  if (!sessao) return;
  const nome = String(formData.get("nome") ?? "").replace(/\s+/g, " ").trim();
  if (nome.length < 2 || nome.length > 100) {
    await avisar("erro", "Informe um nome de fonte entre 2 e 100 caracteres.");
    return;
  }
  const { FONTES_LEADS } = await import("@/lib/vendas/fontes-leads");
  if (FONTES_LEADS.some(f => f.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR"))) {
    await avisar("erro", "Essa fonte já existe na lista padrão.");
    return;
  }
  const supabase = await createClient();
  const { data: existentes, error: erroConsulta } = await supabase
    .from("vendas_fontes_personalizadas")
    .select("id, nome, ativo")
    .eq("tenant_id", sessao.tenantId);
  if (erroConsulta) { await avisar("erro", "Não foi possível verificar as fontes."); return; }
  const anterior = (existentes ?? []).find(f => f.nome.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR"));
  if (anterior) {
    if (anterior.ativo) { await avisar("erro", "Essa fonte já está cadastrada."); return; }
    const { error } = await supabase.from("vendas_fontes_personalizadas")
      .update({ ativo: true }).eq("tenant_id", sessao.tenantId).eq("id", anterior.id);
    if (error) { await avisar("erro", "Não foi possível reativar a fonte."); return; }
  } else {
    const { error } = await supabase.from("vendas_fontes_personalizadas")
      .insert({ tenant_id: sessao.tenantId, nome });
    if (error) { await avisar("erro", "Não foi possível cadastrar. Confira se a fonte já existe."); return; }
  }
  revalidatePath("/vendas/fontes-leads");
  revalidatePath("/vendas/fontes-leads/fontes");
  revalidatePath("/processos/novo");
  await avisar("sucesso", "Fonte cadastrada! Já está disponível nas listas.");
}

/** Ocultar do seletor, sem apagar o histórico de vendas atribuído ao canal. */
export async function desativarFonteLead(formData: FormData) {
  const sessao = await exigirUsuario(["diretor", "gerente"]);
  if (!sessao) return;
  const id = String(formData.get("id") ?? "");
  if (!uuidValido(id)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("vendas_fontes_personalizadas")
    .update({ ativo: false }).eq("id", id).eq("tenant_id", sessao.tenantId);
  if (error) { await avisar("erro", "Não foi possível ocultar a fonte."); return; }
  revalidatePath("/vendas/fontes-leads");
  revalidatePath("/vendas/fontes-leads/fontes");
  revalidatePath("/processos/novo");
  await avisar("sucesso", "Fonte ocultada das opções. O histórico foi preservado.");
}
