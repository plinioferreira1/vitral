"use server";

import { revalidatePath } from "next/cache";
import { avisar, checar } from "@/lib/aviso";
import { hojeISO } from "@/lib/data-br";
import type { TablesUpdate } from "@/lib/database.types";
import {
  METODOS_CONSULTA,
  PERIODICIDADES,
  ROTULO_STATUS,
  ROTULO_TIPO,
  STATUS_VERIFICACAO,
  TIPOS_VERIFICACAO,
  competenciaDe,
  emailValido,
  normalizarCompetencia,
  podeMarcarSemDebitoEmLote,
  rotuloCompetencia,
  type StatusVerificacao,
  type TipoVerificacao,
} from "@/lib/debitos/regras";
import { enviarSolicitacoes, gerarCompetencia, registrarEventoDebitos, type Autor, type ResultadoEnvio } from "@/lib/debitos/rotina";
import { normalizarData } from "@/lib/fatura-csv";
import { moedaParaNumero } from "@/lib/moeda";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/usuario-atual";
import { BUCKET_DEBITOS, carregarPermissoes } from "./dados";

// ---------------------------------------------------------------
// utilidades
// ---------------------------------------------------------------

function texto(formData: FormData, nome: string, limite = 2000): string {
  return String(formData.get(nome) ?? "").trim().slice(0, limite);
}
function textoOuNull(formData: FormData, nome: string, limite = 2000): string | null {
  return texto(formData, nome, limite) || null;
}
function daLista<T extends string>(lista: readonly T[], valor: unknown): T | null {
  return (lista as readonly string[]).includes(String(valor)) ? (String(valor) as T) : null;
}
function urlOuNull(formData: FormData, nome: string): string | null {
  const valor = texto(formData, nome, 600);
  if (!valor) return null;
  return /^https?:\/\//i.test(valor) ? valor : `https://${valor}`;
}

async function contexto(exigir: "operar" | "configurar" = "operar") {
  const sessao = await exigirUsuario();
  if (!sessao) return null;
  const supabase = await createClient();
  const perms = await carregarPermissoes(supabase, sessao.userId, sessao.nivel);
  if (!perms[exigir]) {
    await avisar("erro", exigir === "configurar" ? "Só diretor ou gerente alteram a automação." : "Você não tem permissão para alterar o Controle de Débitos.");
    return null;
  }
  const autor: NonNullable<Autor> = { id: sessao.userId, nome: sessao.usuario.nome };
  return { sessao, supabase, tenantId: sessao.tenantId, autor };
}
type Contexto = NonNullable<Awaited<ReturnType<typeof contexto>>>;

function atualizarTelas() {
  revalidatePath("/locacao/debitos");
  revalidatePath("/");
}

function resumoEnvio(r: ResultadoEnvio): { tipo: "sucesso" | "erro"; mensagem: string } {
  const partes: string[] = [];
  if (r.enviadas.length) partes.push(`${r.enviadas.length} e-mail(s) enviado(s), ${r.enviadas.reduce((s, e) => s + e.unidades, 0)} unidade(s).`);
  if (r.falhas.length) partes.push(`${r.falhas.length} falha(s): ${r.falhas[0].administradora} — ${r.falhas[0].erro}`);
  if (r.semEnvio.length) partes.push(`${r.semEnvio.length} unidade(s) ficaram de fora (${r.semEnvio[0].motivo}${r.semEnvio.length > 1 ? ", entre outros motivos" : ""}).`);
  if (partes.length === 0) partes.push("Nenhuma unidade pendente para solicitar.");
  return { tipo: r.enviadas.length > 0 ? "sucesso" : "erro", mensagem: partes.join(" ") };
}

// ---------------------------------------------------------------
// competência
// ---------------------------------------------------------------

export async function gerarCompetenciaManual(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const competencia = normalizarCompetencia(formData.get("competencia"));
  if (!competencia) return;
  const r = await gerarCompetencia(ctx.supabase, ctx.tenantId, competencia, { autor: ctx.autor, ignorarPeriodicidade: true });
  atualizarTelas();
  if (r.erro) await avisar("erro", `Não foi possível gerar as conferências: ${r.erro}`);
  else await avisar("sucesso", r.criadas > 0 ? `${r.criadas} conferência(s) criada(s) para ${rotuloCompetencia(competencia)}.` : "Nada a criar: a competência já estava completa.");
}

