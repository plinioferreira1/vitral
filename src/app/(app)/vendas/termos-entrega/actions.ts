"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { avisar, checar } from "@/lib/aviso";
import { hojeISO } from "@/lib/data-br";
import type { Json, TablesInsert } from "@/lib/database.types";
import { enviarEmail } from "@/lib/email";
import { obterSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { REGRA_CALCULO, dataBR } from "@/lib/termo-entrega/calculo";
import {
  calcularDocumento,
  compradores,
  descreverAlteracoes,
  documentoVazio,
  montarRetrato,
  normalizarDocumento,
  pendenciasParaGerar,
  podeCancelar,
  podeCriarNovaVersao,
  podeEditarConteudo,
  podeEnviarParaAssinatura,
  podeVoltarParaEdicao,
  vendedores,
  type Alteracao,
  type DocumentoTermo,
  type StatusTermo,
} from "@/lib/termo-entrega/conteudo";
import { formatarCentavos, textoParaCentavos } from "@/lib/termo-entrega/extenso";
import { exigirUsuario } from "@/lib/usuario-atual";
import { BUCKET_TERMOS, carregarModelo, carregarPermissoes, carregarTermo } from "./dados";

const BASE = "/vendas/termos-entrega";

async function contexto(exigir: "operar" | "configurar" = "operar") {
  const sessao = await exigirUsuario();
  if (!sessao) return null;
  const supabase = await createClient();
  const perms = await carregarPermissoes(supabase, sessao.userId, sessao.nivel);
  if (!perms[exigir]) {
    await avisar("erro", exigir === "configurar" ? "Só diretor ou gerente alteram o modelo do termo." : "Você não tem permissão para alterar termos de entrega.");
    return null;
  }
  return { supabase, tenantId: sessao.tenantId, autor: { id: sessao.userId, nome: sessao.usuario.nome }, email: sessao.user.email ?? null };
}
type Contexto = NonNullable<Awaited<ReturnType<typeof contexto>>>;

async function registrar(ctx: Contexto, termoId: string, versao: number, alteracoes: Alteracao[]) {
  if (alteracoes.length === 0) return;
  await ctx.supabase.from("termo_entrega_eventos").insert(
    alteracoes.map((a) => ({
      tenant_id: ctx.tenantId,
      termo_id: termoId,
      versao,
      acao: a.acao,
      descricao: a.descricao.slice(0, 1000),
      anterior: (a.anterior ?? null) as Json,
      novo: (a.novo ?? null) as Json,
      usuario_id: ctx.autor.id,
      usuario_nome: ctx.autor.nome,
    }))
  );
}

function atualizar(id?: string) {
  revalidatePath(BASE);
  if (id) revalidatePath(`${BASE}/${id}`);
}

/** Colunas do termo a partir do documento (acerto sempre recalculado no servidor). */
function colunasDoTermo(doc: DocumentoTermo) {
  const { acerto } = calcularDocumento(doc);
  return {
    processo_id: doc.processoId,
    imovel_endereco: doc.imovel.endereco || null,
    imovel_area_privativa: doc.imovel.areaPrivativa || null,
    imovel_matricula: doc.imovel.matricula || null,
    imovel_cartorio: doc.imovel.cartorio || null,
    imovel_inscricao_iptu: doc.imovel.inscricaoIptu || null,
    imovel_outros: doc.imovel.outros || null,
    data_entrega: doc.dataEntrega,
    hora_entrega: doc.horaEntrega || null,
    marco: doc.marco,
    marco_data: doc.marco === "entrega" ? null : doc.marcoData,
    demais_encargos: doc.demais as unknown as Json,
    ressarcimento: doc.ressarcimento as unknown as Json,
    clausula: doc.clausula as unknown as Json,
    local_assinatura: doc.local,
    data_documento: doc.dataDocumento,
    comprador_deve_centavos: acerto.compradorDeveCentavos,
    vendedor_deve_centavos: acerto.vendedorDeveCentavos,
    saldo_centavos: acerto.saldoCentavos,
    saldo_a_favor: acerto.aFavorDe,
    regra_calculo: REGRA_CALCULO,
    vendedores_nomes: vendedores(doc).map((p) => p.nome).join("; ") || null,
    compradores_nomes: compradores(doc).map((p) => p.nome).join("; ") || null,
  };
}

function linhasPartes(doc: DocumentoTermo, termoId: string, tenantId: string): TablesInsert<"termo_entrega_partes">[] {
  return doc.partes.map((p, ordem) => ({
    id: p.id,
    tenant_id: tenantId,
    termo_id: termoId,
    papel: p.papel,
    nome: p.nome,
    cpf_cnpj: p.cpfCnpj || null,
    rg: p.rg || null,
    email: p.email || null,
    cliente_id: p.clienteId,
    ordem,
  }));
}

function linhasEncargos(doc: DocumentoTermo, termoId: string, tenantId: string) {
  const { calculos } = calcularDocumento(doc);
  return doc.encargos.map((e, ordem) => {
    const c = calculos[e.id];
    return {
      id: e.id,
      tenant_id: tenantId,
      termo_id: termoId,
      ordem,
      categoria: e.categoria,
      descricao: e.descricao,
      competencia: e.competencia || null,
      periodo_inicio: e.periodoInicio,
      periodo_fim: e.periodoFim,
      vencimento: e.vencimento,
      valor_total_centavos: e.valorTotalCentavos,
      pago_por: e.pagoPor,
      responsavel: e.responsavel,
      tipo_calculo: e.tipoCalculo,
      manual_vendedor_centavos: e.manualVendedorCentavos,
      manual_comprador_centavos: e.manualCompradorCentavos,
      observacao: e.observacao || null,
      dias_total: c.diasTotal,
      dias_vendedor: c.diasVendedor,
      dias_comprador: c.diasComprador,
      parte_vendedor_centavos: c.parteVendedorCentavos,
      parte_comprador_centavos: c.parteCompradorCentavos,
      ressarcimento_centavos: c.ressarcimentoCentavos,
      ressarcimento_de: c.ressarcimentoDe,
      memoria_calculo: c.valido ? c.memoria : c.erros.join(" "),
      regra_calculo: REGRA_CALCULO,
      atualizado_em: new Date().toISOString(),
    };
  });
}

async function inserirTermo(ctx: Contexto, doc: DocumentoTermo, extra: { duplicadoDe?: string | null } = {}): Promise<string | null> {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const { data: codigo } = await ctx.supabase.rpc("termo_entrega_proximo_codigo");
    if (!codigo) break;
    const { data, error } = await ctx.supabase
      .from("termos_entrega")
      .insert({
        ...colunasDoTermo(doc),
        tenant_id: ctx.tenantId,
        codigo,
        status: "rascunho",
        versao: 1,
        responsavel_id: ctx.autor.id,
        criado_por: ctx.autor.id,
        criado_por_nome: ctx.autor.nome,
        atualizado_por: ctx.autor.id,
        duplicado_de: extra.duplicadoDe ?? null,
      })
      .select("id")
      .single();
    if (data) {
      if (doc.partes.length) await ctx.supabase.from("termo_entrega_partes").insert(linhasPartes(doc, data.id, ctx.tenantId));
      if (doc.encargos.length) {
        await ctx.supabase
          .from("termo_entrega_encargos")
          .insert(linhasEncargos(doc, data.id, ctx.tenantId).map((l) => ({ ...l, criado_por: ctx.autor.id, criado_por_nome: ctx.autor.nome })));
      }
      return data.id;
    }
    // código repetido (duas pessoas criando ao mesmo tempo): tenta o próximo
    if (error?.code !== "23505") {
      await avisar("erro", `Não foi possível criar o termo: ${error?.message ?? "erro desconhecido"}`);
      return null;
    }
  }
  await avisar("erro", "Não foi possível gerar o código do termo. Tente novamente.");
  return null;
}

