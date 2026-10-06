/**
 * Rotinas do Controle de Débitos que falam com o banco e com o e-mail:
 * geração das verificações do mês e envio das solicitações agrupadas
 * por administradora. Servem tanto às ações da tela (com o cliente do
 * usuário, sujeito às permissões) quanto à automação diária (cliente
 * de administrador, sem usuário).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, Tables } from "@/lib/database.types";
import { enviarEmail } from "@/lib/email";
import {
  agruparPorAdministradora,
  chaveVerificacao,
  competenciaDe,
  descreverUnidade,
  emailValido,
  montarMensagem,
  planejarGeracao,
  rotuloCompetencia,
  textoParaHtml,
  type MetodoConsulta,
  type UnidadeSolicitacao,
} from "./regras";

type Supabase = SupabaseClient<Database>;
export type Autor = { id: string; nome: string } | null;

export type ConfigDebitos = Tables<"debitos_config">;

const CONFIG_PADRAO = {
  geracao_automatica: true,
  dia_geracao: 1,
  periodicidade_condominio_meses: 1,
  periodicidade_iptu_meses: 1,
  envio_automatico: false,
  dia_envio: 5,
  email_assunto: null,
  email_modelo: null,
  email_responder_para: null,
  email_copia: null,
  dias_alerta_sem_resposta: 7,
  url_consulta_iptu: null,
  atualizado_por: null,
};

export async function obterConfigDebitos(supabase: Supabase, tenantId: string): Promise<ConfigDebitos> {
  const { data } = await supabase.from("debitos_config").select("*").eq("tenant_id", tenantId).maybeSingle();
  return data ?? { ...CONFIG_PADRAO, tenant_id: tenantId, atualizado_em: new Date().toISOString() };
}

export async function registrarEventoDebitos(
  supabase: Supabase,
  tenantId: string,
  autor: Autor,
  evento: {
    acao: string;
    descricao: string;
    contratoId?: string | null;
    verificacaoId?: string | null;
    administradoraId?: string | null;
    solicitacaoId?: string | null;
    anterior?: unknown;
    novo?: unknown;
  }
) {
  await supabase.from("debitos_eventos").insert({
    tenant_id: tenantId,
    acao: evento.acao,
    descricao: evento.descricao,
    contrato_id: evento.contratoId ?? null,
    verificacao_id: evento.verificacaoId ?? null,
    administradora_id: evento.administradoraId ?? null,
    solicitacao_id: evento.solicitacaoId ?? null,
    anterior: (evento.anterior ?? null) as Json,
    novo: (evento.novo ?? null) as Json,
    usuario_id: autor?.id ?? null,
    usuario_nome: autor?.nome ?? "Automação do Vitral",
  });
}

// ---------------------------------------------------------------
// geração das verificações da competência
// ---------------------------------------------------------------

export async function gerarCompetencia(
  supabase: Supabase,
  tenantId: string,
  competencia: string,
  opcoes: { autor: Autor; ignorarPeriodicidade?: boolean; config?: ConfigDebitos }
): Promise<{ criadas: number; erro?: string }> {
  const config = opcoes.config ?? (await obterConfigDebitos(supabase, tenantId));
  const [{ data: contratos, error: erroContratos }, { data: existentes, error: erroExistentes }] = await Promise.all([
    supabase.from("contratos_locacao").select("id, imovel_id, possui_condominio, administradora_id").eq("tenant_id", tenantId).eq("ativo", true),
    supabase.from("debitos_verificacoes").select("contrato_id, tipo").eq("tenant_id", tenantId).eq("competencia", competencia),
  ]);
  if (erroContratos || erroExistentes) return { criadas: 0, erro: (erroContratos ?? erroExistentes)?.message };

  const novas = planejarGeracao(
    contratos ?? [],
    competencia,
    new Set((existentes ?? []).map((v) => chaveVerificacao(v.contrato_id, v.tipo, competencia))),
    {
      periodicidadeCondominio: config.periodicidade_condominio_meses,
      periodicidadeIptu: config.periodicidade_iptu_meses,
      ignorarPeriodicidade: opcoes.ignorarPeriodicidade,
    }
  );
  if (novas.length === 0) return { criadas: 0 };

  // ignoreDuplicates: se duas execuções baterem ao mesmo tempo, a restrição
  // única do banco descarta a repetida em vez de dar erro.
  const { data: inseridas, error } = await supabase
    .from("debitos_verificacoes")
    .upsert(
      novas.map((n) => ({ ...n, tenant_id: tenantId, origem: opcoes.autor ? "manual" : "automatica" })),
      { onConflict: "contrato_id,tipo,competencia", ignoreDuplicates: true }
    )
    .select("id");
  if (error) return { criadas: 0, erro: error.message };

  const criadas = inseridas?.length ?? 0;
  if (criadas > 0) {
    await registrarEventoDebitos(supabase, tenantId, opcoes.autor, {
      acao: "competencia_gerada",
      descricao: `Conferências de ${rotuloCompetencia(competencia)} geradas: ${criadas} verificação(ões).`,
      novo: { competencia, criadas },
    });
  }
  return { criadas };
}

// ---------------------------------------------------------------
// envio das solicitações por e-mail
// ---------------------------------------------------------------

const MAX_TENTATIVAS_AUTOMATICAS = 3;

type VerificacaoComContrato = {
  id: string;
  contrato_id: string;
  status: string;
  solicitacao_id: string | null;
  contratos_locacao: {
    numero: string;
    condominio_nome: string | null;
    condominio_unidade: string | null;
    condominio_bloco: string | null;
    condominio_email: string | null;
    condominio_codigo_unidade: string | null;
    administradora_id: string | null;
    imoveis: { endereco: string } | null;
    condominio_administradoras: { id: string; nome: string; metodo_consulta: string; email_solicitacao: string | null; ativa: boolean } | null;
  } | null;
};

export type ResultadoEnvio = {
  enviadas: { administradora: string; destinatario: string; unidades: number }[];
  falhas: { administradora: string; destinatario: string; erro: string }[];
  semEnvio: { imovel: string; motivo: string }[];
};

function listaDeEmails(texto: string | null | undefined): string[] {
  return (texto ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim())
    .filter((e) => emailValido(e));
}

/**
 * Monta e envia um e-mail por administradora (com todas as unidades) e
 * registra tudo: mensagem enviada, destinatário, unidades, quem enviou e
 * o resultado. As unidades passam a "Aguardando administradora".
 *
 * - `verificacaoIds`: só essas (ação em lote ou por administradora).
 * - `somenteNaoSolicitadas`: pula o que já tem solicitação (automação).
 * - `destinatarioTeste`: envia só para este endereço e NÃO registra nem
 *   altera nada (botão "Enviar teste para mim").
 */
