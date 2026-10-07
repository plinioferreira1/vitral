"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { avisar, checar } from "@/lib/aviso";
import type { Json } from "@/lib/database.types";
import {
  ROTULO_REGISTRO,
  TIPOS_REGISTRO,
  hhmm,
  instanteDe,
  localDe,
  normalizarJornada,
  paraMinutos,
  podeDecidirSobre,
  podeRegistrar,
  type RegistrosDia,
  type TipoRegistro,
} from "@/lib/dp/ponto";
import { dataBR, dataValida } from "@/lib/ferias/regras";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/usuario-atual";
import { BUCKET_DP, acessoDP, registrosPorDia, type Colaborador } from "./dados";

/**
 * Toda gravação do Departamento Pessoal passa por aqui: a ação confere
 * quem está pedindo e o que pode fazer, e só então grava com a chave do
 * servidor (o usuário logado tem apenas leitura nas tabelas dp_*).
 * Alterações críticas vão para dp_eventos com valor anterior e novo.
 */
async function contexto() {
  const sessao = await exigirUsuario();
  if (!sessao) return null;
  const supabase = await createClient();
  const acesso = await acessoDP(supabase, sessao.userId, sessao.nivel);
  if (!acesso.liberado || !acesso.perms.ver) {
    await avisar("erro", "O Departamento Pessoal não está liberado para o seu acesso.");
    return null;
  }
  return { supabase, admin: createAdminClient(), acesso, tenantId: sessao.tenantId, autor: { id: sessao.userId, nome: sessao.usuario.nome } };
}
type Contexto = NonNullable<Awaited<ReturnType<typeof contexto>>>;

async function contextoAdmin() {
  const ctx = await contexto();
  if (!ctx) return null;
  if (!ctx.acesso.perms.administrador) {
    await avisar("erro", "Só diretor ou gerente podem fazer isso no Departamento Pessoal.");
    return null;
  }
  return ctx;
}

const txt = (f: FormData, nome: string, limite: number) => String(f.get(nome) ?? "").trim().slice(0, limite);
const dataOuNull = (f: FormData, nome: string) => (dataValida(txt(f, nome, 10)) ? txt(f, nome, 10) : null);
const UUID = /^[0-9a-f-]{36}$/i;

function atualizar() {
  revalidatePath("/dp", "layout");
  revalidatePath("/ferias", "layout");
}

async function auditar(ctx: Contexto, e: { colaboradorId?: string | null; entidade: string; registroId?: string | null; acao: string; descricao: string; anterior?: unknown; novo?: unknown; justificativa?: string | null }) {
  await ctx.admin.from("dp_eventos").insert({
    tenant_id: ctx.tenantId,
    colaborador_id: e.colaboradorId ?? null,
    entidade: e.entidade,
    registro_id: e.registroId ?? null,
    acao: e.acao,
    descricao: e.descricao.slice(0, 1000),
    anterior: (e.anterior ?? null) as Json,
    novo: (e.novo ?? null) as Json,
    justificativa: e.justificativa || null,
    usuario_id: ctx.autor.id,
    usuario_nome: ctx.autor.nome,
  });
}

async function colaboradorDaEmpresa(ctx: Contexto, id: string): Promise<Colaborador | null> {
  if (!UUID.test(id)) return null;
  const { data } = await ctx.admin.from("dp_colaboradores").select("*").eq("id", id).eq("tenant_id", ctx.tenantId).maybeSingle();
  return data;
}

// ---------------------------------------------------------------
// colaboradores
// ---------------------------------------------------------------