// ---------------------------------------------------------------
// criar (em branco ou a partir de uma venda)
// ---------------------------------------------------------------

export async function criarTermo(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const modelo = await carregarModelo(ctx.supabase, ctx.tenantId);
  const doc = documentoVazio(modelo);
  const processoId = String(formData.get("processo_id") ?? "").trim();

  if (processoId) {
    const { data: processoRaw } = await ctx.supabase
      .from("processos")
      .select(
        `id, numero_processo, categoria,
         imoveis ( endereco, area_construida, matricula, inscricao_iptu, cep ),
         comprador:clientes!processos_comprador_id_fkey ( id, nome, cpf_cnpj, rg, email ),
         vendedor:clientes!processos_vendedor_id_fkey ( id, nome, cpf_cnpj, rg, email )`
      )
      .eq("id", processoId)
      .maybeSingle();
    type Cliente = { id: string; nome: string; cpf_cnpj: string | null; rg: string | null; email: string | null } | null;
    const processo = processoRaw as unknown as {
      id: string;
      imoveis: { endereco: string; area_construida: string | null; matricula: string | null; inscricao_iptu: string | null; cep: string | null } | null;
      comprador: Cliente;
      vendedor: Cliente;
    } | null;
    if (!processo) {
      await avisar("erro", "Venda não encontrada.");
      return;
    }
    doc.processoId = processo.id;
    const parte = (c: Cliente, papel: "vendedor" | "comprador") => {
      if (c) doc.partes.push({ id: randomUUID(), papel, nome: c.nome, cpfCnpj: c.cpf_cnpj ?? "", rg: c.rg ?? "", email: c.email ?? "", clienteId: c.id });
    };
    parte(processo.vendedor, "vendedor");
    parte(processo.comprador, "comprador");
    if (processo.imoveis) {
      doc.imovel.endereco = [processo.imoveis.endereco, processo.imoveis.cep ? `CEP ${processo.imoveis.cep}` : ""].filter(Boolean).join(", ");
      doc.imovel.areaPrivativa = processo.imoveis.area_construida ?? "";
      doc.imovel.matricula = processo.imoveis.matricula ?? "";
      doc.imovel.inscricaoIptu = processo.imoveis.inscricao_iptu ?? "";
    }
    // data prevista: etapa de entrega de chaves da venda, se existir
    const { data: etapa } = await ctx.supabase
      .from("etapas")
      .select("data_prevista, data_realizada")
      .eq("processo_id", processo.id)
      .ilike("nome", "%chave%")
      .order("ordem")
      .limit(1)
      .maybeSingle();
    doc.dataEntrega = etapa?.data_realizada ?? etapa?.data_prevista ?? null;
  }

  const id = await inserirTermo(ctx, normalizarDocumento(doc, modelo));
  if (!id) return;
  await registrar(ctx, id, 1, [{ acao: "criado", descricao: processoId ? "Termo criado a partir de uma venda." : "Termo criado em branco.", novo: { processo_id: processoId || null } }]);
  atualizar();
  redirect(`${BASE}/${id}`);
}