// ---------------------------------------------------------------
// conferência de uma unidade
// ---------------------------------------------------------------

async function obterOuCriarVerificacao(ctx: Contexto, contratoId: string, tipo: TipoVerificacao, competencia: string) {
  const { data: existente } = await ctx.supabase
    .from("debitos_verificacoes")
    .select("*")
    .eq("contrato_id", contratoId)
    .eq("tipo", tipo)
    .eq("competencia", competencia)
    .maybeSingle();
  if (existente) return existente;
  const { data: contrato } = await ctx.supabase.from("contratos_locacao").select("imovel_id, administradora_id").eq("id", contratoId).maybeSingle();
  if (!contrato) return null;
  await ctx.supabase
    .from("debitos_verificacoes")
    .upsert(
      {
        tenant_id: ctx.tenantId,
        contrato_id: contratoId,
        imovel_id: contrato.imovel_id,
        tipo,
        competencia,
        status: "pendente",
        administradora_id: tipo === "condominio" ? contrato.administradora_id : null,
        origem: "manual",
      },
      { onConflict: "contrato_id,tipo,competencia", ignoreDuplicates: true }
    );
  const { data: criada } = await ctx.supabase
    .from("debitos_verificacoes")
    .select("*")
    .eq("contrato_id", contratoId)
    .eq("tipo", tipo)
    .eq("competencia", competencia)
    .maybeSingle();
  return criada;
}

function camposDebito(formData: FormData) {
  const valorBruto = String(formData.get("debito_valor") ?? "").trim();
  return {
    valor: valorBruto ? moedaParaNumero(valorBruto) : null,
    vencimento: texto(formData, "debito_vencimento", 20) ? normalizarData(texto(formData, "debito_vencimento", 20)) : null,
    referencia: textoOuNull(formData, "debito_referencia", 60),
    parcela: textoOuNull(formData, "debito_parcela", 60),
    descricao: textoOuNull(formData, "debito_descricao", 300),
    situacao: textoOuNull(formData, "debito_situacao", 120),
    observacao: textoOuNull(formData, "debito_observacao", 800),
    anexo_caminho: textoOuNull(formData, "anexo_caminho", 400),
    anexo_nome: textoOuNull(formData, "anexo_nome", 200),
  };
}

function debitoPreenchido(d: ReturnType<typeof camposDebito>): boolean {
  return !!(d.valor || d.vencimento || d.referencia || d.parcela || d.descricao || d.anexo_caminho);
}

