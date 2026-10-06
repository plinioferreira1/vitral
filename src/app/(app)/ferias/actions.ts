"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { avisar } from "@/lib/aviso";
import { hojeISO } from "@/lib/data-br";
import {
  ACOES,
  calcularDatas,
  dataValida,
  notificacoesDaAcao,
  papelNaSolicitacao,
  periodoBR,
  podePedirAlteracao,
  transicao,
  validarPedido,
  type Acao,
  type Status,
} from "@/lib/ferias/regras";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/usuario-atual";
import { acessoFerias, regimeDe, saldosDe, type Solicitacao } from "./dados";

/**
 * Toda gravação de férias passa por aqui. A ação confere quem está
 * pedindo e se a etapa permite (regras em src/lib/ferias/regras.ts) e só
 * então grava com a chave do servidor — o usuário logado tem apenas
 * leitura nessas tabelas, então o histórico não pode ser alterado nem
 * apagado pelo navegador.
 */
async function contexto() {
  const sessao = await exigirUsuario();
  if (!sessao) return null;
  const supabase = await createClient();
  const acesso = await acessoFerias(supabase, sessao.userId, sessao.nivel);
  if (!acesso.liberado) {
    await avisar("erro", "O módulo de Férias ainda não está liberado para o seu acesso.");
    return null;
  }
  return { supabase, admin: createAdminClient(), acesso, tenantId: sessao.tenantId, autor: { id: sessao.userId, nome: sessao.usuario.nome } };
}
type Contexto = NonNullable<Awaited<ReturnType<typeof contexto>>>;

const txt = (f: FormData, nome: string, limite: number) => String(f.get(nome) ?? "").trim().slice(0, limite);
const inteiro = (f: FormData, nome: string) => {
  const n = Number(String(f.get(nome) ?? "").trim());
  return Number.isInteger(n) ? n : NaN;
};

function atualizar(id?: string) {
  revalidatePath("/ferias", "layout");
  revalidatePath("/dp", "layout");
  if (id) revalidatePath(`/ferias/${id}`);
}

/** Quem analisa as férias de uma pessoa: o gestor definido ou, sem ele, diretoria e gerência. */
async function destinatariosGestor(ctx: Contexto, gestorId: string | null, excetoId: string): Promise<string[]> {
  if (gestorId) return [gestorId];
  const { data } = await ctx.admin.from("usuarios").select("id").eq("tenant_id", ctx.tenantId).eq("ativo", true).in("nivel_acesso", ["diretor", "gerente"]);
  return (data ?? []).map((u) => u.id).filter((id) => id !== excetoId);
}

/**
 * Entrega as notificações de uma ação. Hoje só o canal interno (sino do
 * Vitral); para enviar também por e-mail, basta acrescentar o envio aqui
 * e preencher `email_enviado_em` — os textos já estão prontos.
 */
async function notificar(ctx: Contexto, s: Pick<Solicitacao, "id" | "usuario_id" | "gestor_id" | "data_inicio" | "data_fim" | "dias">, acao: string, nomeColaborador: string, motivo?: string | null) {
  const lista = notificacoesDaAcao(acao, { colaborador: nomeColaborador, periodo: periodoBR(s.data_inicio, s.data_fim), dias: s.dias, motivo });
  if (lista.length === 0) return;
  const gestores = lista.some((n) => n.para === "gestor") ? await destinatariosGestor(ctx, s.gestor_id, s.usuario_id) : [];
  const linhas = lista.flatMap((n) =>
    (n.para === "colaborador" ? [s.usuario_id] : gestores).map((usuarioId) => ({ tenant_id: ctx.tenantId, usuario_id: usuarioId, solicitacao_id: s.id, tipo: n.tipo, titulo: n.titulo, mensagem: n.mensagem.slice(0, 500) }))
  );
  if (linhas.length) await ctx.admin.from("ferias_notificacoes").insert(linhas);
}

async function evento(ctx: Contexto, solicitacaoId: string, papel: "colaborador" | "gestor" | "administrador" | "sistema", acao: string, dados: { inicio?: string | null; dias?: number | null; fim?: string | null; comentario?: string | null; intervencao?: boolean } = {}) {
  await ctx.admin.from("ferias_eventos").insert({
    tenant_id: ctx.tenantId,
    solicitacao_id: solicitacaoId,
    usuario_id: ctx.autor.id,
    usuario_nome: ctx.autor.nome,
    papel,
    acao,
    data_inicio: dados.inicio ?? null,
    dias: dados.dias ?? null,
    data_fim: dados.fim ?? null,
    comentario: dados.comentario || null,
    intervencao: dados.intervencao ?? false,
  });
}