// ---------------------------------------------------------------
// salvar rascunho (chamado pelo editor)
// ---------------------------------------------------------------

export async function salvarTermo(id: string, bruto: unknown): Promise<{ ok: boolean; erro?: string }> {
  const ctx = await contexto();
  if (!ctx) return { ok: false, erro: "Sem permissão para alterar termos de entrega." };
  const atual = await carregarTermo(ctx.supabase, id, ctx.tenantId);
  if (!atual) return { ok: false, erro: "Termo não encontrado." };
  if (!podeEditarConteudo(atual.termo.status)) return { ok: false, erro: "Este termo não está em rascunho. Volte para edição ou crie uma nova versão." };

  const doc = normalizarDocumento(bruto, atual.modelo);
  // a venda vinculada não muda pela tela de edição
  doc.processoId = atual.documento.processoId;

  // ids vindos da tela não podem pertencer a outro termo
  const idsPartes = doc.partes.map((p) => p.id);
  const idsEncargos = doc.encargos.map((e) => e.id);
  const [{ data: partesAlheias }, { data: encargosAlheios }] = await Promise.all([
    idsPartes.length ? ctx.supabase.from("termo_entrega_partes").select("id").in("id", idsPartes).neq("termo_id", id) : Promise.resolve({ data: [] as { id: string }[] }),
    idsEncargos.length ? ctx.supabase.from("termo_entrega_encargos").select("id").in("id", idsEncargos).neq("termo_id", id) : Promise.resolve({ data: [] as { id: string }[] }),
  ]);
  if ((partesAlheias ?? []).length || (encargosAlheios ?? []).length) return { ok: false, erro: "Dados inconsistentes. Recarregue a página e tente de novo." };

  const { error: erroTermo } = await ctx.supabase
    .from("termos_entrega")
    .update({ ...colunasDoTermo(doc), atualizado_por: ctx.autor.id })
    .eq("id", id);
  if (erroTermo) return { ok: false, erro: `Não foi possível salvar: ${erroTermo.message}` };

  // partes: remove as que saíram, grava as demais
  const removerPartes = ctx.supabase.from("termo_entrega_partes").delete().eq("termo_id", id);
  const { error: e1 } = await (idsPartes.length ? removerPartes.not("id", "in", `(${idsPartes.join(",")})`) : removerPartes);
  const { error: e2 } = idsPartes.length ? await ctx.supabase.from("termo_entrega_partes").upsert(linhasPartes(doc, id, ctx.tenantId)) : { error: null };

  // encargos: os novos ganham "quem adicionou"; os existentes só são atualizados
  const existentes = new Set(atual.documento.encargos.map((e) => e.id));
  const linhas = linhasEncargos(doc, id, ctx.tenantId);
  const removerEncargos = ctx.supabase.from("termo_entrega_encargos").delete().eq("termo_id", id);
  const { error: e3 } = await (idsEncargos.length ? removerEncargos.not("id", "in", `(${idsEncargos.join(",")})`) : removerEncargos);
  const novos = linhas.filter((l) => !existentes.has(l.id)).map((l) => ({ ...l, criado_por: ctx.autor.id, criado_por_nome: ctx.autor.nome }));
  const antigos = linhas.filter((l) => existentes.has(l.id));
  const { error: e4 } = novos.length ? await ctx.supabase.from("termo_entrega_encargos").insert(novos) : { error: null };
  const { error: e5 } = antigos.length ? await ctx.supabase.from("termo_entrega_encargos").upsert(antigos) : { error: null };
  const erro = e1 ?? e2 ?? e3 ?? e4 ?? e5;
  if (erro) return { ok: false, erro: `Não foi possível salvar partes/encargos: ${erro.message}` };

  // anexos de encargos que deixaram de existir
  const orfaos = atual.anexos.filter((a) => a.encargo_id && !idsEncargos.includes(a.encargo_id));
  if (orfaos.length) {
    await ctx.supabase.storage.from(BUCKET_TERMOS).remove(orfaos.map((a) => a.caminho));
    await ctx.supabase.from("termo_entrega_anexos").delete().in("id", orfaos.map((a) => a.id));
  }

  await registrar(ctx, id, atual.termo.versao, descreverAlteracoes(atual.documento, doc));
  atualizar(id);
  return { ok: true };
}