export async function enviarSolicitacoes(
  supabase: Supabase,
  tenantId: string,
  competencia: string,
  opcoes: {
    autor: Autor;
    origem: "manual" | "automatica";
    verificacaoIds?: string[];
    administradoraId?: string;
    somenteNaoSolicitadas?: boolean;
    /** só administradoras cujo método é "consulta por e-mail" (padrão na automação) */
    somenteMetodoEmail?: boolean;
    destinatarioTeste?: string;
    config?: ConfigDebitos;
  }
): Promise<ResultadoEnvio> {
  const resultado: ResultadoEnvio = { enviadas: [], falhas: [], semEnvio: [] };
  const config = opcoes.config ?? (await obterConfigDebitos(supabase, tenantId));

  let consulta = supabase
    .from("debitos_verificacoes")
    .select(
      `id, contrato_id, status, solicitacao_id,
       contratos_locacao ( numero, condominio_nome, condominio_unidade, condominio_bloco, condominio_email, condominio_codigo_unidade, administradora_id,
         imoveis ( endereco ),
         condominio_administradoras ( id, nome, metodo_consulta, email_solicitacao, ativa ) )`
    )
    .eq("tenant_id", tenantId)
    .eq("competencia", competencia)
    .eq("tipo", "condominio")
    .in("status", ["pendente", "aguardando_administradora"]);
  if (opcoes.verificacaoIds) consulta = consulta.in("id", opcoes.verificacaoIds);
  const { data, error } = await consulta;
  if (error) {
    resultado.falhas.push({ administradora: "—", destinatario: "—", erro: error.message });
    return resultado;
  }

  const unidades: UnidadeSolicitacao[] = [];
  for (const v of (data ?? []) as unknown as VerificacaoComContrato[]) {
    const c = v.contratos_locacao;
    if (!c) continue;
    const adm = c.condominio_administradoras;
    if (opcoes.administradoraId && adm?.id !== opcoes.administradoraId) continue;
    if (opcoes.somenteNaoSolicitadas && (v.solicitacao_id || v.status !== "pendente")) continue;
    unidades.push({
      verificacaoId: v.id,
      contratoId: v.contrato_id,
      imovel: c.imoveis?.endereco ?? c.numero,
      condominioNome: c.condominio_nome,
      bloco: c.condominio_bloco,
      unidade: c.condominio_unidade,
      codigoUnidade: c.condominio_codigo_unidade,
      administradoraId: adm && adm.ativa ? adm.id : null,
      administradoraNome: adm?.nome ?? null,
      metodo: (adm?.metodo_consulta ?? null) as MetodoConsulta | null,
      emailAdministradora: adm?.email_solicitacao ?? null,
      emailUnidade: c.condominio_email,
    });
  }

  // Automação só fala com quem é consultado por e-mail; envio manual de
  // selecionados aceita qualquer administradora que tenha e-mail.
  const { grupos, semEnvio } = agruparPorAdministradora(unidades, { somenteMetodoEmail: opcoes.somenteMetodoEmail ?? opcoes.origem === "automatica" });
  resultado.semEnvio = semEnvio.map((s) => ({ imovel: s.unidade.imovel, motivo: s.motivo }));

  const copia = listaDeEmails(config.email_copia);
  const responderPara = emailValido(config.email_responder_para) ? config.email_responder_para!.trim() : null;

  for (const grupo of grupos) {
    const { assunto, texto } = montarMensagem(config.email_modelo, config.email_assunto, {
      unidades: grupo.unidades,
      competencia,
      administradora: grupo.administradoraNome,
    });

    if (opcoes.destinatarioTeste) {
      try {
        await enviarEmail({
          destinatarios: [opcoes.destinatarioTeste],
          assunto: `[TESTE] ${assunto}`,
          html: textoParaHtml(`(Teste do Vitral — esta mensagem iria para ${grupo.destinatario}.)\n\n${texto}`),
          texto: `(Teste do Vitral — esta mensagem iria para ${grupo.destinatario}.)\n\n${texto}`,
          nomeRemetente: "Sacra Imóveis",
        });
        resultado.enviadas.push({ administradora: grupo.administradoraNome, destinatario: opcoes.destinatarioTeste, unidades: grupo.unidades.length });
      } catch (erro) {
        resultado.falhas.push({ administradora: grupo.administradoraNome, destinatario: opcoes.destinatarioTeste, erro: erro instanceof Error ? erro.message : String(erro) });
      }
      continue;
    }

    if (opcoes.origem === "automatica") {
      const { count } = await supabase
        .from("debitos_solicitacoes")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("competencia", competencia)
        .eq("administradora_id", grupo.administradoraId)
        .eq("destinatario", grupo.destinatario)
        .eq("origem", "automatica")
        .eq("status", "falha");
      if ((count ?? 0) >= MAX_TENTATIVAS_AUTOMATICAS) {
        resultado.falhas.push({ administradora: grupo.administradoraNome, destinatario: grupo.destinatario, erro: "limite de tentativas automáticas atingido" });
        continue;
      }
    }

    let erroEnvio: string | null = null;
    try {
      await enviarEmail({
        destinatarios: [grupo.destinatario],
        copia,
        responderPara,
        assunto,
        html: textoParaHtml(texto),
        texto,
        nomeRemetente: "Sacra Imóveis",
      });
    } catch (erro) {
      erroEnvio = erro instanceof Error ? erro.message : String(erro);
    }

    const { data: solicitacao, error: erroRegistro } = await supabase
      .from("debitos_solicitacoes")
      .insert({
        tenant_id: tenantId,
        administradora_id: grupo.administradoraId,
        administradora_nome: grupo.administradoraNome,
        competencia,
        destinatario: grupo.destinatario,
        copia: copia.join(", ") || null,
        assunto,
        mensagem: texto,
        status: erroEnvio ? "falha" : "enviado",
        origem: opcoes.origem,
        erro: erroEnvio,
        enviado_por: opcoes.autor?.id ?? null,
        enviado_por_nome: opcoes.autor?.nome ?? "Automação do Vitral",
      })
      .select("id")
      .single();

    if (solicitacao) {
      await supabase.from("debitos_solicitacao_itens").insert(
        grupo.unidades.map((u) => ({
          solicitacao_id: solicitacao.id,
          verificacao_id: u.verificacaoId,
          contrato_id: u.contratoId,
          descricao_unidade: descreverUnidade(u),
        }))
      );
      if (!erroEnvio) {
        await supabase
          .from("debitos_verificacoes")
          .update({ status: "aguardando_administradora", solicitacao_id: solicitacao.id })
          .in(
            "id",
            grupo.unidades.map((u) => u.verificacaoId)
          );
      }
      await registrarEventoDebitos(supabase, tenantId, opcoes.autor, {
        acao: erroEnvio ? "solicitacao_falhou" : "solicitacao_enviada",
        descricao: erroEnvio
          ? `Falha ao enviar a solicitação de ${rotuloCompetencia(competencia)} para ${grupo.administradoraNome}.`
          : `Solicitação de ${rotuloCompetencia(competencia)} enviada para ${grupo.administradoraNome} (${grupo.unidades.length} unidade(s)).`,
        administradoraId: grupo.administradoraId,
        solicitacaoId: solicitacao.id,
        novo: { destinatario: grupo.destinatario, unidades: grupo.unidades.length, origem: opcoes.origem, erro: erroEnvio },
      });
    }

    if (erroEnvio) resultado.falhas.push({ administradora: grupo.administradoraNome, destinatario: grupo.destinatario, erro: erroEnvio });
    else if (erroRegistro) resultado.falhas.push({ administradora: grupo.administradoraNome, destinatario: grupo.destinatario, erro: `e-mail enviado, mas o registro falhou: ${erroRegistro.message}` });
    else resultado.enviadas.push({ administradora: grupo.administradoraNome, destinatario: grupo.destinatario, unidades: grupo.unidades.length });
  }
  return resultado;
}