/** Liga uma ficha existente, preservando todos os dados de RH e sua auditoria. */
export async function vincularUsuarioColaborador(formData: FormData) {
  const ctx = await contextoAdmin();
  if (!ctx) return;
  const usuarioId = txt(formData, "usuario_id", 40);
  const colaboradorId = txt(formData, "colaborador_id", 40);
  if (!UUID.test(usuarioId) || !UUID.test(colaboradorId)) {
    await avisar("erro", "Selecione um usuário e um colaborador válidos.");
    return;
  }
  const anterior = await colaboradorDaEmpresa(ctx, colaboradorId);
  const { data: usuario } = await ctx.admin.from("usuarios").select("id").eq("id", usuarioId).eq("tenant_id", ctx.tenantId).single();
  if (!anterior || !usuario || anterior.usuario_id) {
    await avisar("erro", "Ficha indisponível para vínculo. Atualize a página e tente novamente.");
    return;
  }
  const { data: existente, error: erroExistente } = await ctx.admin.from("dp_colaboradores").select("id").eq("usuario_id", usuarioId).maybeSingle();
  if (erroExistente || existente) {
    await avisar("erro", "Esse usuário já está vinculado a uma ficha de colaborador.");
    return;
  }
  // A condição e a constraint única impedem que dois vínculos concorrentes se sobrescrevam.
  const resultado = await ctx.admin.from("dp_colaboradores").update({ usuario_id: usuarioId, atualizado_em: new Date().toISOString() }).eq("id", colaboradorId).eq("tenant_id", ctx.tenantId).is("usuario_id", null).select("*").single();
  if (!await checar(Promise.resolve(resultado), "vincular o colaborador") || !resultado.data) return;
  await sincronizarFerias(ctx, resultado.data);
  // Se a ficha vinculada for uma gestora, atualiza também o destino das solicitações da equipe.
  const { data: equipe } = await ctx.admin.from("dp_colaboradores").select("*").eq("gestor_id", colaboradorId).eq("tenant_id", ctx.tenantId);
  for (const c of equipe ?? []) await sincronizarFerias(ctx, c);
  await auditar(ctx, { colaboradorId, entidade: "colaborador", registroId: colaboradorId, acao: "vincular_usuario", descricao: "Usuário do Vitral vinculado à ficha de colaborador", anterior: { usuario_id: null }, novo: { usuario_id: usuarioId } });
  atualizar();
  revalidatePath("/membros");
  await avisar("sucesso", "Colaborador vinculado ao usuário do Vitral.");
  return true;
}

/** Férias usa uma cópia enxuta do cadastro (por usuário do Vitral); mantém as duas em dia. */
async function sincronizarFerias(ctx: Contexto, c: Colaborador) {
  if (!c.usuario_id) return;
  let gestorUsuario: string | null = null;
  if (c.gestor_id) {
    const { data: g } = await ctx.admin.from("dp_colaboradores").select("usuario_id").eq("id", c.gestor_id).maybeSingle();
    gestorUsuario = g?.usuario_id ?? null;
  }
  const participa = c.tem_ferias && c.status === "ativo" && !!c.data_admissao;
  await ctx.admin.from("ferias_colaboradores").upsert({
    usuario_id: c.usuario_id,
    tenant_id: ctx.tenantId,
    participa,
    data_admissao: c.data_admissao,
    regime: c.regime,
    departamento: c.departamento,
    gestor_id: gestorUsuario,
    dias_por_periodo: c.dias_ferias_periodo,
    atualizado_por: ctx.autor.id,
    atualizado_em: new Date().toISOString(),
  });
  await ctx.admin.from("ferias_solicitacoes").update({ gestor_id: gestorUsuario }).eq("usuario_id", c.usuario_id).in("status", ["aguardando_analise", "aguardando_colaborador", "aguardando_gestor"]);
}