// ---------------------------------------------------------------
// gerar a versão definitiva (retrato imutável)
// ---------------------------------------------------------------

export async function gerarDocumento(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "");
  const atual = await carregarTermo(ctx.supabase, id, ctx.tenantId);
  if (!atual) return;
  if (!podeEditarConteudo(atual.termo.status)) {
    await avisar("erro", "Só um rascunho pode ser gerado.");
    return;
  }
  const pendencias = pendenciasParaGerar(atual.documento);
  if (pendencias.length) {
    await avisar("erro", `Falta para gerar: ${pendencias.slice(0, 3).join(" ")}${pendencias.length > 3 ? ` (+${pendencias.length - 3})` : ""}`);
    return;
  }
  const agora = new Date().toISOString();
  const retrato = montarRetrato(atual.documento, { codigo: atual.termo.codigo, versao: atual.termo.versao, geradoEm: agora, geradoPorNome: ctx.autor.nome, modelo: atual.modelo });
  const hash = createHash("sha256").update(JSON.stringify(retrato)).digest("hex");
  const linha = {
    tenant_id: ctx.tenantId,
    termo_id: id,
    versao: atual.termo.versao,
    retrato: retrato as unknown as Json,
    hash,
    gerado_por: ctx.autor.id,
    gerado_por_nome: ctx.autor.nome,
    gerado_em: agora,
  };
  if (!(await checar(ctx.supabase.from("termo_entrega_versoes").upsert(linha, { onConflict: "termo_id,versao" }), "gerar o documento"))) return;
  if (!(await checar(ctx.supabase.from("termos_entrega").update({ status: "gerado", gerado_em: agora, atualizado_por: ctx.autor.id }).eq("id", id), "gerar o documento"))) return;
  await registrar(ctx, id, atual.termo.versao, [
    { acao: "pdf_gerado", descricao: `Documento gerado (versão ${atual.termo.versao}). Saldo: ${retrato.textos.resultado}`, novo: { hash, saldo_centavos: retrato.acerto.saldoCentavos, a_favor_de: retrato.acerto.aFavorDe } },
  ]);
  atualizar(id);
  await avisar("sucesso", "Documento gerado. Agora é só enviar para assinatura.");
  redirect(`${BASE}/${id}`);
}