async function dadosDoColaborador(ctx: Contexto, usuarioId: string, ignorarIds: (string | null | undefined)[] = []) {
  const [{ data: cadastro }, { data: solicitacoes }, { data: ajustes }] = await Promise.all([
    ctx.admin.from("ferias_colaboradores").select("*").eq("usuario_id", usuarioId).maybeSingle(),
    ctx.admin.from("ferias_solicitacoes").select("*").eq("usuario_id", usuarioId),
    ctx.admin.from("ferias_ajustes").select("*").eq("usuario_id", usuarioId),
  ]);
  const ignorar = new Set(ignorarIds.filter(Boolean) as string[]);
  const saldos = saldosDe(cadastro, (solicitacoes ?? []).filter((s) => !ignorar.has(s.id)), ajustes ?? [], hojeISO());
  return { cadastro, saldos };
}

// ---------------------------------------------------------------
// colaborador: solicitar férias, alteração ou cancelamento
// ---------------------------------------------------------------

export async function solicitarFerias(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  if (!ctx.acesso.participa || !ctx.acesso.cadastro) {
    await avisar("erro", "Seu cadastro de férias ainda não foi feito. Fale com a gestão.");
    return;
  }
  const hoje = hojeISO();
  const tipo = txt(formData, "tipo", 20) === "alteracao" ? "alteracao" : txt(formData, "tipo", 20) === "cancelamento" ? "cancelamento" : "ferias";
  const origemId = txt(formData, "origem_id", 40) || null;
  const observacao = txt(formData, "observacao", 1000);

  let origem: Solicitacao | null = null;
  if (tipo !== "ferias") {
    const { data } = await ctx.admin.from("ferias_solicitacoes").select("*").eq("id", origemId ?? "").eq("usuario_id", ctx.autor.id).maybeSingle();
    origem = data;
    if (!origem || !podePedirAlteracao(origem, hoje)) {
      await avisar("erro", "Só é possível alterar ou cancelar férias aprovadas que ainda não começaram.");
      return;
    }
    const { count } = await ctx.admin.from("ferias_solicitacoes").select("id", { count: "exact", head: true }).eq("origem_id", origem.id).in("status", ["aguardando_analise", "aguardando_colaborador", "aguardando_gestor"]);
    if ((count ?? 0) > 0) {
      await avisar("erro", "Já existe um pedido de alteração ou cancelamento em andamento para estas férias.");
      return;
    }
  }

  let linha: { periodo_aquisitivo_inicio: string; data_inicio: string; dias: number; data_fim: string; data_retorno: string; abono_dias: number; adiantamento_13: boolean };
  if (tipo === "cancelamento" && origem) {
    if (!observacao) {
      await avisar("erro", "Explique em poucas palavras o motivo do cancelamento.");
      return;
    }
    linha = { periodo_aquisitivo_inicio: origem.periodo_aquisitivo_inicio, data_inicio: origem.data_inicio, dias: origem.dias, data_fim: origem.data_fim, data_retorno: origem.data_retorno, abono_dias: origem.abono_dias, adiantamento_13: origem.adiantamento_13 };
  } else {
    const pedido = {
      periodoInicio: origem?.periodo_aquisitivo_inicio ?? txt(formData, "periodo_inicio", 10),
      dataInicio: txt(formData, "data_inicio", 10),
      dias: inteiro(formData, "dias"),
      abonoDias: Math.max(0, inteiro(formData, "abono_dias") || 0),
      adiantamento13: formData.get("adiantamento_13") === "on",
    };
    const { saldos } = await dadosDoColaborador(ctx, ctx.autor.id, [origem?.id]);
    const v = validarPedido(pedido, { hoje, regime: regimeDe(ctx.acesso.cadastro), saldos, diasPorPeriodo: ctx.acesso.cadastro.dias_por_periodo });
    if (v.erros.length) {
      await avisar("erro", v.erros[0]);
      return;
    }
    const { fim, retorno } = calcularDatas(pedido.dataInicio, pedido.dias);
    linha = { periodo_aquisitivo_inicio: pedido.periodoInicio, data_inicio: pedido.dataInicio, dias: pedido.dias, data_fim: fim, data_retorno: retorno, abono_dias: pedido.abonoDias, adiantamento_13: pedido.adiantamento13 };
  }

  const { data: nova, error } = await ctx.admin
    .from("ferias_solicitacoes")
    .insert({ ...linha, tenant_id: ctx.tenantId, usuario_id: ctx.autor.id, tipo, origem_id: origem?.id ?? null, observacao: observacao || null, status: "aguardando_analise", gestor_id: ctx.acesso.cadastro.gestor_id })
    .select("*")
    .single();
  if (error || !nova) {
    await avisar("erro", `Não foi possível enviar a solicitação: ${error?.message ?? "erro desconhecido"}`);
    return;
  }
  const acao = tipo === "ferias" ? "solicitou" : tipo === "alteracao" ? "solicitou_alteracao" : "solicitou_cancelamento";
  await evento(ctx, nova.id, "colaborador", acao, { inicio: nova.data_inicio, dias: nova.dias, fim: nova.data_fim, comentario: observacao });
  await notificar(ctx, nova, acao, ctx.autor.nome);
  atualizar();
  await avisar("sucesso", "Solicitação enviada. Agora é com o gestor.");
  redirect(`/ferias/${nova.id}`);
}

