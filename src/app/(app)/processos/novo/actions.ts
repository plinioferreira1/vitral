"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hojeISO } from "@/lib/data-br";

/**
 * Acha um registro pelo nome (exato, sem diferenciar maiúsculas)
 * numa tabela do tenant; se não existir, cria na hora com esse
 * nome. É o que permite digitar um nome novo direto no formulário
 * em vez de precisar cadastrar antes em outro lugar.
 */
async function resolverOuCriar(
  supabase: SupabaseClient,
  tabela: string,
  campoNome: string,
  tenantId: string,
  valorDigitado: string
): Promise<string | null> {
  const nome = valorDigitado.trim();
  if (!nome) return null;

  const { data: existente } = await supabase
    .from(tabela)
    .select("id")
    .eq("tenant_id", tenantId)
    .ilike(campoNome, nome)
    .limit(1)
    .maybeSingle();

  if (existente) return existente.id;

  const { data: criado } = await supabase
    .from(tabela)
    .insert({ tenant_id: tenantId, [campoNome]: nome })
    .select("id")
    .single();

  return criado?.id ?? null;
}

export async function criarProcesso(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const modeloProcessoId = String(formData.get("modelo_processo_id") ?? "");
  const categoria = String(formData.get("categoria") ?? "venda");
  const compradorNome = String(formData.get("comprador_nome") ?? "");
  const vendedorNome = String(formData.get("vendedor_nome") ?? "");
  const imovelEndereco = String(formData.get("imovel_endereco") ?? "");
  const bancoNome = String(formData.get("banco_nome") ?? "");
  const corretorNome = String(formData.get("corretor_nome") ?? "");
  const responsavelNome = String(formData.get("responsavel_nome") ?? "");
  const dataBase = String(formData.get("data_base") ?? "");
  const valorTotal = String(formData.get("valor_total") ?? "");
  const valorFinanciado = String(formData.get("valor_financiado") ?? "");
  const origem = String(formData.get("origem") ?? "").trim() || null;
  const etapasSelecionadas = formData.getAll("etapas_selecionadas") as string[];

  if (!modeloProcessoId || !dataBase) {
    redirect(`/processos/novo?erro=${encodeURIComponent("Modelo e data base são obrigatórios.")}`);
  }

  const { data: usuarioRow } = await supabase
    .from("usuarios")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  const tenantId = usuarioRow?.tenant_id;
  if (!tenantId) redirect("/onboarding");

  const { data: modeloProcesso } = await supabase
    .from("modelos_processo")
    .select("nome")
    .eq("id", modeloProcessoId)
    .single();

  // Resolve (ou cria na hora) cada entidade digitada
  const compradorId = await resolverOuCriar(supabase, "clientes", "nome", tenantId, compradorNome);
  const vendedorId = await resolverOuCriar(supabase, "clientes", "nome", tenantId, vendedorNome);
  const imovelId = await resolverOuCriar(supabase, "imoveis", "endereco", tenantId, imovelEndereco);
  const bancoId = await resolverOuCriar(supabase, "bancos", "nome", tenantId, bancoNome);
  const corretorId = await resolverOuCriar(supabase, "corretores", "nome", tenantId, corretorNome);
  // o campo "Indicação" na tela virou o mesmo campo que antes era
  // "Corretor" — usa a mesma pessoa resolvida pros dois papéis.
  const indicacaoId = corretorId;

  // Responsável precisa ser alguém que já tem conta no sistema —
  // não dá pra "criar" uma pessoa nova aqui. Se não encontrar pelo
  // nome digitado, cai pra quem está criando o processo.
  let responsavelId = user.id;
  if (responsavelNome.trim()) {
    const { data: usuarioEncontrado } = await supabase
      .from("usuarios")
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike("nome", responsavelNome.trim())
      .limit(1)
      .maybeSingle();
    if (usuarioEncontrado) responsavelId = usuarioEncontrado.id;
  }

  // Número de processo legível: PROC-<ano>-<sequencial simples baseado em timestamp>
  const numeroProcesso = `PROC-${hojeISO().slice(0, 4)}-${Date.now().toString().slice(-5)}`;

  const { data: processo, error: errProcesso } = await supabase
    .from("processos")
    .insert({
      tenant_id: tenantId,
      modelo_processo_id: modeloProcessoId,
      numero_processo: numeroProcesso,
      comprador_id: compradorId,
      vendedor_id: vendedorId,
      imovel_id: imovelId,
      banco_id: bancoId,
      corretor_id: corretorId,
      responsavel_id: responsavelId,
      tipo: modeloProcesso?.nome ?? null,
      status: "ativo",
      categoria: categoria,
      valor_total: valorTotal ? Number(valorTotal) : null,
      valor_financiado: valorFinanciado ? Number(valorFinanciado) : null,
      origem,
      indicacao_id: indicacaoId,
      data_criacao: dataBase,
    })
    .select("id")
    .single();

  if (errProcesso || !processo) {
    redirect(`/processos/novo?erro=${encodeURIComponent(errProcesso?.message ?? "Erro ao criar processo.")}`);
    return;
  }

  if (categoria === "financiamento") {
    // Financiamento segue um fluxo padrão: as etapas sequenciais da
    // categoria entram automaticamente. Situações especiais (Reprovado,
    // Desistência) só entram se/quando acontecerem, na tela do processo.
    const { data: todasEtapas } = await supabase
      .from("etapas_padrao")
      .select("id, nome, ordem")
      .eq("categoria", "financiamento")
      .eq("tipo", "sequencial")
      .order("ordem", { ascending: true });

    if (todasEtapas && todasEtapas.length > 0) {
      await supabase.from("etapas").insert(
        todasEtapas.map((ep) => ({
          processo_id: processo.id,
          nome: ep.nome,
          responsavel_id: responsavelId,
          status: "pendente",
          ordem: ep.ordem,
        }))
      );
    }
  } else if (etapasSelecionadas.length > 0) {
    const { data: etapasPadrao } = await supabase
      .from("etapas_padrao")
      .select("id, nome, ordem")
      .in("id", etapasSelecionadas);

    if (etapasPadrao && etapasPadrao.length > 0) {
      await supabase.from("etapas").insert(
        etapasPadrao.map((ep) => ({
          processo_id: processo.id,
          nome: ep.nome,
          responsavel_id: responsavelId,
          status: "pendente",
          ordem: ep.ordem,
        }))
      );
    }
  }

  await supabase.from("historico").insert({
    processo_id: processo.id,
    usuario_id: user.id,
    acao: "criou o processo",
    detalhe: { modelo: modeloProcesso?.nome },
  });

  redirect(`/processos/${processo.id}`);
}