export async function salvarColaborador(formData: FormData) {
  const ctx = await contextoAdmin();
  if (!ctx) return;
  const id = txt(formData, "id", 40);
  const anterior = id ? await colaboradorDaEmpresa(ctx, id) : null;
  if (id && !anterior) return;
  const config = ctx.acesso.config;
  const nome = txt(formData, "nome", 200);
  if (!nome) {
    await avisar("erro", "Informe o nome completo.");
    return;
  }
  const vinculo = txt(formData, "vinculo", 80) || null;
  const usuarioId = txt(formData, "usuario_id", 40) || null;
  const gestorId = txt(formData, "gestor_id", 40) || null;
  if (gestorId && gestorId === id) {
    await avisar("erro", "A pessoa não pode ser gestora de si mesma.");
    return;
  }
  if (usuarioId) {
    const { data: outro } = await ctx.admin.from("dp_colaboradores").select("id, nome").eq("usuario_id", usuarioId).neq("id", id || "00000000-0000-0000-0000-000000000000").maybeSingle();
    if (outro) {
      await avisar("erro", `Esse usuário do Vitral já está ligado à ficha de ${outro.nome}.`);
      return;
    }
  }
  const jornadaPropria = formData.get("jornada_propria") === "on";
  const jornada = jornadaPropria
    ? normalizarJornada({ dias: formData.getAll("jornada_dias").map(Number), entrada: txt(formData, "jornada_entrada", 5), saida: txt(formData, "jornada_saida", 5), intervalo_min: Number(txt(formData, "jornada_intervalo", 4)) }, config.jornada)
    : null;
  const status = ["ativo", "inativo", "desligado"].includes(txt(formData, "status", 12)) ? txt(formData, "status", 12) : "ativo";
  const registraPonto = formData.get("registra_ponto") === "on";
  const carga = Number(txt(formData, "carga_semanal_horas", 6).replace(",", "."));
  const diasFerias = Number(txt(formData, "dias_ferias_periodo", 3));
  const temFerias = formData.get("tem_ferias") === "on";
  const admissao = dataOuNull(formData, "data_admissao");
  if (temFerias && !admissao) {
    await avisar("erro", "Para ter férias pelo Vitral, informe a data de admissão.");
    return;
  }
  const campos = {
    nome,
    usuario_id: usuarioId,
    empresa: txt(formData, "empresa", 80) || null,
    departamento: txt(formData, "departamento", 80) || null,
    cargo: txt(formData, "cargo", 80) || null,
    gestor_id: gestorId,
    data_admissao: admissao,
    data_nascimento: dataOuNull(formData, "data_nascimento"),
    vinculo,
    regime: config.vinculos.find((v) => v.nome === vinculo)?.regime ?? "outro",
    status,
    data_desligamento: status === "desligado" ? (dataOuNull(formData, "data_desligamento") ?? localDe(new Date().toISOString()).data) : null,
    jornada: jornada as unknown as Json,
    carga_semanal_horas: Number.isFinite(carga) && carga > 0 && carga <= 80 ? carga : null,
    tem_ferias: temFerias,
    dias_ferias_periodo: Number.isInteger(diasFerias) && diasFerias >= 1 && diasFerias <= 60 ? diasFerias : 30,
    registra_ponto: registraPonto,
    // o ponto começa a contar no dia em que é ligado (ou na data informada)
    ponto_inicio: registraPonto ? (dataOuNull(formData, "ponto_inicio") ?? anterior?.ponto_inicio ?? localDe(new Date().toISOString()).data) : (anterior?.ponto_inicio ?? null),
    email: txt(formData, "email", 200).toLowerCase() || null,
    telefone: txt(formData, "telefone", 40) || null,
    observacoes: txt(formData, "observacoes", 1000) || null,
    foto_caminho: txt(formData, "foto_caminho", 300) || anterior?.foto_caminho || null,
    atualizado_em: new Date().toISOString(),
  };
  if (campos.foto_caminho && !campos.foto_caminho.startsWith(`${ctx.tenantId}/`)) campos.foto_caminho = anterior?.foto_caminho ?? null;

  const consulta = anterior
    ? ctx.admin.from("dp_colaboradores").update(campos).eq("id", anterior.id).select("*").single()
    : ctx.admin.from("dp_colaboradores").insert({ ...campos, tenant_id: ctx.tenantId, criado_por: ctx.autor.id }).select("*").single();
  const { data: salvo, error } = await consulta;
  if (error || !salvo) {
    await avisar("erro", `Não foi possível salvar: ${error?.message ?? "erro desconhecido"}`);
    return;
  }
  const mudou = anterior ? (Object.keys(campos) as (keyof typeof campos)[]).filter((k) => k !== "atualizado_em" && JSON.stringify(anterior[k]) !== JSON.stringify(salvo[k])) : [];
  if (!anterior || mudou.length) {
    await auditar(ctx, {
      colaboradorId: salvo.id,
      entidade: "colaborador",
      registroId: salvo.id,
      acao: anterior ? "cadastro_alterado" : "cadastro_criado",
      descricao: anterior ? `Cadastro de ${salvo.nome} alterado (${mudou.join(", ")}).` : `Colaborador ${salvo.nome} cadastrado.`,
      anterior: anterior ? Object.fromEntries(mudou.map((k) => [k, anterior[k]])) : null,
      novo: anterior ? Object.fromEntries(mudou.map((k) => [k, salvo[k]])) : campos,
    });
  }
  await sincronizarFerias(ctx, salvo);
  // quem tem esta pessoa como gestora também precisa do novo usuário responsável nas férias
  const { data: subordinados } = await ctx.admin.from("dp_colaboradores").select("*").eq("gestor_id", salvo.id);
  for (const s of subordinados ?? []) await sincronizarFerias(ctx, s);
  atualizar();
  await avisar("sucesso", "Colaborador salvo.");
  redirect(`/dp/colaboradores/${salvo.id}`);
}

// ---------------------------------------------------------------
// arquivos: o navegador envia direto para a pasta privada com um link de uso único
// ---------------------------------------------------------------

export async function prepararUpload(destino: "documento" | "ausencia" | "correcao" | "foto", colaboradorId: string, nomeArquivo: string): Promise<{ ok: boolean; erro?: string; caminho?: string; token?: string }> {
  const ctx = await contexto();
  if (!ctx) return { ok: false, erro: "Sem permissão." };
  const c = await colaboradorDaEmpresa(ctx, colaboradorId);
  if (!c) return { ok: false, erro: "Colaborador não encontrado." };
  const proprio = ctx.acesso.eu?.id === c.id;
  const gestor = podeDecidirSobre(ctx.acesso.perms, ctx.acesso.eu?.id ?? null, c);
  const pode = destino === "documento" || destino === "foto" ? ctx.acesso.perms.administrador : proprio || gestor;
  if (!pode) return { ok: false, erro: "Você não pode enviar arquivos para esta pessoa." };
  const extensao = (nomeArquivo.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!["pdf", "jpg", "jpeg", "png", "webp"].includes(extensao)) return { ok: false, erro: "Envie PDF ou imagem (JPG, PNG)." };
  const caminho = `${ctx.tenantId}/${c.id}/${destino}/${crypto.randomUUID()}.${extensao}`;
  const { data, error } = await ctx.admin.storage.from(BUCKET_DP).createSignedUploadUrl(caminho);
  if (error || !data) return { ok: false, erro: error?.message ?? "Não foi possível preparar o envio." };
  return { ok: true, caminho, token: data.token };
}