// ---------------------------------------------------------------
// automação diária (chamada pelo agendamento)
// ---------------------------------------------------------------

export async function rotinaDiariaDebitos(supabaseAdmin: Supabase, hojeIso: string) {
  const dia = Number(hojeIso.slice(8, 10));
  const competencia = competenciaDe(hojeIso);
  const { data: configs } = await supabaseAdmin.from("debitos_config").select("*");
  const resultados: { tenantId: string; criadas: number; enviadas: number; falhas: number; erro?: string }[] = [];

  for (const config of configs ?? []) {
    let criadas = 0;
    let enviadas = 0;
    let falhas = 0;
    let erro: string | undefined;
    try {
      if (config.geracao_automatica && dia >= config.dia_geracao) {
        const geracao = await gerarCompetencia(supabaseAdmin, config.tenant_id, competencia, { autor: null, config });
        criadas = geracao.criadas;
        erro = geracao.erro;
      }
      if (config.envio_automatico && dia >= config.dia_envio) {
        const envio = await enviarSolicitacoes(supabaseAdmin, config.tenant_id, competencia, {
          autor: null,
          origem: "automatica",
          somenteNaoSolicitadas: true,
          config,
        });
        enviadas = envio.enviadas.length;
        falhas = envio.falhas.length;
      }
    } catch (e) {
      erro = e instanceof Error ? e.message : String(e);
    }
    resultados.push({ tenantId: config.tenant_id, criadas, enviadas, falhas, erro });
  }
  return resultados;
}