export async function voltarParaEdicao(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "");
  const { data: termo } = await ctx.supabase.from("termos_entrega").select("status, versao").eq("id", id).maybeSingle();
  if (!termo) return;
  if (!podeVoltarParaEdicao(termo.status as StatusTermo)) {
    await avisar("erro", "Este termo já recebeu assinatura. Para alterar, crie uma nova versão.");
    return;
  }
  // links de assinatura ainda não usados deixam de valer
  await ctx.supabase.from("termo_entrega_signatarios").delete().eq("termo_id", id).eq("versao", termo.versao).is("assinado_em", null);
  if (!(await checar(ctx.supabase.from("termos_entrega").update({ status: "rascunho", enviado_em: null, atualizado_por: ctx.autor.id }).eq("id", id), "voltar para edição"))) return;
  await registrar(ctx, id, termo.versao, [{ acao: "voltou_para_edicao", descricao: "Termo voltou para edição (links de assinatura anteriores cancelados).", anterior: { status: termo.status } }]);
  atualizar(id);
  redirect(`${BASE}/${id}`);
}

// ---------------------------------------------------------------
// assinatura
// ---------------------------------------------------------------

export async function enviarParaAssinatura(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "");
  const atual = await carregarTermo(ctx.supabase, id, ctx.tenantId);
  if (!atual) return;
  if (!podeEnviarParaAssinatura(atual.termo.status)) {
    await avisar("erro", "Gere o documento antes de enviar para assinatura.");
    return;
  }
  const versao = atual.versoes.find((v) => v.versao === atual.termo.versao);
  if (!versao) {
    await avisar("erro", "Não encontrei a versão gerada. Gere o documento novamente.");
    return;
  }
  // quem assina é quem está no retrato da versão (não no rascunho)
  const partes = [...vendedores(versao.retrato.documento), ...compradores(versao.retrato.documento)];
  await ctx.supabase.from("termo_entrega_signatarios").delete().eq("termo_id", id).eq("versao", atual.termo.versao).is("assinado_em", null);
  const { error } = await ctx.supabase.from("termo_entrega_signatarios").insert(
    partes.map((p, ordem) => ({ tenant_id: ctx.tenantId, termo_id: id, versao: atual.termo.versao, parte_id: p.id, papel: p.papel, nome_esperado: p.nome, email: p.email || null, ordem }))
  );
  if (error) {
    await avisar("erro", `Não foi possível criar os links de assinatura: ${error.message}`);
    return;
  }
  const agora = new Date().toISOString();
  if (!(await checar(ctx.supabase.from("termos_entrega").update({ status: "aguardando_assinatura", enviado_em: agora, atualizado_por: ctx.autor.id }).eq("id", id), "enviar para assinatura"))) return;
  await registrar(ctx, id, atual.termo.versao, [{ acao: "enviado_para_assinatura", descricao: `Links de assinatura criados para ${partes.length} pessoa(s).`, novo: { signatarios: partes.map((p) => p.nome) } }]);
  atualizar(id);
  await avisar("sucesso", "Links de assinatura criados. Copie ou envie por e-mail para cada pessoa.");
}