const caminhoValido = (ctx: Contexto, colaboradorId: string, caminho: string, destino: string) => !caminho || caminho.startsWith(`${ctx.tenantId}/${colaboradorId}/${destino}/`);

// ---------------------------------------------------------------
// ponto
// ---------------------------------------------------------------

async function registrosDoDia(ctx: Contexto, colaboradorId: string, data: string): Promise<RegistrosDia> {
  const { data: linhas } = await ctx.admin.from("dp_ponto_registros").select("data, tipo, horario, ativo").eq("colaborador_id", colaboradorId).eq("data", data).eq("ativo", true);
  return registrosPorDia(linhas ?? []).get(data) ?? {};
}

/** Batida de ponto: sempre com a hora do servidor, na ordem certa, uma de cada tipo por dia. */
export async function registrarPonto(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const eu = ctx.acesso.eu;
  if (!eu || !eu.registra_ponto || eu.status !== "ativo") {
    await avisar("erro", "Seu cadastro não está configurado para registrar ponto. Fale com a gestão.");
    return;
  }
  const tipo = txt(formData, "tipo", 20) as TipoRegistro;
  if (!(TIPOS_REGISTRO as readonly string[]).includes(tipo)) return;
  const agoraIso = new Date().toISOString();
  const agora = localDe(agoraIso);
  const erro = podeRegistrar(await registrosDoDia(ctx, eu.id, agora.data), tipo, agora.minutos);
  if (erro) {
    await avisar("erro", erro);
    return;
  }
  const lista = await headers();
  const ip = lista.get("x-forwarded-for")?.split(",")[0]?.trim() || lista.get("x-real-ip") || null;
  const { error } = await ctx.admin.from("dp_ponto_registros").insert({ tenant_id: ctx.tenantId, colaborador_id: eu.id, data: agora.data, tipo, horario: agoraIso, origem: "app", ip, registrado_por: ctx.autor.id });
  if (error) {
    await avisar("erro", error.code === "23505" ? "Esse registro já foi feito hoje." : `Não foi possível registrar: ${error.message}`);
    return;
  }
  atualizar();
  await avisar("sucesso", `${ROTULO_REGISTRO[tipo]} registrada às ${hhmm(agora.minutos)}.`);
}

/** Confere se o novo horário mantém a ordem entrada → intervalo → retorno → saída. */
function ordemValida(r: RegistrosDia, tipo: TipoRegistro, minutos: number): boolean {
  const novo = { ...r, [tipo]: minutos };
  const sequencia = TIPOS_REGISTRO.map((t) => novo[t]).filter((v): v is number => v !== undefined);
  return sequencia.every((v, i) => i === 0 || v >= sequencia[i - 1]);
}

async function aplicarCorrecao(ctx: Contexto, c: { id: string; colaborador_id: string; data: string; tipo: string; horario_solicitado: string; justificativa: string }) {
  const { data: original } = await ctx.admin.from("dp_ponto_registros").select("*").eq("colaborador_id", c.colaborador_id).eq("data", c.data).eq("tipo", c.tipo).eq("ativo", true).maybeSingle();
  // o registro original nunca é apagado: fica guardado como inativo
  if (original) await ctx.admin.from("dp_ponto_registros").update({ ativo: false }).eq("id", original.id);
  const { data: novo, error } = await ctx.admin
    .from("dp_ponto_registros")
    .insert({ tenant_id: ctx.tenantId, colaborador_id: c.colaborador_id, data: c.data, tipo: c.tipo, horario: c.horario_solicitado, origem: "correcao", correcao_id: c.id, substitui_id: original?.id ?? null, registrado_por: ctx.autor.id })
    .select("id")
    .single();
  if (error) {
    if (original) await ctx.admin.from("dp_ponto_registros").update({ ativo: true }).eq("id", original.id);
    return error.message;
  }
  await auditar(ctx, {
    colaboradorId: c.colaborador_id,
    entidade: "ponto",
    registroId: novo?.id,
    acao: "ponto_corrigido",
    descricao: `Ponto de ${dataBR(c.data)} — ${ROTULO_REGISTRO[c.tipo as TipoRegistro]}: ${original ? hhmm(localDe(original.horario).minutos) : "sem registro"} → ${hhmm(localDe(c.horario_solicitado).minutos)}.`,
    anterior: original ? { horario: original.horario, origem: original.origem } : null,
    novo: { horario: c.horario_solicitado, correcao_id: c.id },
    justificativa: c.justificativa,
  });
  return null;
}