/** Registra o resultado da conferência (e, se houver, o débito encontrado). */
export async function registrarConferencia(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const contratoId = texto(formData, "contrato_id", 40);
  const tipo = daLista(TIPOS_VERIFICACAO, formData.get("tipo"));
  const competencia = normalizarCompetencia(formData.get("competencia"));
  const status = daLista(STATUS_VERIFICACAO, formData.get("status"));
  if (!contratoId || !tipo || !competencia || !status) {
    await avisar("erro", "Escolha a situação da conferência.");
    return;
  }
  if (tipo === "iptu_tlp" && status === "aguardando_administradora") return;

  const verificacao = await obterOuCriarVerificacao(ctx, contratoId, tipo, competencia);
  if (!verificacao) {
    await avisar("erro", "Não foi possível localizar o contrato.");
    return;
  }
  const debito = camposDebito(formData);
  const { count: debitosLancados } = await ctx.supabase.from("debitos_itens").select("id", { count: "exact", head: true }).eq("verificacao_id", verificacao.id);

  if (status !== "com_debitos" && (debitosLancados ?? 0) > 0) {
    await avisar("erro", "Há débitos lançados nesta conferência. Remova-os antes de mudar a situação.");
    return;
  }
  if (status === "com_debitos" && (debitosLancados ?? 0) === 0 && !debitoPreenchido(debito)) {
    await avisar("erro", "Informe ao menos o valor, o vencimento ou a descrição do débito.");
    return;
  }
  if (debito.anexo_caminho && !debito.anexo_caminho.startsWith(`${ctx.tenantId}/${contratoId}/`)) debito.anexo_caminho = null;

  const concluida = status === "sem_debitos" || status === "com_debitos" || status === "nao_se_aplica";
  const observacao = textoOuNull(formData, "observacao", 1000);
  const patch: TablesUpdate<"debitos_verificacoes"> = {
    status,
    observacao,
    verificado_por: concluida ? ctx.autor.id : null,
    verificado_por_nome: concluida ? ctx.autor.nome : null,
    verificado_em: concluida ? new Date().toISOString() : null,
  };
  if (!(await checar(ctx.supabase.from("debitos_verificacoes").update(patch).eq("id", verificacao.id), "registrar a conferência"))) return;

  if (status === "com_debitos" && debitoPreenchido(debito)) {
    const ok = await checar(
      ctx.supabase.from("debitos_itens").insert({ ...debito, tenant_id: ctx.tenantId, verificacao_id: verificacao.id, criado_por: ctx.autor.id, criado_por_nome: ctx.autor.nome }),
      "lançar o débito"
    );
    if (ok) {
      await registrarEventoDebitos(ctx.supabase, ctx.tenantId, ctx.autor, {
        acao: "debito_cadastrado",
        descricao: `Débito de ${ROTULO_TIPO[tipo]} lançado em ${rotuloCompetencia(competencia)}.`,
        contratoId,
        verificacaoId: verificacao.id,
        novo: debito,
      });
      if (debito.anexo_caminho) {
        await registrarEventoDebitos(ctx.supabase, ctx.tenantId, ctx.autor, {
          acao: "anexo_inserido",
          descricao: `Anexo "${debito.anexo_nome ?? "documento"}" inserido.`,
          contratoId,
          verificacaoId: verificacao.id,
        });
      }
    }
  }
  if (verificacao.status !== status || (verificacao.observacao ?? null) !== observacao) {
    await registrarEventoDebitos(ctx.supabase, ctx.tenantId, ctx.autor, {
      acao: verificacao.status !== status ? "status_alterado" : "consulta_realizada",
      descricao: `${ROTULO_TIPO[tipo]} de ${rotuloCompetencia(competencia)}: ${ROTULO_STATUS[status]}.`,
      contratoId,
      verificacaoId: verificacao.id,
      anterior: { status: verificacao.status, observacao: verificacao.observacao },
      novo: { status, observacao },
    });
  }
  atualizarTelas();
  await avisar("sucesso", `${ROTULO_TIPO[tipo]}: ${ROTULO_STATUS[status].toLowerCase()}.`);
}

export async function removerDebito(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const { data: item } = await ctx.supabase.from("debitos_itens").select("*, debitos_verificacoes ( contrato_id, tipo, competencia )").eq("id", texto(formData, "item_id", 40)).maybeSingle();
  if (!item) return;
  if (!(await checar(ctx.supabase.from("debitos_itens").delete().eq("id", item.id), "remover o débito"))) return;
  if (item.anexo_caminho) await ctx.supabase.storage.from(BUCKET_DEBITOS).remove([item.anexo_caminho]);
  const verificacao = item.debitos_verificacoes as unknown as { contrato_id: string; tipo: string; competencia: string } | null;
  const { count } = await ctx.supabase.from("debitos_itens").select("id", { count: "exact", head: true }).eq("verificacao_id", item.verificacao_id);
  if ((count ?? 0) === 0) {
    await ctx.supabase
      .from("debitos_verificacoes")
      .update({ status: "pendente", verificado_por: null, verificado_por_nome: null, verificado_em: null })
      .eq("id", item.verificacao_id)
      .eq("status", "com_debitos");
  }
  await registrarEventoDebitos(ctx.supabase, ctx.tenantId, ctx.autor, {
    acao: "debito_removido",
    descricao: "Débito removido/corrigido.",
    contratoId: verificacao?.contrato_id,
    verificacaoId: item.verificacao_id,
    anterior: { valor: item.valor, vencimento: item.vencimento, referencia: item.referencia, parcela: item.parcela, descricao: item.descricao, situacao: item.situacao },
  });
  atualizarTelas();
  await avisar("sucesso", (count ?? 0) === 0 ? "Débito removido. A conferência voltou a pendente: registre a situação correta." : "Débito removido.");
}

