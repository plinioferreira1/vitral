"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { hojeISO } from "@/lib/data-br";

// ---------------------------------------------------------
// Template fixo do processo de rescisão (baseado no organograma
// e no descritivo passado pelo Plínio). Cada rescisão nova recebe
// uma cópia dessas etapas + checklist.
// ---------------------------------------------------------

const TEMPLATE_RESCISAO: { nome: string; checklist: string[] }[] = [
  {
    nome: "Notificação de rescisão",
    checklist: [
      "Data do aviso registrada",
      "Comunicação recebida por canal com comprovação (e-mail)",
    ],
  },
  {
    nome: "Resposta formal ao inquilino",
    checklist: [
      "Enviada cópia do contrato de locação vigente",
      "Enviada cópia do laudo de vistoria de entrada",
      "Informado o prazo para desocupação e entrega das chaves",
      "Informado o valor da multa rescisória, se aplicável",
      "Avisado que aluguel, IPTU e condomínio continuam sendo cobrados durante o aviso prévio",
    ],
  },
  {
    nome: "Notificação ao proprietário",
    checklist: [
      "Informada a previsão de desocupação",
      "Informado que o imóvel pode ser reanunciado, salvo objeção do proprietário",
      "Alinhado que os encargos passam a ser do proprietário após a saída do inquilino",
    ],
  },
  {
    nome: "Confirmação da entrega das chaves",
    checklist: [
      "Contato feito cerca de 1 semana antes do fim do prazo",
      "Confirmado o dia exato da entrega das chaves",
      "Vistoria de saída agendada para o dia seguinte à entrega",
    ],
  },
  {
    nome: "Vistoria de saída",
    checklist: [
      "Vistoria realizada e comparada com o laudo de entrada",
      "Sem pendências — imóvel de acordo, considerando o desgaste natural",
      "Se houve reparos: inquilino avisado que aluguel e encargos continuam incidindo até o aceite",
      "Se houve vistoria extra por causa de reparos: cobrança repassada ao inquilino",
    ],
  },
  {
    nome: "Cálculo do boleto de encerramento",
    checklist: [
      "Valores proporcionais calculados até a data de encerramento",
      "Boleto emitido com vencimento em até 48h",
    ],
  },
  {
    nome: "Pagamento do boleto",
    checklist: ["Pagamento do boleto confirmado"],
  },
  {
    nome: "Assinatura do distrato e rescisão da garantia",
    checklist: [
      "Distrato assinado",
      "Se seguro fiança/fiador: rescisão comunicada ao responsável",
      "Se caução: valor de reembolso calculado e devolvido ao inquilino",
    ],
  },
  {
    nome: "Reavaliação do aluguel e novo anúncio (paralelo)",
    checklist: [
      "Proprietário autorizou reanunciar o imóvel",
      "Nova avaliação de valor de mercado feita",
      "Imóvel republicado nos portais",
    ],
  },
];

export async function iniciarRescisao(formData: FormData) {
  const supabase = await createClient();
  const contratoId = String(formData.get("contrato_id") ?? "");
  const dataAviso = String(formData.get("data_aviso") ?? "").trim();

  const { data: contrato } = await supabase
    .from("contratos_locacao")
    .select("tenant_id")
    .eq("id", contratoId)
    .single();

  if (!contrato) return;

  const { data: rescisao, error } = await supabase
    .from("rescisoes_locacao")
    .insert({
      tenant_id: contrato.tenant_id,
      contrato_id: contratoId,
      data_aviso: dataAviso || hojeISO(),
    })
    .select("id")
    .single();

  if (error || !rescisao) {
    revalidatePath(`/locacao/${contratoId}`);
    return;
  }

  for (let i = 0; i < TEMPLATE_RESCISAO.length; i++) {
    const etapaTemplate = TEMPLATE_RESCISAO[i];
    const { data: etapa } = await supabase
      .from("rescisao_etapas")
      .insert({
        rescisao_id: rescisao.id,
        nome: etapaTemplate.nome,
        ordem: i + 1,
      })
      .select("id")
      .single();

    if (etapa && etapaTemplate.checklist.length > 0) {
      await supabase.from("rescisao_checklist_itens").insert(
        etapaTemplate.checklist.map((descricao, j) => ({
          etapa_id: etapa.id,
          descricao,
          ordem: j + 1,
        }))
      );
    }
  }

  revalidatePath(`/locacao/${contratoId}`);
}

export async function alternarChecklistItemRescisao(formData: FormData) {
  const supabase = await createClient();
  const itemId = String(formData.get("item_id") ?? "");
  const contratoId = String(formData.get("contrato_id") ?? "");
  const concluidoAtual = formData.get("concluido_atual") === "true";

  await supabase
    .from("rescisao_checklist_itens")
    .update({ concluido: !concluidoAtual })
    .eq("id", itemId);

  revalidatePath(`/locacao/${contratoId}`);
}

export async function concluirEtapaRescisao(formData: FormData) {
  const supabase = await createClient();
  const etapaId = String(formData.get("etapa_id") ?? "");
  const rescisaoId = String(formData.get("rescisao_id") ?? "");
  const contratoId = String(formData.get("contrato_id") ?? "");

  await supabase
    .from("rescisao_etapas")
    .update({ status: "concluida", data_realizada: hojeISO() })
    .eq("id", etapaId);

  // Se essa era a última etapa pendente, fecha a rescisão inteira e
  // já encerra o contrato — igual ao que "encerrarContrato" faz.
  const { data: pendentes } = await supabase
    .from("rescisao_etapas")
    .select("id")
    .eq("rescisao_id", rescisaoId)
    .eq("status", "pendente");

  if (!pendentes || pendentes.length === 0) {
    await supabase
      .from("rescisoes_locacao")
      .update({ status: "concluida", concluida_em: new Date().toISOString() })
      .eq("id", rescisaoId);

    await supabase
      .from("contratos_locacao")
      .update({ ativo: false, data_encerramento: hojeISO() })
      .eq("id", contratoId);
  }

  revalidatePath(`/locacao/${contratoId}`);
  revalidatePath("/locacao");
}

export async function reabrirEtapaRescisao(formData: FormData) {
  const supabase = await createClient();
  const etapaId = String(formData.get("etapa_id") ?? "");
  const rescisaoId = String(formData.get("rescisao_id") ?? "");
  const contratoId = String(formData.get("contrato_id") ?? "");

  await supabase
    .from("rescisao_etapas")
    .update({ status: "pendente", data_realizada: null })
    .eq("id", etapaId);

  // Se a rescisão (e o encerramento do contrato) já tinham sido dados
  // como concluídos, reabrir uma etapa desfaz os dois — o processo
  // continua em andamento até tudo ser concluído de novo.
  const { data: rescisao } = await supabase
    .from("rescisoes_locacao")
    .select("status")
    .eq("id", rescisaoId)
    .single();

  if (rescisao?.status === "concluida") {
    await supabase
      .from("rescisoes_locacao")
      .update({ status: "em_andamento", concluida_em: null })
      .eq("id", rescisaoId);

    await supabase
      .from("contratos_locacao")
      .update({ ativo: true, data_encerramento: null })
      .eq("id", contratoId);
  }

  revalidatePath(`/locacao/${contratoId}`);
  revalidatePath("/locacao");
}