// ---------------------------------------------------------------
// respostas: aprovar, recusar, propor, aceitar, contrapropor, cancelar
// ---------------------------------------------------------------

export async function responderSolicitacao(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const id = txt(formData, "id", 40);
  const acao = txt(formData, "acao", 30) as Acao;
  const comentario = txt(formData, "comentario", 1000);
  if (!(ACOES as readonly string[]).includes(acao)) return;

  const { data: s } = await ctx.admin.from("ferias_solicitacoes").select("*").eq("id", id).eq("tenant_id", ctx.tenantId).maybeSingle();
  if (!s) return;
  const papel = papelNaSolicitacao(s, ctx.autor.id, ctx.acesso.administrador);
  const t = transicao(s.status as Status, acao, papel);
  if (!t.ok || !papel) {
    await avisar("erro", t.ok ? "Você não participa desta solicitação." : t.erro);
    return;
  }
  if (acao === "recusar" && !comentario) {
    await avisar("erro", "Informe o motivo da recusa — o colaborador vai ler essa justificativa.");
    return;
  }
  const hoje = hojeISO();
  const { data: dono } = await ctx.admin.from("usuarios").select("nome").eq("id", s.usuario_id).maybeSingle();
  const nomeDono = dono?.nome ?? "Colaborador";
  const { cadastro, saldos } = await dadosDoColaborador(ctx, s.usuario_id, [s.id, s.tipo === "alteracao" ? s.origem_id : null]);

  let datas = { data_inicio: s.data_inicio, dias: s.dias, data_fim: s.data_fim, data_retorno: s.data_retorno };

  if (acao === "propor" || acao === "contrapropor") {
    if (s.tipo === "cancelamento") {
      await avisar("erro", "Um pedido de cancelamento só pode ser aprovado ou recusado.");
      return;
    }
    const inicio = txt(formData, "data_inicio", 10);
    const dias = Number.isInteger(inteiro(formData, "dias")) ? inteiro(formData, "dias") : s.dias;
    if (!dataValida(inicio)) {
      await avisar("erro", "Informe a nova data de início.");
      return;
    }
    if (inicio === s.data_inicio && dias === s.dias) {
      await avisar("erro", "A nova proposta é igual à atual. Altere a data ou a quantidade de dias.");
      return;
    }
    datas = { data_inicio: inicio, dias, ...(({ fim, retorno }) => ({ data_fim: fim, data_retorno: retorno }))(calcularDatas(inicio, dias)) };
  }
  if (acao === "recusar_proposta") {
    // volta ao último período pedido pelo próprio colaborador
    const { data: ultimo } = await ctx.admin
      .from("ferias_eventos")
      .select("data_inicio, dias")
      .eq("solicitacao_id", s.id)
      .eq("papel", "colaborador")
      .not("data_inicio", "is", null)
      .order("criado_em", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ultimo?.data_inicio && ultimo.dias) datas = { data_inicio: ultimo.data_inicio, dias: ultimo.dias, ...(({ fim, retorno }) => ({ data_fim: fim, data_retorno: retorno }))(calcularDatas(ultimo.data_inicio, ultimo.dias)) };
  }

  // qualquer período que possa virar férias precisa caber no saldo e ser futuro
  if (s.tipo !== "cancelamento" && ["propor", "contrapropor", "aprovar", "aceitar_proposta"].includes(acao) && cadastro) {
    const v = validarPedido(
      { periodoInicio: s.periodo_aquisitivo_inicio, dataInicio: datas.data_inicio, dias: datas.dias, abonoDias: s.abono_dias, adiantamento13: false },
      { hoje, regime: regimeDe(cadastro), saldos, diasPorPeriodo: cadastro.dias_por_periodo }
    );
    if (v.erros.length) {
      await avisar("erro", v.erros[0]);
      return;
    }
  }

  const decisao = t.para === "aprovado" || t.para === "recusado";
  const { error } = await ctx.admin
    .from("ferias_solicitacoes")
    .update({
      ...datas,
      status: t.para,
      atualizado_em: new Date().toISOString(),
      ...(decisao ? { decidido_por: ctx.autor.id, decidido_por_nome: ctx.autor.nome, decidido_em: new Date().toISOString() } : {}),
      ...(acao === "recusar" ? { motivo_recusa: comentario } : {}),
    })
    .eq("id", s.id)
    .eq("status", s.status); // se alguém respondeu antes, nada é gravado
  if (error) {
    await avisar("erro", `Não foi possível registrar: ${error.message}`);
    return;
  }

  await evento(ctx, s.id, papel, acao, { inicio: datas.data_inicio, dias: datas.dias, fim: datas.data_fim, comentario, intervencao: papel === "administrador" });

  // alteração/cancelamento aprovados: a programação anterior deixa de valer (com registro)
  if (t.para === "aprovado" && s.origem_id && s.tipo !== "ferias") {
    await ctx.admin.from("ferias_solicitacoes").update({ status: "cancelado", atualizado_em: new Date().toISOString() }).eq("id", s.origem_id);
    await evento(ctx, s.origem_id, "sistema", s.tipo === "cancelamento" ? "cancelada_por_pedido" : "substituida", { comentario: s.tipo === "cancelamento" ? "Cancelamento aprovado." : `Substituída pela nova programação: ${periodoBR(datas.data_inicio, datas.data_fim)}.` });
  }

  await notificar(ctx, { ...s, ...datas }, acao, nomeDono, comentario);
  atualizar(s.id);
  const mensagens: Record<Acao, string> = {
    aprovar: s.tipo === "cancelamento" ? "Cancelamento aprovado. As férias foram desmarcadas." : "Férias aprovadas e programadas.",
    recusar: "Solicitação recusada. O colaborador verá a justificativa.",
    propor: "Proposta enviada. Aguardando a resposta do colaborador.",
    aceitar_proposta: "Nova data aceita. Férias programadas.",
    recusar_proposta: "Resposta enviada ao gestor.",
    contrapropor: "Contraproposta enviada ao gestor.",
    cancelar: "Solicitação cancelada.",
  };
  await avisar("sucesso", mensagens[acao]);
}