// ---------------------------------------------------------------
// vínculo do imóvel com o condomínio e inscrição do imóvel
// ---------------------------------------------------------------

export async function salvarVinculoCondominio(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const contratoId = texto(formData, "contrato_id", 40);
  const { data: atual } = await ctx.supabase
    .from("contratos_locacao")
    .select("imovel_id, possui_condominio, administradora_id, condominio_nome, condominio_unidade, condominio_bloco, condominio_email, condominio_codigo_unidade, condominio_observacoes, iptu_inscricao")
    .eq("id", contratoId)
    .maybeSingle();
  if (!atual) return;

  const possui = formData.get("possui_condominio") === "sim" ? true : formData.get("possui_condominio") === "nao" ? false : null;
  const email = textoOuNull(formData, "condominio_email", 200);
  if (email && !emailValido(email)) {
    await avisar("erro", "O e-mail específico da unidade não parece válido.");
    return;
  }
  const novo = {
    possui_condominio: possui,
    administradora_id: possui === false ? null : texto(formData, "administradora_id", 40) || null,
    condominio_nome: textoOuNull(formData, "condominio_nome", 200),
    condominio_unidade: textoOuNull(formData, "condominio_unidade", 60),
    condominio_bloco: textoOuNull(formData, "condominio_bloco", 60),
    condominio_email: email,
    condominio_codigo_unidade: textoOuNull(formData, "condominio_codigo_unidade", 80),
    condominio_observacoes: textoOuNull(formData, "condominio_observacoes", 1000),
  };
  if (!(await checar(ctx.supabase.from("contratos_locacao").update(novo).eq("id", contratoId), "salvar o condomínio"))) return;

  // Inscrição do imóvel no DF: fica no cadastro do imóvel (e espelhada no contrato).
  if (formData.has("inscricao_iptu")) {
    const inscricao = textoOuNull(formData, "inscricao_iptu", 40);
    if (atual.imovel_id) await ctx.supabase.from("imoveis").update({ inscricao_iptu: inscricao }).eq("id", atual.imovel_id);
    if (inscricao !== (atual.iptu_inscricao ?? null)) await ctx.supabase.from("contratos_locacao").update({ iptu_inscricao: inscricao }).eq("id", contratoId);
  }

  // Conferências em aberto (deste mês em diante) acompanham o novo vínculo;
  // as já concluídas e as de meses anteriores não são tocadas.
  const competenciaAtual = competenciaDe(hojeISO());
  const abertas = ctx.supabase.from("debitos_verificacoes").update({ administradora_id: novo.administradora_id, status: possui === false ? "nao_se_aplica" : "pendente" });
  await abertas
    .eq("contrato_id", contratoId)
    .eq("tipo", "condominio")
    .gte("competencia", competenciaAtual)
    .is("verificado_em", null)
    .in("status", possui === false ? ["pendente"] : ["pendente", "nao_se_aplica"]);

  const { administradora_id: admAnterior } = atual;
  await registrarEventoDebitos(ctx.supabase, ctx.tenantId, ctx.autor, {
    acao: admAnterior !== novo.administradora_id ? "administradora_alterada" : "condominio_editado",
    descricao: admAnterior !== novo.administradora_id ? "Administradora do condomínio alterada." : "Dados do condomínio editados.",
    contratoId,
    anterior: { ...atual, imovel_id: undefined, iptu_inscricao: undefined },
    novo,
  });
  atualizarTelas();
  revalidatePath(`/locacao/${contratoId}`);
  await avisar("sucesso", "Condomínio salvo.");
}

// ---------------------------------------------------------------
// ações em lote
// ---------------------------------------------------------------

