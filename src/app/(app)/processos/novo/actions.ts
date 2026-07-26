"use server";

import { createClient } from "@/lib/supabase/server";
import { gerarEtapas } from "@/lib/motor-processos";
import { redirect } from "next/navigation";
import { parseISO } from "date-fns";

export async function criarProcesso(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const modeloProcessoId = String(formData.get("modelo_processo_id") ?? "");
  const clienteId = String(formData.get("cliente_id") ?? "") || null;
  const imovelId = String(formData.get("imovel_id") ?? "") || null;
  const bancoId = String(formData.get("banco_id") ?? "") || null;
  const corretorId = String(formData.get("corretor_id") ?? "") || null;
  const responsavelId = String(formData.get("responsavel_id") ?? "") || user.id;
  const dataBase = String(formData.get("data_base") ?? "");
  const valorTotal = String(formData.get("valor_total") ?? "");

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

  const { data: modelosEtapa, error: errModelos } = await supabase
    .from("modelos_etapa")
    .select("*")
    .eq("modelo_processo_id", modeloProcessoId)
    .order("ordem", { ascending: true });

  if (errModelos || !modelosEtapa) {
    redirect(`/processos/novo?erro=${encodeURIComponent("Não foi possível carregar o modelo.")}`);
  }

  // Número de processo legível: PROC-<ano>-<sequencial simples baseado em timestamp>
  const numeroProcesso = `PROC-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

  const { data: processo, error: errProcesso } = await supabase
    .from("processos")
    .insert({
      tenant_id: tenantId,
      modelo_processo_id: modeloProcessoId,
      numero_processo: numeroProcesso,
      cliente_id: clienteId,
      imovel_id: imovelId,
      banco_id: bancoId,
      corretor_id: corretorId,
      responsavel_id: responsavelId,
      tipo: modeloProcesso?.nome ?? null,
      status: "ativo",
      valor_total: valorTotal ? Number(valorTotal) : null,
      data_criacao: dataBase,
    })
    .select("id")
    .single();

  if (errProcesso || !processo) {
    redirect(`/processos/novo?erro=${encodeURIComponent(errProcesso?.message ?? "Erro ao criar processo.")}`);
    return;
  }

  const etapasGeradas = gerarEtapas(modelosEtapa, parseISO(dataBase));

  // mapa modelo_etapa_id -> id real da etapa criada, pra resolver dependência
  const modeloIdParaEtapaId = new Map<string, string>();

  for (const eg of etapasGeradas) {
    const dependenciaEtapaId = eg.etapa_dependencia_modelo_id
      ? modeloIdParaEtapaId.get(eg.etapa_dependencia_modelo_id) ?? null
      : null;

    const { data: etapaCriada, error: errEtapa } = await supabase
      .from("etapas")
      .insert({
        processo_id: processo.id,
        modelo_etapa_id: eg.modelo_etapa_id,
        nome: eg.nome,
        responsavel_id: responsavelId,
        data_prevista: eg.data_prevista,
        status: "pendente",
        ordem: eg.ordem,
        etapa_dependencia_id: dependenciaEtapaId,
      })
      .select("id")
      .single();

    if (errEtapa || !etapaCriada) continue;

    modeloIdParaEtapaId.set(eg.modelo_etapa_id, etapaCriada.id);

    const { data: checklistModelo } = await supabase
      .from("modelos_checklist_item")
      .select("*")
      .eq("modelo_etapa_id", eg.modelo_etapa_id)
      .order("ordem", { ascending: true });

    if (checklistModelo && checklistModelo.length > 0) {
      await supabase.from("checklist_itens").insert(
        checklistModelo.map((c) => ({
          etapa_id: etapaCriada.id,
          descricao: c.descricao,
          ordem: c.ordem,
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