export async function enviarLinkPorEmail(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const signatarioId = String(formData.get("signatario_id") ?? "");
  const { data: s } = await ctx.supabase.from("termo_entrega_signatarios").select("*, termos_entrega ( codigo, imovel_endereco, status, versao )").eq("id", signatarioId).maybeSingle();
  const termo = (s as unknown as { termos_entrega: { codigo: string; imovel_endereco: string | null; status: string; versao: number } | null } | null)?.termos_entrega;
  if (!s || !termo) return;
  if (s.assinado_em || s.versao !== termo.versao || !["aguardando_assinatura", "parcialmente_assinado"].includes(termo.status)) {
    await avisar("erro", "Este link não está mais aguardando assinatura.");
    return;
  }
  if (!s.email) {
    await avisar("erro", `${s.nome_esperado} não tem e-mail no termo. Copie o link e envie por outro meio.`);
    return;
  }
  const link = `${await obterSiteUrl()}/assinar-termo/${s.token}`;
  const primeiroNome = s.nome_esperado.split(" ")[0];
  const texto = `Olá, ${primeiroNome}.\n\nSegue o link para conferir e assinar eletronicamente o Termo de Entrega de Chaves e Proporcionalidade${termo.imovel_endereco ? ` do imóvel ${termo.imovel_endereco}` : ""}:\n\n${link}\n\nO link é pessoal. Em caso de dúvida, fale com a Sacra Imóveis.\n\nSacra Imóveis`;
  try {
    await enviarEmail({
      destinatarios: [s.email],
      assunto: `Termo de Entrega de Chaves para assinatura – ${termo.codigo}`,
      texto,
      html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1c1917;white-space:pre-wrap;">${texto.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div>`,
      nomeRemetente: "Sacra Imóveis",
      responderPara: ctx.email,
    });
  } catch (erro) {
    await avisar("erro", `Não foi possível enviar o e-mail: ${erro instanceof Error ? erro.message : String(erro)}`);
    return;
  }
  await ctx.supabase.from("termo_entrega_signatarios").update({ email_enviado_em: new Date().toISOString() }).eq("id", s.id);
  await registrar(ctx, s.termo_id, s.versao, [{ acao: "link_enviado_por_email", descricao: `Link de assinatura enviado por e-mail para ${s.nome_esperado} (${s.email}).` }]);
  atualizar(s.termo_id);
  await avisar("sucesso", `Link enviado para ${s.email}.`);
}

// ---------------------------------------------------------------
// nova versão, cancelar, duplicar, responsável
// ---------------------------------------------------------------

export async function criarNovaVersao(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "");
  const { data: termo } = await ctx.supabase.from("termos_entrega").select("status, versao").eq("id", id).maybeSingle();
  if (!termo) return;
  if (!podeCriarNovaVersao(termo.status as StatusTermo)) {
    await avisar("erro", "Nova versão só é necessária depois de alguma assinatura. Use “Voltar para edição”.");
    return;
  }
  // links ainda não assinados da versão antiga deixam de valer; as assinaturas feitas ficam guardadas
  await ctx.supabase.from("termo_entrega_signatarios").delete().eq("termo_id", id).eq("versao", termo.versao).is("assinado_em", null);
  const nova = termo.versao + 1;
  if (!(await checar(ctx.supabase.from("termos_entrega").update({ status: "rascunho", versao: nova, gerado_em: null, enviado_em: null, assinado_em: null, atualizado_por: ctx.autor.id }).eq("id", id), "criar a nova versão"))) return;
  await registrar(ctx, id, nova, [
    { acao: "nova_versao", descricao: `Versão ${nova} criada como nova minuta. A versão ${termo.versao} (${termo.status === "assinado" ? "assinada" : "parcialmente assinada"}) fica preservada.`, anterior: { versao: termo.versao, status: termo.status }, novo: { versao: nova } },
  ]);
  atualizar(id);
  redirect(`${BASE}/${id}`);
}