async function marcarEmLote(ctx: Contexto, contratoIds: string[], competencia: string, tipos: TipoVerificacao[], status: StatusVerificacao) {
  let alteradas = 0;
  let puladas = 0;
  for (const contratoId of contratoIds) {
    for (const tipo of tipos) {
      const v = await obterOuCriarVerificacao(ctx, contratoId, tipo, competencia);
      if (!v) continue;
      if (v.status === status) continue;
      // "Não se aplica" é uma decisão cadastral e não deve virar
      // "sem débitos" por uma ação rápida ou em lote.
      if (status === "sem_debitos" && !podeMarcarSemDebitoEmLote(v.status as StatusVerificacao)) {
        if (v.status === "com_debitos") puladas++;
        continue;
      }
      const { error } = await ctx.supabase
        .from("debitos_verificacoes")
        .update({ status, verificado_por: ctx.autor.id, verificado_por_nome: ctx.autor.nome, verificado_em: new Date().toISOString() })
        .eq("id", v.id);
      if (error) continue;
      alteradas++;
      await registrarEventoDebitos(ctx.supabase, ctx.tenantId, ctx.autor, {
        acao: "status_alterado",
        descricao: `${ROTULO_TIPO[tipo]} de ${rotuloCompetencia(competencia)}: ${ROTULO_STATUS[status]} (ação em lote).`,
        contratoId,
        verificacaoId: v.id,
        anterior: { status: v.status },
        novo: { status },
      });
    }
  }
  return { alteradas, puladas };
}

export async function acaoEmLote(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const competencia = normalizarCompetencia(formData.get("competencia"));
  const acao = texto(formData, "acao", 40);
  let contratoIds = [...new Set(formData.getAll("contratos").map(String).filter(Boolean))].slice(0, 300);
  const administradoraLote = texto(formData, "administradora_lote", 40);
  if (!competencia) return;

  // ação por administradora: todas as unidades dela na competência
  if (administradoraLote) {
    const { data } = await ctx.supabase.from("debitos_verificacoes").select("contrato_id").eq("competencia", competencia).eq("tipo", "condominio").eq("administradora_id", administradoraLote);
    contratoIds = [...new Set((data ?? []).map((v) => v.contrato_id))];
  }
  if (contratoIds.length === 0) {
    await avisar("erro", "Selecione ao menos um imóvel.");
    return;
  }

  if (acao === "cond_sem_debito" || acao === "iptu_sem_debito" || acao === "ambos_sem_debito") {
    const tipos: TipoVerificacao[] = acao === "cond_sem_debito" ? ["condominio"] : acao === "iptu_sem_debito" ? ["iptu_tlp"] : ["condominio", "iptu_tlp"];
    const r = await marcarEmLote(ctx, contratoIds, competencia, tipos, "sem_debitos");
    atualizarTelas();
    await avisar("sucesso", `${r.alteradas} conferência(s) registrada(s) como sem débitos.${r.puladas ? ` ${r.puladas} com débito lançado não foram alteradas.` : ""}`);
    return;
  }

  if (acao === "enviar_solicitacao") {
    const { data } = await ctx.supabase.from("debitos_verificacoes").select("id").eq("competencia", competencia).eq("tipo", "condominio").in("contrato_id", contratoIds);
    const r = await enviarSolicitacoes(ctx.supabase, ctx.tenantId, competencia, { autor: ctx.autor, origem: "manual", verificacaoIds: (data ?? []).map((v) => v.id) });
    atualizarTelas();
    const resumo = resumoEnvio(r);
    await avisar(resumo.tipo, resumo.mensagem);
    return;
  }

  if (acao === "alterar_administradora") {
    const novaId = texto(formData, "nova_administradora_id", 40) || null;
    if (!novaId) {
      await avisar("erro", "Escolha a administradora de destino.");
      return;
    }
    const { data: anteriores } = await ctx.supabase.from("contratos_locacao").select("id, administradora_id").in("id", contratoIds);
    if (!(await checar(ctx.supabase.from("contratos_locacao").update({ administradora_id: novaId, possui_condominio: true }).in("id", contratoIds), "alterar a administradora"))) return;
    await ctx.supabase
      .from("debitos_verificacoes")
      .update({ administradora_id: novaId, status: "pendente" })
      .in("contrato_id", contratoIds)
      .eq("tipo", "condominio")
      .gte("competencia", competenciaDe(hojeISO()))
      .is("verificado_em", null)
      .in("status", ["pendente", "nao_se_aplica"]);
    for (const c of anteriores ?? []) {
      if (c.administradora_id === novaId) continue;
      await registrarEventoDebitos(ctx.supabase, ctx.tenantId, ctx.autor, {
        acao: "administradora_alterada",
        descricao: "Administradora do condomínio alterada (ação em lote).",
        contratoId: c.id,
        administradoraId: novaId,
        anterior: { administradora_id: c.administradora_id },
        novo: { administradora_id: novaId },
      });
    }
    atualizarTelas();
    await avisar("sucesso", `Administradora alterada em ${contratoIds.length} imóvel(is).`);
    return;
  }
  await avisar("erro", "Escolha a ação em lote.");
}

