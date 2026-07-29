"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function criarProcesso(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const modeloProcessoId = String(formData.get("modelo_processo_id") ?? "");
  const categoria = String(formData.get("categoria") ?? "venda");
  const compradorId = String(formData.get("comprador_id") ?? "") || null;
  const vendedorId = String(formData.get("vendedor_id") ?? "") || null;
  const imovelId = String(formData.get("imovel_id") ?? "") || null;
  const bancoId = String(formData.get("banco_id") ?? "") || null;
  const corretorId = String(formData.get("corretor_id") ?? "") || null;
  const responsavelId = String(formData.get("responsavel_id") ?? "") || user.id;
  const dataBase = String(formData.get("data_base") ?? "");
  const valorTotal = String(formData.get("valor_total") ?? "");
  const valorFinanciado = String(formData.get("valor_financiado") ?? "");
  const origem = String(formData.get("origem") ?? "").trim() || null;
  const indicacaoId = String(formData.get("indicacao_id") ?? "") || null;
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

  // Número de processo legível: PROC-<ano>-<sequencial simples baseado em timestamp>
  const numeroProcesso = `PROC-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

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

  if (etapasSelecionadas.length > 0) {
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