export async function cancelarTermo(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim().slice(0, 500) || null;
  const { data: termo } = await ctx.supabase.from("termos_entrega").select("status, versao").eq("id", id).maybeSingle();
  if (!termo || !podeCancelar(termo.status as StatusTermo)) return;
  await ctx.supabase.from("termo_entrega_signatarios").delete().eq("termo_id", id).eq("versao", termo.versao).is("assinado_em", null);
  if (!(await checar(ctx.supabase.from("termos_entrega").update({ status: "cancelado", cancelado_em: new Date().toISOString(), cancelado_por: ctx.autor.id, cancelado_motivo: motivo }).eq("id", id), "cancelar o termo"))) return;
  await registrar(ctx, id, termo.versao, [{ acao: "cancelado", descricao: `Termo cancelado${motivo ? `: ${motivo}` : "."}`, anterior: { status: termo.status } }]);
  atualizar(id);
  await avisar("sucesso", "Termo cancelado. O histórico e os documentos continuam guardados.");
}

export async function duplicarTermo(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "");
  const origem = await carregarTermo(ctx.supabase, id, ctx.tenantId);
  if (!origem) return;
  // cópia com ids novos; sem assinaturas, versões ou anexos
  const mapa = new Map<string, string>();
  const copia: DocumentoTermo = JSON.parse(JSON.stringify(origem.documento));
  copia.partes = copia.partes.map((p) => {
    const novo = randomUUID();
    mapa.set(p.id, novo);
    return { ...p, id: novo };
  });
  copia.encargos = copia.encargos.map((e) => ({ ...e, id: randomUUID() }));
  copia.ressarcimento.beneficiario = copia.ressarcimento.beneficiario === "outro" ? "outro" : (mapa.get(copia.ressarcimento.beneficiario) ?? "");
  copia.dataDocumento = null;
  const novoId = await inserirTermo(ctx, normalizarDocumento(copia, origem.modelo), { duplicadoDe: id });
  if (!novoId) return;
  await registrar(ctx, novoId, 1, [{ acao: "criado", descricao: `Termo criado como cópia de ${origem.termo.codigo}.`, novo: { duplicado_de: id } }]);
  atualizar();
  redirect(`${BASE}/${novoId}`);
}

export async function salvarResponsavel(formData: FormData) {
  const ctx = await contexto();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "");
  const responsavelId = String(formData.get("responsavel_id") ?? "").trim() || null;
  const { data: termo } = await ctx.supabase.from("termos_entrega").select("responsavel_id, versao, status").eq("id", id).maybeSingle();
  if (!termo || termo.status === "cancelado" || termo.responsavel_id === responsavelId) return;
  if (!(await checar(ctx.supabase.from("termos_entrega").update({ responsavel_id: responsavelId }).eq("id", id), "alterar o responsável"))) return;
  await registrar(ctx, id, termo.versao, [{ acao: "responsavel_alterado", descricao: "Responsável pelo termo alterado.", anterior: { responsavel_id: termo.responsavel_id }, novo: { responsavel_id: responsavelId } }]);
  atualizar(id);
}

// ---------------------------------------------------------------
// anexos (comprovantes por encargo)
// ---------------------------------------------------------------

export async function registrarAnexo(termoId: string, encargoId: string | null, caminho: string, nome: string, tamanho: number): Promise<{ ok: boolean; erro?: string; id?: string }> {
  const ctx = await contexto();
  if (!ctx) return { ok: false, erro: "Sem permissão." };
  if (!caminho.startsWith(`${ctx.tenantId}/${termoId}/`)) return { ok: false, erro: "Arquivo em local inválido." };
  const { data: termo } = await ctx.supabase.from("termos_entrega").select("versao").eq("id", termoId).maybeSingle();
  if (!termo) return { ok: false, erro: "Termo não encontrado." };
  const { data, error } = await ctx.supabase
    .from("termo_entrega_anexos")
    .insert({ tenant_id: ctx.tenantId, termo_id: termoId, encargo_id: encargoId, caminho, nome: nome.slice(0, 200), tamanho, enviado_por: ctx.autor.id, enviado_por_nome: ctx.autor.nome })
    .select("id")
    .single();
  if (error || !data) return { ok: false, erro: error?.message ?? "Não foi possível registrar o anexo." };
  await registrar(ctx, termoId, termo.versao, [{ acao: "anexo_adicionado", descricao: `Anexo adicionado: ${nome}.`, novo: { encargo_id: encargoId } }]);
  revalidatePath(`${BASE}/${termoId}`);
  return { ok: true, id: data.id };
}