// ---------------------------------------------------------------
// solicitações por e-mail
// ---------------------------------------------------------------

export async function enviarSolicitacaoAgora(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const competencia = normalizarCompetencia(formData.get("competencia"));
  if (!competencia) return;
  const administradoraId = texto(formData, "administradora_id", 40) || undefined;
  const teste = formData.get("modo") === "teste";
  const emailUsuario = ctx.sessao.user.email;
  if (teste && !emailUsuario) {
    await avisar("erro", "Seu usuário não tem e-mail para receber o teste.");
    return;
  }
  const r = await enviarSolicitacoes(ctx.supabase, ctx.tenantId, competencia, {
    autor: ctx.autor,
    origem: "manual",
    administradoraId,
    // "Enviar todas" segue a regra da automação: só quem é consultado por e-mail
    somenteNaoSolicitadas: !administradoraId && !teste,
    somenteMetodoEmail: !administradoraId,
    destinatarioTeste: teste ? emailUsuario : undefined,
  });
  // sem administradora escolhida, administradoras de portal/outro ficam de fora sem virar "falha"
  if (!administradoraId) r.semEnvio = r.semEnvio.filter((s) => s.motivo !== "administradora não é consultada por e-mail");
  atualizarTelas();
  const resumo = resumoEnvio(r);
  await avisar(resumo.tipo, teste ? `Teste: ${resumo.mensagem} Nada foi registrado nem enviado às administradoras.` : resumo.mensagem);
}

/** Lança, unidade por unidade, o que a administradora respondeu. */
export async function registrarResposta(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const { data: solicitacao } = await ctx.supabase
    .from("debitos_solicitacoes")
    .select("*, itens:debitos_solicitacao_itens ( * )")
    .eq("id", texto(formData, "solicitacao_id", 40))
    .maybeSingle();
  if (!solicitacao) return;
  const itens = (solicitacao.itens ?? []) as { id: string; verificacao_id: string | null; contrato_id: string | null; resultado: string | null }[];
  let semDebito = 0;
  let comDebito = 0;
  let naoInformado = 0;
  const agora = new Date().toISOString();

  for (const item of itens) {
    const resultado = daLista(["sem_debito", "com_debito", "nao_informado"] as const, formData.get(`resultado_${item.id}`));
    if (!resultado) {
      if (item.resultado === null || item.resultado === "nao_informado") naoInformado++;
      continue;
    }
    await ctx.supabase.from("debitos_solicitacao_itens").update({ resultado }).eq("id", item.id);
    if (resultado === "nao_informado") {
      naoInformado++;
      continue;
    }
    if (resultado === "sem_debito") semDebito++;
    else comDebito++;
    if (!item.verificacao_id) continue;
    const { data: v } = await ctx.supabase.from("debitos_verificacoes").select("status").eq("id", item.verificacao_id).maybeSingle();
    const novoStatus: StatusVerificacao = resultado === "sem_debito" ? "sem_debitos" : "com_debitos";
    if (!v || v.status === novoStatus) continue;
    // "sem débito" não apaga um débito que alguém já detalhou
    if (resultado === "sem_debito" && v.status === "com_debitos") continue;
    await ctx.supabase
      .from("debitos_verificacoes")
      .update({ status: novoStatus, verificado_por: ctx.autor.id, verificado_por_nome: ctx.autor.nome, verificado_em: agora })
      .eq("id", item.verificacao_id);
    await registrarEventoDebitos(ctx.supabase, ctx.tenantId, ctx.autor, {
      acao: "status_alterado",
      descricao: `Condomínio de ${rotuloCompetencia(solicitacao.competencia)}: ${ROTULO_STATUS[novoStatus]} (resposta da administradora).`,
      contratoId: item.contrato_id,
      verificacaoId: item.verificacao_id,
      solicitacaoId: solicitacao.id,
      anterior: { status: v.status },
      novo: { status: novoStatus },
    });
  }

  const status = naoInformado === 0 ? "conferido" : "respondido";
  await checar(
    ctx.supabase
      .from("debitos_solicitacoes")
      .update({ status, respondido_por: ctx.autor.id, respondido_em: agora, resposta_observacao: textoOuNull(formData, "resposta_observacao", 2000) })
      .eq("id", solicitacao.id),
    "registrar a resposta"
  );
  await registrarEventoDebitos(ctx.supabase, ctx.tenantId, ctx.autor, {
    acao: "resposta_registrada",
    descricao: `Resposta de ${solicitacao.administradora_nome} registrada: ${semDebito} sem débito, ${comDebito} com débito, ${naoInformado} não informado.`,
    administradoraId: solicitacao.administradora_id,
    solicitacaoId: solicitacao.id,
    anterior: { status: solicitacao.status },
    novo: { status, semDebito, comDebito, naoInformado },
  });
  atualizarTelas();
  await avisar("sucesso", `Resposta registrada.${comDebito ? ` ${comDebito} unidade(s) com débito: abra cada imóvel para lançar valor e vencimento.` : ""}`);
}