export async function solicitarCorrecao(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const alvo = await colaboradorDaEmpresa(ctx, txt(formData, "colaborador_id", 40) || ctx.acesso.eu?.id || "");
  if (!alvo) return;
  const proprio = ctx.acesso.eu?.id === alvo.id;
  const decide = podeDecidirSobre(ctx.acesso.perms, ctx.acesso.eu?.id ?? null, alvo);
  if (!proprio && !decide) {
    await avisar("erro", "Você não pode pedir correção de ponto para esta pessoa.");
    return;
  }
  const data = txt(formData, "data", 10);
  const tipo = txt(formData, "tipo", 20) as TipoRegistro;
  const minutos = paraMinutos(txt(formData, "horario", 5));
  const justificativa = txt(formData, "justificativa", 1000);
  const hoje = localDe(new Date().toISOString());
  if (!dataValida(data) || data > hoje.data || !(TIPOS_REGISTRO as readonly string[]).includes(tipo) || minutos === null) {
    await avisar("erro", "Informe a data (até hoje), o registro e o novo horário.");
    return;
  }
  if (!justificativa) {
    await avisar("erro", "Explique o motivo da correção.");
    return;
  }
  if (alvo.ponto_inicio && data < alvo.ponto_inicio) {
    await avisar("erro", `O controle de ponto desta pessoa começou em ${dataBR(alvo.ponto_inicio)}.`);
    return;
  }
  const doDia = await registrosDoDia(ctx, alvo.id, data);
  if (!ordemValida(doDia, tipo, minutos)) {
    await avisar("erro", "O novo horário fica fora de ordem em relação aos outros registros do dia.");
    return;
  }
  const anexo = txt(formData, "anexo_caminho", 300);
  if (!caminhoValido(ctx, alvo.id, anexo, "correcao")) return;
  const { data: original } = await ctx.admin.from("dp_ponto_registros").select("horario").eq("colaborador_id", alvo.id).eq("data", data).eq("tipo", tipo).eq("ativo", true).maybeSingle();
  const direto = decide; // gestor/administrador corrigindo o ponto de alguém: já vale, com auditoria
  const { data: correcao, error } = await ctx.admin
    .from("dp_ponto_correcoes")
    .insert({
      tenant_id: ctx.tenantId,
      colaborador_id: alvo.id,
      data,
      tipo,
      horario_original: original?.horario ?? null,
      horario_solicitado: instanteDe(data, hhmm(minutos)),
      justificativa,
      anexo_caminho: anexo || null,
      anexo_nome: txt(formData, "anexo_nome", 200) || null,
      status: direto ? "aprovada" : "pendente",
      solicitado_por: ctx.autor.id,
      solicitado_por_nome: ctx.autor.nome,
      ...(direto ? { decidido_por: ctx.autor.id, decidido_por_nome: ctx.autor.nome, decidido_em: new Date().toISOString() } : {}),
    })
    .select("*")
    .single();
  if (error || !correcao) {
    await avisar("erro", `Não foi possível registrar: ${error?.message ?? "erro desconhecido"}`);
    return;
  }
  if (direto) {
    const falha = await aplicarCorrecao(ctx, correcao);
    if (falha) {
      await avisar("erro", `Não foi possível aplicar a correção: ${falha}`);
      return;
    }
  }
  atualizar();
  await avisar("sucesso", direto ? "Ponto corrigido. O registro original ficou guardado no histórico." : "Pedido de correção enviado ao gestor.");
}