export async function removerAnexo(anexoId: string): Promise<{ ok: boolean; erro?: string }> {
  const ctx = await contexto();
  if (!ctx) return { ok: false, erro: "Sem permissão." };
  const { data: anexo } = await ctx.supabase.from("termo_entrega_anexos").select("*, termos_entrega ( versao )").eq("id", anexoId).maybeSingle();
  if (!anexo) return { ok: false, erro: "Anexo não encontrado." };
  const { error } = await ctx.supabase.from("termo_entrega_anexos").delete().eq("id", anexoId);
  if (error) return { ok: false, erro: error.message };
  await ctx.supabase.storage.from(BUCKET_TERMOS).remove([anexo.caminho]);
  const versao = (anexo as unknown as { termos_entrega: { versao: number } | null }).termos_entrega?.versao ?? 1;
  await registrar(ctx, anexo.termo_id, versao, [{ acao: "anexo_removido", descricao: `Anexo removido: ${anexo.nome}.` }]);
  revalidatePath(`${BASE}/${anexo.termo_id}`);
  return { ok: true };
}

// ---------------------------------------------------------------
// modelo (Configurações › Termo de entrega de chaves)
// ---------------------------------------------------------------

export async function salvarModeloTermo(formData: FormData) {
  const ctx = await contexto("configurar");
  if (!ctx) return;
  const txt = (nome: string, limite: number) => String(formData.get(nome) ?? "").trim().slice(0, limite);
  const inteiro = (nome: string, padrao: number, min: number, max: number) => {
    const n = Math.round(Number(formData.get(nome)));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : padrao;
  };
  const { data: anterior } = await ctx.supabase.from("termo_entrega_config").select("*").eq("tenant_id", ctx.tenantId).maybeSingle();
  const timbradoNovo = txt("timbrado_caminho", 400);
  if (timbradoNovo && !timbradoNovo.startsWith(`${ctx.tenantId}/timbrado/`)) {
    await avisar("erro", "Arquivo do papel timbrado em local inválido.");
    return;
  }
  const novo = {
    tenant_id: ctx.tenantId,
    clausula_padrao: txt("clausula_padrao", 6000) || null,
    prazo_transferencia_dias: inteiro("prazo_transferencia_dias", 10, 0, 365),
    multa_diaria_centavos: Math.max(0, textoParaCentavos(formData.get("multa_diaria"))),
    observacoes_padrao: txt("observacoes_padrao", 3000) || null,
    texto_complementar: txt("texto_complementar", 3000) || null,
    cidade: txt("cidade", 120) || "Brasília – DF",
    timbrado_caminho: formData.get("timbrado_padrao") === "on" ? null : timbradoNovo || anterior?.timbrado_caminho || null,
    margem_superior: inteiro("margem_superior", 122, 40, 300),
    margem_inferior: inteiro("margem_inferior", 104, 40, 300),
    atualizado_por: ctx.autor.id,
    atualizado_em: new Date().toISOString(),
  };
  if (!(await checar(ctx.supabase.from("termo_entrega_config").upsert(novo), "salvar o modelo"))) return;
  await ctx.supabase.from("termo_entrega_eventos").insert({
    tenant_id: ctx.tenantId,
    termo_id: null,
    acao: "modelo_alterado",
    descricao: `Modelo do termo alterado (multa diária ${formatarCentavos(novo.multa_diaria_centavos)}, prazo ${novo.prazo_transferencia_dias} dias úteis). Vale para os próximos termos; os já criados não mudam.`,
    anterior: (anterior ?? null) as Json,
    novo: novo as unknown as Json,
    usuario_id: ctx.autor.id,
    usuario_nome: ctx.autor.nome,
  });
  revalidatePath(`${BASE}/configuracao`);
  await avisar("sucesso", `Modelo salvo em ${dataBR(hojeISO())}. Vale para os próximos termos.`);
}