// ---------------------------------------------------------------
// administradoras
// ---------------------------------------------------------------

export async function salvarAdministradora(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const id = texto(formData, "id", 40);
  const nome = texto(formData, "nome", 200);
  const metodo = daLista(METODOS_CONSULTA, formData.get("metodo_consulta")) ?? "email";
  const email = textoOuNull(formData, "email_solicitacao", 200)?.toLowerCase() ?? null;
  if (!nome) {
    await avisar("erro", "Informe o nome da administradora.");
    return;
  }
  if (email && !emailValido(email)) {
    await avisar("erro", "O e-mail para solicitação de débitos não parece válido.");
    return;
  }
  const campos = {
    nome,
    cnpj: textoOuNull(formData, "cnpj", 30),
    telefone: textoOuNull(formData, "telefone", 80),
    email_solicitacao: email,
    site: urlOuNull(formData, "site"),
    metodo_consulta: metodo,
    portal_url: urlOuNull(formData, "portal_url"),
    portal_orientacoes: textoOuNull(formData, "portal_orientacoes", 1500),
    portal_identificacao: textoOuNull(formData, "portal_identificacao", 300),
    portal_login_proprio: formData.get("portal_login_proprio") === "on",
    observacoes: textoOuNull(formData, "observacoes", 1500),
    ativa: id ? formData.get("ativa") === "on" : true,
    atualizado_em: new Date().toISOString(),
  };
  if (id) {
    const { data: anterior } = await ctx.supabase.from("condominio_administradoras").select("*").eq("id", id).maybeSingle();
    if (!(await checar(ctx.supabase.from("condominio_administradoras").update(campos).eq("id", id), "salvar a administradora"))) return;
    await registrarEventoDebitos(ctx.supabase, ctx.tenantId, ctx.autor, {
      acao: "administradora_editada",
      descricao: `Administradora "${nome}" editada.`,
      administradoraId: id,
      anterior,
      novo: campos,
    });
  } else {
    const { data: criada, error } = await ctx.supabase
      .from("condominio_administradoras")
      .insert({ ...campos, tenant_id: ctx.tenantId, criado_por: ctx.autor.id })
      .select("id")
      .single();
    if (error || !criada) {
      await avisar("erro", error?.code === "23505" ? "Já existe uma administradora com esse nome." : `Não foi possível salvar: ${error?.message ?? "erro desconhecido"}`);
      return;
    }
    await registrarEventoDebitos(ctx.supabase, ctx.tenantId, ctx.autor, {
      acao: "administradora_criada",
      descricao: `Administradora "${nome}" cadastrada.`,
      administradoraId: criada.id,
      novo: campos,
    });
  }
  atualizarTelas();
  await avisar("sucesso", "Administradora salva.");
}