export async function decidirCorrecao(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const { data: correcao } = await ctx.admin.from("dp_ponto_correcoes").select("*").eq("id", txt(formData, "id", 40)).eq("tenant_id", ctx.tenantId).maybeSingle();
  const alvo = correcao ? await colaboradorDaEmpresa(ctx, correcao.colaborador_id) : null;
  if (!correcao || !alvo || correcao.status !== "pendente") {
    await avisar("erro", "Este pedido já foi respondido.");
    return;
  }
  if (!podeDecidirSobre(ctx.acesso.perms, ctx.acesso.eu?.id ?? null, alvo)) {
    await avisar("erro", "A decisão cabe ao gestor desta pessoa.");
    return;
  }
  const aprovar = txt(formData, "decisao", 10) === "aprovar";
  const motivo = txt(formData, "motivo", 500);
  if (!aprovar && !motivo) {
    await avisar("erro", "Informe o motivo da recusa.");
    return;
  }
  if (aprovar) {
    const doDia = await registrosDoDia(ctx, alvo.id, correcao.data);
    if (!ordemValida(doDia, correcao.tipo as TipoRegistro, localDe(correcao.horario_solicitado).minutos)) {
      await avisar("erro", "O horário pedido ficou fora de ordem em relação aos registros atuais do dia. Recuse e peça um novo pedido.");
      return;
    }
    const falha = await aplicarCorrecao(ctx, correcao);
    if (falha) {
      await avisar("erro", `Não foi possível aplicar a correção: ${falha}`);
      return;
    }
  } else {
    await auditar(ctx, { colaboradorId: alvo.id, entidade: "ponto", registroId: correcao.id, acao: "correcao_recusada", descricao: `Correção de ponto de ${dataBR(correcao.data)} recusada.`, justificativa: motivo });
  }
  await ctx.admin.from("dp_ponto_correcoes").update({ status: aprovar ? "aprovada" : "recusada", decidido_por: ctx.autor.id, decidido_por_nome: ctx.autor.nome, decidido_em: new Date().toISOString(), motivo_recusa: aprovar ? null : motivo }).eq("id", correcao.id);
  atualizar();
  await avisar("sucesso", aprovar ? "Correção aprovada. Saldo do dia e banco de horas já foram recalculados." : "Correção recusada.");
}

export async function lancarAjusteBanco(formData: FormData) {
  const ctx = await contextoAdmin();
  if (!ctx) return;
  const alvo = await colaboradorDaEmpresa(ctx, txt(formData, "colaborador_id", 40));
  const texto = txt(formData, "horas", 8);
  const m = /^(-)?(\d{1,3})(?::(\d{2}))?$/.exec(texto);
  const motivo = txt(formData, "motivo", 300);
  if (!alvo || !m || !motivo) {
    await avisar("erro", "Informe as horas (ex.: 2:30 ou -1:00) e o motivo.");
    return;
  }
  const minutos = (m[1] ? -1 : 1) * (+m[2] * 60 + +(m[3] ?? 0));
  if (minutos === 0) return;
  const { data: novo, error } = await ctx.admin
    .from("dp_banco_ajustes")
    .insert({ tenant_id: ctx.tenantId, colaborador_id: alvo.id, data: localDe(new Date().toISOString()).data, minutos, motivo, criado_por: ctx.autor.id, criado_por_nome: ctx.autor.nome })
    .select("id")
    .single();
  if (error) {
    await avisar("erro", `Não foi possível lançar: ${error.message}`);
    return;
  }
  await auditar(ctx, { colaboradorId: alvo.id, entidade: "banco_horas", registroId: novo?.id, acao: "saldo_ajustado", descricao: `Ajuste de ${minutos > 0 ? "+" : "−"}${hhmm(Math.abs(minutos))} no banco de horas de ${alvo.nome}.`, novo: { minutos }, justificativa: motivo });
  atualizar();
  await avisar("sucesso", "Ajuste lançado no banco de horas.");
}

// ---------------------------------------------------------------
// ausências e afastamentos
// ---------------------------------------------------------------

export async function salvarAusencia(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const alvo = await colaboradorDaEmpresa(ctx, txt(formData, "colaborador_id", 40) || ctx.acesso.eu?.id || "");
  if (!alvo) {
    await avisar("erro", "Escolha o colaborador.");
    return;
  }
  const proprio = ctx.acesso.eu?.id === alvo.id;
  const decide = podeDecidirSobre(ctx.acesso.perms, ctx.acesso.eu?.id ?? null, alvo);
  if (!proprio && !decide) {
    await avisar("erro", "Você não pode registrar ausência para esta pessoa.");
    return;
  }
  const tipo = ctx.acesso.config.tiposAusencia.find((t) => t.nome === txt(formData, "tipo", 80));
  const inicio = txt(formData, "data_inicio", 10);
  const fim = txt(formData, "data_fim", 10) || inicio;
  if (!tipo || !dataValida(inicio) || !dataValida(fim) || fim < inicio) {
    await avisar("erro", "Informe o tipo e o período da ausência.");
    return;
  }
  const anexo = txt(formData, "anexo_caminho", 300);
  if (!caminhoValido(ctx, alvo.id, anexo, "ausencia")) return;
  // o próprio colaborador envia (ex.: atestado) e o gestor confirma; gestor/administrador já registra valendo
  const status = decide ? "aprovada" : "pendente";
  const { data: nova, error } = await ctx.admin
    .from("dp_ausencias")
    .insert({
      tenant_id: ctx.tenantId,
      colaborador_id: alvo.id,
      tipo: tipo.nome,
      abona: tipo.abona,
      data_inicio: inicio,
      data_fim: fim,
      observacao: txt(formData, "observacao", 1000) || null,
      anexo_caminho: anexo || null,
      anexo_nome: txt(formData, "anexo_nome", 200) || null,
      status,
      criado_por: ctx.autor.id,
      criado_por_nome: ctx.autor.nome,
      ...(decide ? { decidido_por: ctx.autor.id, decidido_por_nome: ctx.autor.nome, decidido_em: new Date().toISOString() } : {}),
    })
    .select("id")
    .single();
  if (error) {
    await avisar("erro", `Não foi possível salvar: ${error.message}`);
    return;
  }
  await auditar(ctx, { colaboradorId: alvo.id, entidade: "ausencia", registroId: nova?.id, acao: "ausencia_registrada", descricao: `${tipo.nome} de ${alvo.nome}: ${dataBR(inicio)} a ${dataBR(fim)} (${status === "aprovada" ? "registrada" : "aguardando confirmação"}).`, novo: { tipo: tipo.nome, inicio, fim, status } });
  atualizar();
  await avisar("sucesso", status === "aprovada" ? "Ausência registrada. O ponto desses dias já considera a ausência." : "Enviado. Aguardando a confirmação do gestor.");
}