// ---------------------------------------------------------------
// notificações
// ---------------------------------------------------------------

export async function marcarNotificacoesFeriasLidas(solicitacaoId?: string) {
  const sessao = await exigirUsuario();
  if (!sessao) return;
  let consulta = createAdminClient().from("ferias_notificacoes").update({ lida_em: new Date().toISOString() }).eq("usuario_id", sessao.userId).is("lida_em", null);
  if (solicitacaoId) consulta = consulta.eq("solicitacao_id", solicitacaoId);
  await consulta;
}

// ---------------------------------------------------------------
// ajuste de saldo (administrador) — o cadastro de quem tem férias fica em Departamento Pessoal › Colaboradores
// ---------------------------------------------------------------

async function contextoAdmin() {
  const ctx = await contexto();
  if (!ctx) return null;
  if (!ctx.acesso.administrador) {
    await avisar("erro", "Só diretor ou gerente alteram o cadastro de férias.");
    return null;
  }
  return ctx;
}

async function usuarioDaEmpresa(ctx: Contexto, usuarioId: string): Promise<boolean> {
  const { data } = await ctx.admin.from("usuarios").select("id").eq("id", usuarioId).eq("tenant_id", ctx.tenantId).maybeSingle();
  return !!data;
}

export async function adicionarAjusteFerias(formData: FormData) {
  const ctx = await contextoAdmin();
  if (!ctx) return;
  const usuarioId = txt(formData, "usuario_id", 40);
  const periodo = txt(formData, "periodo_inicio", 10);
  const dias = inteiro(formData, "dias");
  const motivo = txt(formData, "motivo", 300);
  if (!(await usuarioDaEmpresa(ctx, usuarioId)) || !dataValida(periodo) || !Number.isInteger(dias) || dias === 0 || Math.abs(dias) > 60 || !motivo) {
    await avisar("erro", "Informe o período, a quantidade de dias e o motivo do ajuste.");
    return;
  }
  const { error } = await ctx.admin.from("ferias_ajustes").insert({ tenant_id: ctx.tenantId, usuario_id: usuarioId, periodo_inicio: periodo, dias, motivo, criado_por: ctx.autor.id, criado_por_nome: ctx.autor.nome });
  if (error) {
    await avisar("erro", `Não foi possível salvar o ajuste: ${error.message}`);
    return;
  }
  atualizar();
  await avisar("sucesso", "Ajuste de saldo registrado.");
}