export async function excluirAdministradora(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const id = texto(formData, "id", 40);
  const [{ count: contratos }, { count: verificacoes }, { data: adm }] = await Promise.all([
    ctx.supabase.from("contratos_locacao").select("id", { count: "exact", head: true }).eq("administradora_id", id),
    ctx.supabase.from("debitos_verificacoes").select("id", { count: "exact", head: true }).eq("administradora_id", id),
    ctx.supabase.from("condominio_administradoras").select("nome").eq("id", id).maybeSingle(),
  ]);
  if ((contratos ?? 0) > 0 || (verificacoes ?? 0) > 0) {
    await avisar("erro", "Esta administradora tem imóveis ou conferências vinculados. Transfira os imóveis para outra ou desative-a.");
    return;
  }
  if (!(await checar(ctx.supabase.from("condominio_administradoras").delete().eq("id", id), "excluir a administradora"))) return;
  await registrarEventoDebitos(ctx.supabase, ctx.tenantId, ctx.autor, { acao: "administradora_excluida", descricao: `Administradora "${adm?.nome ?? ""}" excluída (não tinha imóveis vinculados).` });
  atualizarTelas();
  await avisar("sucesso", "Administradora excluída.");
}

// ---------------------------------------------------------------
// configuração da automação
// ---------------------------------------------------------------

export async function salvarConfigDebitos(formData: FormData) {
  const ctx = await contexto("configurar");
  if (!ctx) return;
  const dia = (nome: string, padrao: number) => Math.min(28, Math.max(1, Math.round(Number(formData.get(nome)) || padrao)));
  const periodicidade = (nome: string) => {
    const n = Number(formData.get(nome));
    return (PERIODICIDADES as readonly number[]).includes(n) ? n : 1;
  };
  const responder = textoOuNull(formData, "email_responder_para", 200);
  if (responder && !emailValido(responder)) {
    await avisar("erro", "O e-mail de resposta não parece válido.");
    return;
  }
  const urlIptu = textoOuNull(formData, "url_consulta_iptu", 400);
  if (urlIptu && !/^https:\/\//i.test(urlIptu)) {
    await avisar("erro", "O endereço do serviço de IPTU/TLP precisa começar com https://.");
    return;
  }
  const novo = {
    tenant_id: ctx.tenantId,
    geracao_automatica: formData.get("geracao_automatica") === "on",
    dia_geracao: dia("dia_geracao", 1),
    periodicidade_condominio_meses: periodicidade("periodicidade_condominio_meses"),
    periodicidade_iptu_meses: periodicidade("periodicidade_iptu_meses"),
    envio_automatico: formData.get("envio_automatico") === "on",
    dia_envio: dia("dia_envio", 5),
    email_assunto: textoOuNull(formData, "email_assunto", 200),
    email_modelo: textoOuNull(formData, "email_modelo", 6000),
    email_responder_para: responder,
    email_copia: textoOuNull(formData, "email_copia", 400),
    dias_alerta_sem_resposta: Math.min(60, Math.max(1, Math.round(Number(formData.get("dias_alerta_sem_resposta")) || 7))),
    url_consulta_iptu: urlIptu,
    atualizado_por: ctx.autor.id,
    atualizado_em: new Date().toISOString(),
  };
  const { data: anterior } = await ctx.supabase.from("debitos_config").select("*").eq("tenant_id", ctx.tenantId).maybeSingle();
  if (!(await checar(ctx.supabase.from("debitos_config").upsert(novo), "salvar a configuração"))) return;
  await registrarEventoDebitos(ctx.supabase, ctx.tenantId, ctx.autor, {
    acao: "configuracao_alterada",
    descricao: "Configuração da automação do Controle de Débitos alterada.",
    anterior,
    novo,
  });
  atualizarTelas();
  await avisar("sucesso", novo.envio_automatico ? `Configuração salva. O envio automático está ligado (a partir do dia ${novo.dia_envio} de cada mês).` : "Configuração salva. O envio automático está desligado.");
}