export async function decidirAusencia(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const { data: a } = await ctx.admin.from("dp_ausencias").select("*").eq("id", txt(formData, "id", 40)).eq("tenant_id", ctx.tenantId).maybeSingle();
  const alvo = a ? await colaboradorDaEmpresa(ctx, a.colaborador_id) : null;
  if (!a || !alvo) return;
  const decisao = txt(formData, "decisao", 12);
  const novoStatus = decisao === "aprovar" ? "aprovada" : decisao === "recusar" ? "recusada" : decisao === "cancelar" ? "cancelada" : null;
  const permitido = novoStatus === "cancelada" ? ctx.acesso.perms.administrador || (ctx.acesso.eu?.id === alvo.id && a.status === "pendente") : podeDecidirSobre(ctx.acesso.perms, ctx.acesso.eu?.id ?? null, alvo) && a.status === "pendente";
  if (!novoStatus || !permitido || a.status === novoStatus) {
    await avisar("erro", "Não é possível fazer isso com esta ausência.");
    return;
  }
  await ctx.admin.from("dp_ausencias").update({ status: novoStatus, decidido_por: ctx.autor.id, decidido_por_nome: ctx.autor.nome, decidido_em: new Date().toISOString() }).eq("id", a.id);
  await auditar(ctx, { colaboradorId: alvo.id, entidade: "ausencia", registroId: a.id, acao: `ausencia_${novoStatus}`, descricao: `${a.tipo} de ${alvo.nome} (${dataBR(a.data_inicio)} a ${dataBR(a.data_fim)}): ${novoStatus}.`, anterior: { status: a.status }, novo: { status: novoStatus }, justificativa: txt(formData, "motivo", 300) });
  atualizar();
  await avisar("sucesso", novoStatus === "aprovada" ? "Ausência confirmada." : novoStatus === "recusada" ? "Ausência recusada." : "Ausência cancelada.");
}

// ---------------------------------------------------------------
// documentos
// ---------------------------------------------------------------

export async function salvarDocumento(formData: FormData) {
  const ctx = await contextoAdmin();
  if (!ctx) return;
  const alvo = await colaboradorDaEmpresa(ctx, txt(formData, "colaborador_id", 40));
  const caminho = txt(formData, "anexo_caminho", 300);
  const titulo = txt(formData, "titulo", 200);
  const categoria = txt(formData, "categoria", 80);
  if (!alvo || !caminho || !caminhoValido(ctx, alvo.id, caminho, "documento") || !titulo || !categoria) {
    await avisar("erro", "Escolha o colaborador, a categoria, dê um título e anexe o arquivo.");
    return;
  }
  const { data: novo, error } = await ctx.admin
    .from("dp_documentos")
    .insert({
      tenant_id: ctx.tenantId,
      colaborador_id: alvo.id,
      categoria,
      titulo,
      data_documento: dataOuNull(formData, "data_documento"),
      vencimento: dataOuNull(formData, "vencimento"),
      observacao: txt(formData, "observacao", 1000) || null,
      caminho,
      nome_arquivo: txt(formData, "anexo_nome", 200) || "arquivo",
      enviado_por: ctx.autor.id,
      enviado_por_nome: ctx.autor.nome,
    })
    .select("id")
    .single();
  if (error) {
    await avisar("erro", `Não foi possível salvar: ${error.message}`);
    return;
  }
  await auditar(ctx, { colaboradorId: alvo.id, entidade: "documento", registroId: novo?.id, acao: "documento_adicionado", descricao: `Documento "${titulo}" (${categoria}) adicionado para ${alvo.nome}.`, novo: { titulo, categoria, vencimento: dataOuNull(formData, "vencimento") } });
  atualizar();
  await avisar("sucesso", "Documento salvo.");
}

export async function excluirDocumento(formData: FormData) {
  const ctx = await contextoAdmin();
  if (!ctx) return;
  const { data: d } = await ctx.admin.from("dp_documentos").select("*").eq("id", txt(formData, "id", 40)).eq("tenant_id", ctx.tenantId).maybeSingle();
  if (!d) return;
  await ctx.admin.from("dp_documentos").delete().eq("id", d.id);
  await ctx.admin.storage.from(BUCKET_DP).remove([d.caminho]);
  await auditar(ctx, { colaboradorId: d.colaborador_id, entidade: "documento", registroId: d.id, acao: "documento_excluido", descricao: `Documento "${d.titulo}" (${d.categoria}) excluído.`, anterior: { titulo: d.titulo, categoria: d.categoria, vencimento: d.vencimento, nome_arquivo: d.nome_arquivo } });
  atualizar();
  await avisar("sucesso", "Documento excluído.");
}

// ---------------------------------------------------------------
// configurações
// ---------------------------------------------------------------

export async function salvarConfigDP(formData: FormData) {
  const ctx = await contextoAdmin();
  if (!ctx) return;
  const linhas = (nome: string) => [...new Set(String(formData.get(nome) ?? "").split("\n").map((l) => l.trim().slice(0, 80)).filter(Boolean))].slice(0, 60);
  const inteiro = (nome: string, padrao: number, min: number, max: number) => {
    const n = Math.round(Number(formData.get(nome)));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao;
  };
  const pares = (prefixo: string) => {
    const lista: { nome: string; valor: string }[] = [];
    for (let i = 0; i < 40; i++) {
      const nome = txt(formData, `${prefixo}_nome_${i}`, 80);
      if (nome && !lista.some((l) => l.nome === nome)) lista.push({ nome, valor: txt(formData, `${prefixo}_valor_${i}`, 20) });
    }
    return lista;
  };
  const vinculos = pares("vinculo").map((p) => ({ nome: p.nome, regime: ["clt", "estagio", "pj", "outro"].includes(p.valor) ? p.valor : "outro" }));
  const tiposAusencia = pares("ausencia").map((p) => ({ nome: p.nome, abona: p.valor !== "falta" }));
  if (vinculos.length === 0 || tiposAusencia.length === 0) {
    await avisar("erro", "Mantenha ao menos um tipo de vínculo e um tipo de ausência.");
    return;
  }
  const jornada = normalizarJornada({ dias: formData.getAll("jornada_dias").map(Number), entrada: txt(formData, "jornada_entrada", 5), saida: txt(formData, "jornada_saida", 5), intervalo_min: Number(txt(formData, "jornada_intervalo", 4)) });
  if (jornada.dias.length === 0 || (paraMinutos(jornada.saida) ?? 0) <= (paraMinutos(jornada.entrada) ?? 0)) {
    await avisar("erro", "Confira a jornada padrão: escolha os dias e um horário de saída depois da entrada.");
    return;
  }
  const novo = {
    tenant_id: ctx.tenantId,
    jornada: jornada as unknown as Json,
    tolerancia_min: inteiro("tolerancia_min", 10, 0, 120),
    banco_horas_ativo: formData.get("banco_horas_ativo") === "on",
    hora_extra_limite_diario_min: inteiro("hora_extra_limite_diario_min", 120, 0, 600),
    ferias_alerta_vencimento_dias: inteiro("ferias_alerta_vencimento_dias", 60, 0, 365),
    ferias_antecedencia_dias: inteiro("ferias_antecedencia_dias", 30, 0, 180),
    ferias_aviso_proximas_dias: inteiro("ferias_aviso_proximas_dias", 7, 1, 60),
    documentos_alerta_dias: inteiro("documentos_alerta_dias", 30, 1, 365),
    empresas: linhas("empresas") as unknown as Json,
    departamentos: linhas("departamentos") as unknown as Json,
    cargos: linhas("cargos") as unknown as Json,
    vinculos: vinculos as unknown as Json,
    tipos_ausencia: tiposAusencia as unknown as Json,
    tipos_documento: linhas("tipos_documento") as unknown as Json,
    atualizado_por: ctx.autor.id,
    atualizado_em: new Date().toISOString(),
  };
  const { data: anterior } = await ctx.admin.from("dp_config").select("*").eq("tenant_id", ctx.tenantId).maybeSingle();
  const { error } = await ctx.admin.from("dp_config").upsert(novo);
  if (error) {
    await avisar("erro", `Não foi possível salvar: ${error.message}`);
    return;
  }
  await auditar(ctx, { entidade: "configuracao", acao: "configuracao_alterada", descricao: "Configurações do Departamento Pessoal alteradas.", anterior, novo });
  atualizar();
  await avisar("sucesso", "Configurações salvas. O ponto e o banco de horas já usam as novas regras.");
}
