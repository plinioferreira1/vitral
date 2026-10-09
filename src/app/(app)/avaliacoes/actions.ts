"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { calcularAvaliacao, posicaoNaFaixa } from "@/lib/avaliacao/calculo";
import { hashConteudo } from "@/lib/avaliacao/conteudo";
import { parseCsvComparaveis } from "@/lib/avaliacao/csv";
import { gerarPdfAvaliacao } from "@/lib/avaliacao/pdf";
import type { Imagem } from "@/lib/avaliacao/pdf-base";
import { podeAcessarModulo, podeAprovar, podeConfigurar } from "@/lib/avaliacao/permissoes";
import {
  CHECKLIST_VISTORIA,
  FINALIDADES,
  LIMIARES_PADRAO,
  MODALIDADES,
  ROTULO_MODALIDADE_CURTO,
  SITUACOES_CHECKLIST,
  TIPOLOGIAS,
  VISTORIA_STATUS,
  valorDaListaLocal,
  type AjusteComparavel,
  type DadosAvaliacao,
} from "@/lib/avaliacao/tipos";
import { validarParaEmissao } from "@/lib/avaliacao/validacao";
import { avisar, checar } from "@/lib/aviso";
import { hojeISO } from "@/lib/data-br";
import type { Json, TablesInsert, TablesUpdate } from "@/lib/database.types";
import { normalizarData } from "@/lib/fatura-csv";
import { moedaParaNumero } from "@/lib/moeda";
import { obterSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { exigirUsuario } from "@/lib/usuario-atual";
import { BUCKET_AVALIACOES, carregarAvaliacao, carregarConfig, carregarFontesPdf, carregarImagensPdf, papelDe, paraComparavel } from "./dados";

// ---------------------------------------------------------------
// utilidades
// ---------------------------------------------------------------

function texto(formData: FormData, nome: string, limite = 4000): string {
  return String(formData.get(nome) ?? "").trim().slice(0, limite);
}
function textoOuNull(formData: FormData, nome: string, limite = 4000): string | null {
  return texto(formData, nome, limite) || null;
}
function numeroOuNull(formData: FormData, nome: string): number | null {
  const bruto = String(formData.get(nome) ?? "").trim();
  if (!bruto) return null;
  const n = moedaParaNumero(bruto);
  return n > 0 ? n : null;
}
function inteiroOuNull(formData: FormData, nome: string): number | null {
  const n = numeroOuNull(formData, nome);
  return n === null ? null : Math.round(n);
}
function dataOuNull(formData: FormData, nome: string): string | null {
  const bruto = texto(formData, nome, 20);
  return bruto ? normalizarData(bruto) : null;
}

async function contexto(avaliacaoId: string) {
  const sessao = await exigirUsuario();
  if (!sessao) return null;
  if (!podeAcessarModulo(sessao.nivel)) {
    await avisar("erro", "Você não tem acesso à Avaliação de Imóveis.");
    return null;
  }
  const supabase = await createClient();
  const completa = avaliacaoId ? await carregarAvaliacao(supabase, avaliacaoId, sessao.tenantId) : null;
  if (!completa) {
    await avisar("erro", "Avaliação não encontrada.");
    return null;
  }
  return { sessao, supabase, id: avaliacaoId, ...completa, papel: papelDe(sessao, completa.config) };
}
type Contexto = NonNullable<Awaited<ReturnType<typeof contexto>>>;

async function registrar(ctx: Contexto, tipo: string, descricao: string, dados: Record<string, unknown> = {}) {
  await ctx.supabase.from("avaliacao_eventos").insert({
    avaliacao_id: ctx.id,
    tenant_id: ctx.sessao.tenantId,
    tipo,
    descricao,
    dados: dados as Json,
    autor_id: ctx.sessao.userId,
    autor_nome: ctx.sessao.usuario.nome,
  });
}

/**
 * Toda alteração de conteúdo passa por aqui: registra o evento, conta a
 * revisão, atualiza o valor calculado e — se a avaliação já estava em
 * revisão, aprovada ou emitida — devolve a rascunho (a aprovação deixa
 * de valer; as versões emitidas continuam guardadas).
 */
async function aposEdicao(
  ctx: Contexto,
  evento: { tipo: string; descricao: string; dados?: Record<string, unknown> },
  patch: TablesUpdate<"avaliacoes"> = {}
): Promise<boolean> {
  const { data: comps } = await ctx.supabase.from("avaliacao_comparaveis").select("*").eq("avaliacao_id", ctx.id);
  const finalidade = (patch.finalidade ?? ctx.avaliacao.finalidade) as "venda" | "locacao";
  const area = patch.area_m2 !== undefined ? patch.area_m2 : ctx.avaliacao.area_m2;
  const calculo = calcularAvaliacao((comps ?? []).map(paraComparavel), finalidade, area);

  const atualizacao: TablesUpdate<"avaliacoes"> = {
    ...patch,
    valor_calculado: calculo.valorCalculado,
    revisao: ctx.linha.revisao + 1,
  };
  const statusAnterior = ctx.avaliacao.status;
  if (statusAnterior !== "rascunho") {
    Object.assign(atualizacao, {
      status: "rascunho",
      aprovado_por: null,
      aprovado_em: null,
      aprovado_hash: null,
      enviado_revisao_por: null,
      enviado_revisao_em: null,
    });
  }
  const ok = await checar(ctx.supabase.from("avaliacoes").update(atualizacao).eq("id", ctx.id), "salvar");
  if (!ok) return false;

  await registrar(ctx, evento.tipo, evento.descricao, evento.dados);
  if (statusAnterior === "aprovado" || statusAnterior === "em_revisao") {
    await registrar(ctx, "aprovacao_invalidada", "Conteúdo alterado: a avaliação voltou a rascunho e precisa de nova revisão.", {
      status_anterior: statusAnterior,
    });
  } else if (statusAnterior === "emitido") {
    await registrar(ctx, "nova_revisao", `Nova revisão aberta a partir da versão ${ctx.avaliacao.versao_atual} (que continua preservada).`);
  }
  revalidatePath(`/avaliacoes/${ctx.id}`);
  revalidatePath("/avaliacoes");
  return true;
}

async function editavel(ctx: Contexto): Promise<boolean> {
  if (ctx.avaliacao.status === "arquivado") {
    await avisar("erro", "Esta avaliação está arquivada. Reabra para editar.");
    return false;
  }
  return true;
}

// ---------------------------------------------------------------
// criação
// ---------------------------------------------------------------

export async function criarAvaliacao(formData: FormData) {
  const sessao = await exigirUsuario();
  if (!sessao) return;
  if (!podeAcessarModulo(sessao.nivel)) {
    await avisar("erro", "Você não tem acesso à Avaliação de Imóveis.");
    return;
  }
  const supabase = await createClient();

  const modalidade = valorDaListaLocal(MODALIDADES, formData.get("modalidade"), "estudo_comercial");
  const finalidade = valorDaListaLocal(FINALIDADES, formData.get("finalidade"), "venda");
  const tipologia = valorDaListaLocal(TIPOLOGIAS, formData.get("tipologia"), "residencial");
  const imovelId = texto(formData, "imovel_id", 40) || null;

  let titulo = texto(formData, "titulo", 200);
  const dados: DadosAvaliacao = {
    solicitante_nome: texto(formData, "solicitante_nome", 200) || undefined,
    solicitante_contato: texto(formData, "solicitante_contato", 200) || undefined,
    vistoria_status: "nao_realizada",
    ...(modalidade === "estudo_comercial" ? { objetivo: finalidade === "venda"
      ? "Orientar a definição do preço de divulgação para venda do imóvel."
      : "Orientar a definição do aluguel mensal para divulgação do imóvel." } : {}),
  };
  let proprietario = textoOuNull(formData, "proprietario_nome", 200);
  let area: number | null = numeroOuNull(formData, "area_m2");
  let bairro: string | null = textoOuNull(formData, "bairro", 120);

  if (imovelId) {
    const { data: imovel } = await supabase
      .from("imoveis")
      .select("endereco, matricula, tipo, cep, area_construida, area_lote, inscricao_iptu, valor_condominio, regiao_administrativa, clientes ( nome, cpf_cnpj )")
      .eq("id", imovelId)
      .maybeSingle();
    if (imovel) {
      titulo = titulo || imovel.endereco;
      dados.endereco = imovel.endereco;
      if (imovel.matricula) dados.matricula = imovel.matricula;
      if (imovel.cep) dados.cep = imovel.cep;
      if (imovel.inscricao_iptu) dados.inscricao_iptu = imovel.inscricao_iptu;
      if (imovel.valor_condominio) dados.valor_condominio = Number(imovel.valor_condominio);
      const areaConstruida = moedaParaNumero(imovel.area_construida ?? "");
      const areaLote = moedaParaNumero(imovel.area_lote ?? "");
      if (tipologia === "terreno" ? areaLote > 0 : areaConstruida > 0) area = tipologia === "terreno" ? areaLote : areaConstruida;
      if (areaLote > 0) dados.area_terreno_m2 = areaLote;
      bairro = bairro ?? imovel.regiao_administrativa;
      const dono = imovel.clientes as unknown as { nome: string; cpf_cnpj: string | null } | null;
      if (dono) {
        proprietario = proprietario ?? dono.nome;
        if (dono.cpf_cnpj) dados.proprietario_documento = dono.cpf_cnpj;
      }
    }
  }
  if (!titulo) {
    await avisar("erro", "Informe o endereço ou escolha um imóvel cadastrado.");
    return;
  }
  dados.endereco = dados.endereco ?? titulo;

  let criada: { id: string } | null = null;
  for (let tentativa = 0; tentativa < 3 && !criada; tentativa++) {
    const { data: codigo } = await supabase.rpc("avaliacao_proximo_codigo");
    const nova: TablesInsert<"avaliacoes"> = {
      tenant_id: sessao.tenantId,
      codigo: codigo ?? `AV-${hojeISO().slice(0, 4)}-${Date.now().toString().slice(-6)}`,
      modalidade,
      finalidade,
      tipologia,
      imovel_id: imovelId,
      titulo,
      proprietario_nome: proprietario,
      bairro,
      cidade: textoOuNull(formData, "cidade", 120) ?? "Brasília",
      data_base: hojeISO(),
      area_m2: area,
      dados: dados as Json,
      criado_por: sessao.userId,
    };
    const { data, error } = await supabase.from("avaliacoes").insert(nova).select("id").single();
    if (data) criada = data;
    else if (error?.code !== "23505") {
      await avisar("erro", `Não foi possível criar a avaliação: ${error?.message ?? "erro desconhecido"}`);
      return;
    }
  }
  if (!criada) {
    await avisar("erro", "Não foi possível gerar o código da avaliação. Tente de novo.");
    return;
  }
  await supabase.from("avaliacao_eventos").insert({
    avaliacao_id: criada.id,
    tenant_id: sessao.tenantId,
    tipo: "criacao",
    descricao: `Avaliação criada (${ROTULO_MODALIDADE_CURTO[modalidade]}, ${finalidade === "venda" ? "venda" : "locação"})${imovelId ? ", a partir de imóvel cadastrado no Vitral" : ""}.`,
    autor_id: sessao.userId,
    autor_nome: sessao.usuario.nome,
  });
  revalidatePath("/avaliacoes");
  redirect(`/avaliacoes/${criada.id}?etapa=dados`);
}

// ---------------------------------------------------------------
// formulário em etapas
// ---------------------------------------------------------------

type TipoCampo = "texto" | "numero" | "inteiro" | "bool" | "data";

const CAMPOS_DADOS: Record<string, Partial<Record<keyof DadosAvaliacao, TipoCampo>>> = {
  dados: {
    solicitante_nome: "texto",
    solicitante_documento: "texto",
    solicitante_contato: "texto",
    proprietario_documento: "texto",
    objetivo: "texto",
    destinatario: "texto",
  },
  imovel: {
    subtipo: "texto",
    endereco: "texto",
    complemento: "texto",
    uf: "texto",
    cep: "texto",
    endereco_abreviado_pdf: "bool",
    matricula: "texto",
    cartorio: "texto",
    inscricao_iptu: "texto",
    area_total_m2: "numero",
    area_terreno_m2: "numero",
    quartos: "inteiro",
    suites: "inteiro",
    banheiros: "inteiro",
    vagas: "inteiro",
    andar: "texto",
    posicao_solar: "texto",
    idade_anos: "inteiro",
    estado_conservacao: "texto",
    padrao_acabamento: "texto",
    valor_condominio: "numero",
    valor_iptu: "numero",
    frente_m: "numero",
    topografia: "texto",
    zoneamento: "texto",
    pe_direito_m: "numero",
    diferenciais: "texto",
    benfeitorias: "texto",
    confrontacoes: "texto",
    medidas_perimetricas: "texto",
    aproveitamento_economico: "texto",
    documentos_conferidos: "texto",
    lacunas: "texto",
  },
  vistoria: {
    vistoria_data: "data",
    vistoria_responsavel: "texto",
    vistoria_ressalvas: "texto",
    vistoria_divergencias: "texto",
  },
  localizacao: {
    localizacao_descricao: "texto",
    localizacao_atributos: "texto",
    localizacao_influencia: "texto",
    infraestrutura_entorno: "texto",
  },
  pesquisa: {
    recorte_geografico: "texto",
    recorte_periodo: "texto",
    recorte_criterios: "texto",
    ampliacao_justificativa: "texto",
    amostra_justificativa: "texto",
  },
  textos: {
    carta_texto: "texto",
    parecer_avaliadora: "texto",
    estrategia_posicionamento: "texto",
    estrategia_publico: "texto",
    estrategia_preparacao: "texto",
    estrategia_canais: "texto",
    estrategia_reavaliacao: "texto",
    conclusao_texto: "texto",
    limitacoes_texto: "texto",
    selo_numero: "texto",
    dam_numero: "texto",
    anexos_observacoes: "texto",
  },
};

export async function salvarEtapa(formData: FormData) {
  const ctx = await contexto(texto(formData, "avaliacao_id", 40));
  if (!ctx || !(await editavel(ctx))) return;
  const etapa = texto(formData, "etapa", 30);
  const simples = etapa === "dados_comerciais" && ctx.avaliacao.modalidade === "estudo_comercial";
  const definicao = simples ? { ...CAMPOS_DADOS.dados, ...CAMPOS_DADOS.imovel } : CAMPOS_DADOS[etapa];
  if (!definicao) return;

  const dados: Record<string, unknown> = { ...ctx.avaliacao.dados };
  const alterados: string[] = [];
  const definir = (chave: string, valor: unknown) => {
    const anterior = dados[chave] ?? null;
    const novo = valor === "" || valor === undefined ? null : valor;
    if (JSON.stringify(anterior) !== JSON.stringify(novo)) alterados.push(chave);
    if (novo === null) delete dados[chave];
    else dados[chave] = novo;
  };
  for (const [chave, tipo] of Object.entries(definicao)) {
    // Campo que a tela não mostrou (por tipo de imóvel ou de documento) fica como está.
    if (tipo === "bool" ? !formData.has(`${chave}__presente`) : !formData.has(chave)) continue;
    if (tipo === "bool") definir(chave, formData.get(chave) === "on" ? true : null);
    else if (tipo === "numero") definir(chave, numeroOuNull(formData, chave));
    else if (tipo === "inteiro") definir(chave, inteiroOuNull(formData, chave));
    else if (tipo === "data") definir(chave, dataOuNull(formData, chave));
    else definir(chave, texto(formData, chave));
  }

  const patch: TablesUpdate<"avaliacoes"> = {};
  const coluna = <K extends keyof TablesUpdate<"avaliacoes">>(chave: K, valor: TablesUpdate<"avaliacoes">[K]) => {
    if ((ctx.linha[chave as keyof typeof ctx.linha] ?? null) !== (valor ?? null)) {
      patch[chave] = valor;
      alterados.push(String(chave));
    }
  };

  if (etapa === "dados" || simples) {
    const modalidade = valorDaListaLocal(MODALIDADES, formData.get("modalidade"), ctx.avaliacao.modalidade);
    const finalidade = valorDaListaLocal(FINALIDADES, formData.get("finalidade"), ctx.avaliacao.finalidade);
    const tipologia = valorDaListaLocal(TIPOLOGIAS, formData.get("tipologia"), ctx.avaliacao.tipologia);
    if (modalidade !== ctx.avaliacao.modalidade && ctx.avaliacao.versao_atual > 0) {
      await avisar("erro", "A modalidade não pode mudar depois da primeira emissão. Duplique a avaliação para criar o outro documento.");
      return;
    }
    if (finalidade !== ctx.avaliacao.finalidade && ctx.comparaveis.length > 0) {
      await avisar("erro", "Há comparáveis cadastrados na finalidade atual. Venda e locação não se misturam: remova-os ou crie outra avaliação.");
      return;
    }
    coluna("modalidade", modalidade);
    coluna("finalidade", finalidade);
    coluna("tipologia", tipologia);
    coluna("data_base", dataOuNull(formData, "data_base"));
    coluna("proprietario_nome", textoOuNull(formData, "proprietario_nome", 200));
  }
  if (etapa === "imovel" || simples) {
    const titulo = texto(formData, "titulo", 200);
    if (!titulo) {
      await avisar("erro", "Informe a identificação do imóvel.");
      return;
    }
    coluna("titulo", titulo);
    coluna("bairro", textoOuNull(formData, "bairro", 120));
    coluna("cidade", textoOuNull(formData, "cidade", 120));
    coluna("area_m2", numeroOuNull(formData, "area_m2"));
  }
  if (etapa === "vistoria") {
    definir("vistoria_status", valorDaListaLocal(VISTORIA_STATUS, formData.get("vistoria_status"), "nao_realizada"));
    const checklist: Record<string, { situacao?: string; observacao?: string }> = {};
    for (const item of CHECKLIST_VISTORIA[ctx.avaliacao.tipologia]) {
      const situacao = String(formData.get(`ck_${item.chave}`) ?? "");
      const observacao = texto(formData, `ckobs_${item.chave}`, 500);
      if ((SITUACOES_CHECKLIST as readonly string[]).includes(situacao) || observacao) {
        checklist[item.chave] = {
          ...((SITUACOES_CHECKLIST as readonly string[]).includes(situacao) ? { situacao } : {}),
          ...(observacao ? { observacao } : {}),
        };
      }
    }
    definir("vistoria_checklist", Object.keys(checklist).length ? checklist : null);
  }

  if (alterados.length === 0) {
    await avisar("sucesso", "Nada mudou nesta etapa.");
    return;
  }
  patch.dados = dados as Json;
  const ok = await aposEdicao(
    ctx,
    { tipo: "edicao", descricao: `Etapa "${etapa}" editada.`, dados: { etapa, campos: alterados } },
    patch
  );
  if (ok) await avisar("sucesso", "Salvo.");
}

// ---------------------------------------------------------------
// precificação (edição auditável)
// ---------------------------------------------------------------

export async function salvarPrecificacao(formData: FormData) {
  const ctx = await contexto(texto(formData, "avaliacao_id", 40));
  if (!ctx || !(await editavel(ctx))) return;
  const a = ctx.avaliacao;
  const calc = ctx.conteudo.calculo;
  const fin = a.finalidade;
  const dados: Record<string, unknown> = { ...a.dados };
  const patch: TablesUpdate<"avaliacoes"> = {};
  const eventos: { tipo: string; descricao: string; dados: Record<string, unknown> }[] = [];

  // --- valor sugerido
  const usarCalculado = formData.get("acao") === "usar_calculado";
  const novoValor = usarCalculado ? calc.valorCalculado : numeroOuNull(formData, "valor_sugerido");
  const justificativaValor = usarCalculado ? "" : texto(formData, "justificativa_valor", 1500);
  if (usarCalculado && calc.valorCalculado === null) {
    await avisar("erro", "Ainda não há valor calculado: cadastre comparáveis válidos e a área do imóvel.");
    return;
  }
  if (novoValor !== a.valor_sugerido) {
    if (novoValor !== null && novoValor !== calc.valorCalculado && !justificativaValor) {
      await avisar("erro", "Para sugerir um valor diferente do calculado, escreva a justificativa.");
      return;
    }
    patch.valor_sugerido = novoValor;
    eventos.push({
      tipo: "valor_sugerido",
      descricao: usarCalculado ? "Valor sugerido igualado ao valor calculado." : "Valor sugerido editado manualmente.",
      dados: { anterior: a.valor_sugerido, novo: novoValor, calculado: calc.valorCalculado, justificativa: justificativaValor || null },
    });
  }
  const valorFinal = novoValor;
  if (valorFinal === null || valorFinal === calc.valorCalculado) delete dados.justificativa_valor;
  else if (justificativaValor) dados.justificativa_valor = justificativaValor;
  else if (!dados.justificativa_valor) {
    await avisar("erro", "O valor sugerido difere do calculado: escreva a justificativa.");
    return;
  }

  // --- faixa indicativa
  if (!usarCalculado) {
    const faixaManual = formData.get("faixa_manual") === "on";
    if (faixaManual) {
      const min = numeroOuNull(formData, "faixa_min");
      const max = numeroOuNull(formData, "faixa_max");
      const justificativaFaixa = texto(formData, "justificativa_faixa", 1500);
      if (min === null || max === null || min > max) {
        await avisar("erro", "Faixa indicativa inválida: informe mínimo e máximo, com o mínimo menor ou igual ao máximo.");
        return;
      }
      if (!justificativaFaixa) {
        await avisar("erro", "Para editar a faixa indicativa, escreva a justificativa.");
        return;
      }
      if (!a.faixa_manual || min !== a.faixa_min || max !== a.faixa_max || justificativaFaixa !== a.dados.justificativa_faixa) {
        patch.faixa_manual = true;
        patch.faixa_min = min;
        patch.faixa_max = max;
        dados.justificativa_faixa = justificativaFaixa;
        eventos.push({
          tipo: "faixa",
          descricao: "Faixa indicativa editada manualmente.",
          dados: {
            anterior: a.faixa_manual ? [a.faixa_min, a.faixa_max] : [calc.faixaCalculadaMin, calc.faixaCalculadaMax],
            novo: [min, max],
            calculada: [calc.faixaCalculadaMin, calc.faixaCalculadaMax],
            justificativa: justificativaFaixa,
          },
        });
      }
    } else if (a.faixa_manual) {
      patch.faixa_manual = false;
      patch.faixa_min = null;
      patch.faixa_max = null;
      delete dados.justificativa_faixa;
      eventos.push({
        tipo: "faixa",
        descricao: "Faixa indicativa voltou a ser a calculada pela amostra.",
        dados: { anterior: [a.faixa_min, a.faixa_max], novo: [calc.faixaCalculadaMin, calc.faixaCalculadaMax] },
      });
    }

    // --- demais campos
    const margem = numeroOuNull(formData, "margem_negociacao_pct");
    if (margem !== null && margem > 50) {
      await avisar("erro", "A margem de negociação deve ficar entre 0% e 50%.");
      return;
    }
    if (margem !== a.margem_negociacao_pct) {
      patch.margem_negociacao_pct = margem;
      eventos.push({ tipo: "margem", descricao: "Margem de negociação alterada.", dados: { anterior: a.margem_negociacao_pct, novo: margem } });
    }
    const valorProprietario = numeroOuNull(formData, "valor_proprietario");
    if (valorProprietario !== a.valor_proprietario) {
      patch.valor_proprietario = valorProprietario;
      eventos.push({
        tipo: "valor_proprietario",
        descricao: "Valor pretendido pelo proprietário registrado (não altera o valor sugerido).",
        dados: { anterior: a.valor_proprietario, novo: valorProprietario },
      });
    }
    const fundamentacao = texto(formData, "fundamentacao", 6000);
    if (fundamentacao !== (a.dados.fundamentacao ?? "")) {
      if (fundamentacao) dados.fundamentacao = fundamentacao;
      else delete dados.fundamentacao;
      eventos.push({ tipo: "edicao", descricao: "Fundamentação do valor editada.", dados: { campos: ["fundamentacao"] } });
    }
  }

  if (eventos.length === 0) {
    await avisar("sucesso", "Nada mudou na precificação.");
    return;
  }
  patch.dados = dados as Json;
  const [primeiro, ...resto] = eventos;
  const ok = await aposEdicao(ctx, primeiro, patch);
  if (!ok) return;
  for (const e of resto) await registrar(ctx, e.tipo, e.descricao, e.dados);

  const min = patch.faixa_manual === true ? (patch.faixa_min as number) : patch.faixa_manual === false || !a.faixa_manual ? calc.faixaCalculadaMin : a.faixa_min;
  const max = patch.faixa_manual === true ? (patch.faixa_max as number) : patch.faixa_manual === false || !a.faixa_manual ? calc.faixaCalculadaMax : a.faixa_max;
  const posicao = posicaoNaFaixa(valorFinal, min, max);
  await avisar(
    "sucesso",
    posicao === "abaixo" || posicao === "acima"
      ? `Salvo. Atenção: o valor sugerido ficou ${posicao} da faixa indicativa.`
      : `Salvo${fin === "locacao" ? " (valores mensais)" : ""}.`
  );
}

// ---------------------------------------------------------------
// comparáveis
// ---------------------------------------------------------------

function camposComparavel(formData: FormData) {
  return {
    identificacao: texto(formData, "identificacao", 200),
    regiao: textoOuNull(formData, "regiao", 120),
    tipologia: (TIPOLOGIAS as readonly string[]).includes(String(formData.get("tipologia"))) ? String(formData.get("tipologia")) : null,
    area_m2: numeroOuNull(formData, "area_m2"),
    quartos: inteiroOuNull(formData, "quartos"),
    suites: inteiroOuNull(formData, "suites"),
    vagas: inteiroOuNull(formData, "vagas"),
    preco: numeroOuNull(formData, "preco"),
    tipo_preco: formData.get("tipo_preco") === "transacao" ? "transacao" : "oferta",
    fonte_tipo: formData.get("fonte_tipo") === "externo" ? "externo" : formData.get("fonte_tipo") === "interno" ? "interno" : "manual",
    fonte_nome: textoOuNull(formData, "fonte_nome", 160),
    fonte_url: textoOuNull(formData, "fonte_url", 600),
    referencia_interna: textoOuNull(formData, "referencia_interna", 160),
    data_coleta: dataOuNull(formData, "data_coleta"),
    data_atualizacao: dataOuNull(formData, "data_atualizacao"),
    status_anuncio: textoOuNull(formData, "status_anuncio", 80),
    diferencas: textoOuNull(formData, "diferencas", 800),
    observacoes: textoOuNull(formData, "observacoes", 800),
  };
}

export async function salvarComparavel(formData: FormData) {
  const ctx = await contexto(texto(formData, "avaliacao_id", 40));
  if (!ctx || !(await editavel(ctx))) return;
  const campos = camposComparavel(formData);
  const anterior = ctx.comparaveis.find(x => x.id === texto(formData, "comparavel_id", 40));
  if (ctx.avaliacao.modalidade === "estudo_comercial" && anterior) {
    for (const chave of ["tipologia", "quartos", "suites", "vagas", "data_atualizacao", "status_anuncio", "diferencas"] as const) {
      if (!formData.has(chave)) Object.assign(campos, { [chave]: anterior[chave] });
    }
  }
  if (!campos.identificacao) {
    await avisar("erro", "Informe a identificação do comparável.");
    return;
  }
  if (ctx.avaliacao.modalidade === "estudo_comercial" && (!campos.area_m2 || !campos.preco)) {
    await avisar("erro", "Informe a área e o preço do imóvel comparável, maiores que zero.");
    return;
  }
  if (campos.fonte_url && !/^https?:\/\//i.test(campos.fonte_url)) {
    await avisar("erro", "O link da fonte precisa começar com http:// ou https://.");
    return;
  }
  const comparavelId = texto(formData, "comparavel_id", 40);
  if (comparavelId) {
    const ok = await checar(
      ctx.supabase.from("avaliacao_comparaveis").update({ ...campos, reconferir: false }).eq("id", comparavelId).eq("avaliacao_id", ctx.id),
      "salvar o comparável"
    );
    if (!ok) return;
    await aposEdicao(ctx, { tipo: "comparavel_editado", descricao: `Comparável "${campos.identificacao}" editado.`, dados: { comparavel_id: comparavelId } });
  } else {
    const ok = await checar(
      ctx.supabase.from("avaliacao_comparaveis").insert({
        ...campos,
        avaliacao_id: ctx.id,
        tenant_id: ctx.sessao.tenantId,
        finalidade: ctx.avaliacao.finalidade,
        tipologia: campos.tipologia ?? ctx.avaliacao.tipologia,
        ordem: ctx.comparaveis.length + 1,
        inserido_por: ctx.sessao.userId,
      }),
      "adicionar o comparável"
    );
    if (!ok) return;
    await aposEdicao(ctx, {
      tipo: "comparavel_adicionado",
      descricao: `Comparável "${campos.identificacao}" adicionado (${campos.fonte_tipo}).`,
      dados: { preco: campos.preco, area_m2: campos.area_m2, fonte: campos.fonte_nome, tipo_preco: campos.tipo_preco },
    });
  }
  await avisar("sucesso", "Comparável salvo.");
}

/** Traz vendas intermediadas (processos do Vitral) como transações confirmadas. */
export async function importarComparaveisInternos(formData: FormData) {
  const ctx = await contexto(texto(formData, "avaliacao_id", 40));
  if (!ctx || !(await editavel(ctx))) return;
  if (ctx.avaliacao.finalidade !== "venda") {
    await avisar("erro", "A base interna tem valores de venda. Para locação, lance os comparáveis manualmente ou por planilha.");
    return;
  }
  const ids = formData.getAll("processo_ids").map(String).filter(Boolean).slice(0, 30);
  if (ids.length === 0) {
    await avisar("erro", "Marque ao menos uma venda da base interna.");
    return;
  }
  const { data: processos } = await ctx.supabase
    .from("processos")
    .select("id, numero_processo, status, valor_total, data_assinatura, data_conclusao, imoveis ( endereco, area_construida, regiao_administrativa )")
    .in("id", ids)
    .eq("categoria", "venda");
  const jaUsados = new Set(ctx.comparaveis.map((c) => c.referencia_interna));
  const novos = (processos ?? [])
    .filter((p) => !jaUsados.has(p.numero_processo) && Number(p.valor_total) > 0)
    .map((p, i) => {
      const imovel = p.imoveis as unknown as { endereco: string; area_construida: string | null; regiao_administrativa: string | null } | null;
      const area = moedaParaNumero(imovel?.area_construida ?? "");
      return {
        avaliacao_id: ctx.id,
        tenant_id: ctx.sessao.tenantId,
        ordem: ctx.comparaveis.length + i + 1,
        identificacao: imovel?.endereco ?? p.numero_processo,
        regiao: imovel?.regiao_administrativa ?? null,
        finalidade: "venda",
        tipologia: ctx.avaliacao.tipologia,
        area_m2: area > 0 ? area : null,
        preco: Number(p.valor_total),
        tipo_preco: "transacao",
        fonte_tipo: "interno",
        fonte_nome: "Base interna do Vitral — venda intermediada pela Sacra Netimóveis",
        referencia_interna: p.numero_processo,
        data_coleta: hojeISO(),
        data_atualizacao: p.data_conclusao ?? p.data_assinatura ?? null,
        status_anuncio: p.status === "concluido" ? "Negócio concluído" : "Negócio em andamento",
        inserido_por: ctx.sessao.userId,
      } satisfies TablesInsert<"avaliacao_comparaveis">;
    });
  if (novos.length === 0) {
    await avisar("erro", "Essas vendas já estão na amostra ou não têm valor registrado.");
    return;
  }
  if (!(await checar(ctx.supabase.from("avaliacao_comparaveis").insert(novos), "importar"))) return;
  await aposEdicao(ctx, {
    tipo: "comparaveis_importados",
    descricao: `${novos.length} venda(s) da base interna adicionada(s) como transação confirmada.`,
    dados: { processos: novos.map((n) => n.referencia_interna) },
  });
  const semArea = novos.filter((n) => n.area_m2 === null).length;
  await avisar("sucesso", `${novos.length} comparável(is) importado(s).${semArea ? ` ${semArea} sem área cadastrada: complete para entrarem no cálculo.` : ""}`);
}

/** Importa comparáveis de uma planilha (CSV) exportada de fonte externa autorizada. */
export async function importarComparaveisCsv(formData: FormData) {
  const ctx = await contexto(texto(formData, "avaliacao_id", 40));
  if (!ctx || !(await editavel(ctx))) return;
  const fonteNome = texto(formData, "fonte_nome", 160);
  if (!fonteNome) {
    await avisar("erro", "Informe de qual fonte veio a planilha.");
    return;
  }
  const arquivo = formData.get("arquivo");
  let conteudoCsv = String(formData.get("csv") ?? "");
  if (arquivo instanceof File && arquivo.size > 0) {
    if (arquivo.size > 500_000) {
      await avisar("erro", "Planilha muito grande (limite de 500 KB).");
      return;
    }
    conteudoCsv = await arquivo.text();
  }
  const { itens, erros } = parseCsvComparaveis(conteudoCsv);
  if (itens.length === 0) {
    await avisar("erro", erros[0] ?? "Nenhuma linha válida na planilha.");
    return;
  }
  const hoje = hojeISO();
  const novos = itens.slice(0, 60).map(
    (item, i) =>
      ({
        ...item,
        data_coleta: item.data_coleta ?? hoje,
        avaliacao_id: ctx.id,
        tenant_id: ctx.sessao.tenantId,
        ordem: ctx.comparaveis.length + i + 1,
        finalidade: ctx.avaliacao.finalidade,
        tipologia: ctx.avaliacao.tipologia,
        fonte_tipo: "externo",
        fonte_nome: fonteNome,
        inserido_por: ctx.sessao.userId,
      }) satisfies TablesInsert<"avaliacao_comparaveis">
  );
  if (!(await checar(ctx.supabase.from("avaliacao_comparaveis").insert(novos), "importar a planilha"))) return;
  await aposEdicao(ctx, {
    tipo: "comparaveis_importados",
    descricao: `${novos.length} comparável(is) importado(s) por planilha da fonte "${fonteNome}".`,
    dados: { avisos: erros.slice(0, 10) },
  });
  await avisar("sucesso", `${novos.length} comparável(is) importado(s).${erros.length ? ` ${erros.length} aviso(s): ${erros[0]}` : ""}`);
}

export async function alterarInclusaoComparavel(formData: FormData) {
  const ctx = await contexto(texto(formData, "avaliacao_id", 40));
  if (!ctx || !(await editavel(ctx))) return;
  const comparavel = ctx.comparaveis.find((c) => c.id === texto(formData, "comparavel_id", 40));
  if (!comparavel) return;
  const incluir = formData.get("acao") === "incluir";
  if (incluir) {
    const ok = await checar(
      ctx.supabase
        .from("avaliacao_comparaveis")
        .update({ incluido: true, duplicata: false, motivo_exclusao: null, excluido_por: null, excluido_em: null })
        .eq("id", comparavel.id),
      "reincluir"
    );
    if (!ok) return;
    await aposEdicao(ctx, { tipo: "comparavel_reincluido", descricao: `Comparável "${comparavel.identificacao}" voltou à amostra.`, dados: { motivo_anterior: comparavel.motivo_exclusao } });
  } else {
    const motivo = texto(formData, "motivo_exclusao", 600);
    if (!motivo) {
      await avisar("erro", "Escreva a justificativa da exclusão.");
      return;
    }
    const duplicata = formData.get("duplicata") === "on";
    const ok = await checar(
      ctx.supabase
        .from("avaliacao_comparaveis")
        .update({ incluido: false, duplicata, motivo_exclusao: motivo, excluido_por: ctx.sessao.userId, excluido_em: new Date().toISOString() })
        .eq("id", comparavel.id),
      "excluir da amostra"
    );
    if (!ok) return;
    await aposEdicao(ctx, {
      tipo: "comparavel_excluido",
      descricao: `Comparável "${comparavel.identificacao}" excluído da amostra${duplicata ? " (duplicata)" : ""}.`,
      dados: { motivo, duplicata },
    });
  }
  await avisar("sucesso", incluir ? "Comparável reincluído." : "Comparável excluído da amostra (continua registrado, com a justificativa).");
}

export async function moverComparavel(formData: FormData) {
  const ctx = await contexto(texto(formData, "avaliacao_id", 40));
  if (!ctx || !(await editavel(ctx))) return;
  const lista = [...ctx.comparaveis];
  const indice = lista.findIndex((c) => c.id === texto(formData, "comparavel_id", 40));
  const destino = indice + (formData.get("direcao") === "subir" ? -1 : 1);
  if (indice < 0 || destino < 0 || destino >= lista.length) return;
  [lista[indice], lista[destino]] = [lista[destino], lista[indice]];
  await Promise.all(lista.map((c, i) => ctx.supabase.from("avaliacao_comparaveis").update({ ordem: i + 1 }).eq("id", c.id)));
  await aposEdicao(ctx, { tipo: "comparaveis_reordenados", descricao: "Ordem dos comparáveis alterada." });
}

export async function removerComparavel(formData: FormData) {
  const ctx = await contexto(texto(formData, "avaliacao_id", 40));
  if (!ctx || !(await editavel(ctx))) return;
  const comparavel = ctx.comparaveis.find((c) => c.id === texto(formData, "comparavel_id", 40));
  if (!comparavel) return;
  if (!(await checar(ctx.supabase.from("avaliacao_comparaveis").delete().eq("id", comparavel.id), "remover"))) return;
  if (comparavel.foto_caminho) await ctx.supabase.storage.from(BUCKET_AVALIACOES).remove([comparavel.foto_caminho]);
  await aposEdicao(ctx, {
    tipo: "comparavel_removido",
    descricao: `Comparável "${comparavel.identificacao}" removido do cadastro.`,
    dados: { preco: comparavel.preco, area_m2: comparavel.area_m2, fonte: comparavel.fonte_nome, link: comparavel.fonte_url },
  });
  await avisar("sucesso", "Comparável removido (o registro fica no histórico).");
}

export async function adicionarAjuste(formData: FormData) {
  const ctx = await contexto(texto(formData, "avaliacao_id", 40));
  if (!ctx || !(await editavel(ctx))) return;
  const comparavel = ctx.comparaveis.find((c) => c.id === texto(formData, "comparavel_id", 40));
  if (!comparavel) return;
  const fator = texto(formData, "fator", 80);
  const percentual = Number(String(formData.get("percentual") ?? "").replace(",", "."));
  const justificativa = texto(formData, "justificativa", 800);
  if (!fator || !Number.isFinite(percentual) || percentual === 0 || Math.abs(percentual) > 60) {
    await avisar("erro", "Informe o fator e um percentual diferente de zero (entre -60% e +60%).");
    return;
  }
  if (!justificativa) {
    await avisar("erro", "Todo ajuste precisa de justificativa.");
    return;
  }
  const ajuste: AjusteComparavel = {
    fator,
    percentual,
    justificativa,
    origem: texto(formData, "origem", 200) || undefined,
    autor_id: ctx.sessao.userId,
    autor_nome: ctx.sessao.usuario.nome,
    em: hojeISO(),
  };
  const ajustes = [...comparavel.ajustes, ajuste];
  if (!(await checar(ctx.supabase.from("avaliacao_comparaveis").update({ ajustes: ajustes as unknown as Json }).eq("id", comparavel.id), "lançar o ajuste"))) return;
  await aposEdicao(ctx, {
    tipo: "ajuste_adicionado",
    descricao: `Ajuste "${fator}" de ${percentual > 0 ? "+" : ""}${percentual}% em "${comparavel.identificacao}".`,
    dados: { ...ajuste },
  });
  await avisar("sucesso", "Ajuste lançado.");
}

export async function removerAjuste(formData: FormData) {
  const ctx = await contexto(texto(formData, "avaliacao_id", 40));
  if (!ctx || !(await editavel(ctx))) return;
  const comparavel = ctx.comparaveis.find((c) => c.id === texto(formData, "comparavel_id", 40));
  const indice = Number(formData.get("indice"));
  if (!comparavel || !Number.isInteger(indice) || !comparavel.ajustes[indice]) return;
  const removido = comparavel.ajustes[indice];
  const ajustes = comparavel.ajustes.filter((_, i) => i !== indice);
  if (!(await checar(ctx.supabase.from("avaliacao_comparaveis").update({ ajustes: ajustes as unknown as Json }).eq("id", comparavel.id), "remover o ajuste"))) return;
  await aposEdicao(ctx, {
    tipo: "ajuste_removido",
    descricao: `Ajuste "${removido.fator}" (${removido.percentual}%) removido de "${comparavel.identificacao}".`,
    dados: { ...removido },
  });
  await avisar("sucesso", "Ajuste removido.");
}

// ---------------------------------------------------------------
// fotos e anexos (o arquivo já foi enviado ao bucket pelo navegador)
// ---------------------------------------------------------------

export async function registrarArquivo(entrada: {
  avaliacaoId: string;
  tipo: string;
  caminho: string;
  nome: string;
  mime: string;
  tamanho: number;
  comparavelId?: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const ctx = await contexto(entrada.avaliacaoId);
  if (!ctx) return { ok: false, erro: "Avaliação não encontrada." };
  if (ctx.avaliacao.status === "arquivado") return { ok: false, erro: "Avaliação arquivada." };
  const prefixo = `${ctx.sessao.tenantId}/${ctx.id}/`;
  if (!entrada.caminho.startsWith(prefixo) || entrada.caminho.includes("/versoes/") || entrada.caminho.includes("..")) {
    return { ok: false, erro: "Caminho de arquivo inválido." };
  }
  if (!["image/jpeg", "image/png", "application/pdf"].includes(entrada.mime)) return { ok: false, erro: "Tipo de arquivo não aceito." };

  if (entrada.comparavelId) {
    const comparavel = ctx.comparaveis.find((c) => c.id === entrada.comparavelId);
    if (!comparavel || !entrada.mime.startsWith("image/")) return { ok: false, erro: "Comparável não encontrado." };
    const { error } = await ctx.supabase.from("avaliacao_comparaveis").update({ foto_caminho: entrada.caminho }).eq("id", comparavel.id);
    if (error) return { ok: false, erro: error.message };
    if (comparavel.foto_caminho) await ctx.supabase.storage.from(BUCKET_AVALIACOES).remove([comparavel.foto_caminho]);
    await aposEdicao(ctx, { tipo: "foto_comparavel", descricao: `Foto do comparável "${comparavel.identificacao}" atualizada.` });
    return { ok: true };
  }

  const tipo = ["imovel", "vistoria", "mapa", "matricula", "anexo"].includes(entrada.tipo) ? entrada.tipo : "anexo";
  const doTipo = ctx.arquivos.filter((a) => a.tipo === tipo);
  const { error } = await ctx.supabase.from("avaliacao_arquivos").insert({
    avaliacao_id: ctx.id,
    tenant_id: ctx.sessao.tenantId,
    tipo,
    caminho_storage: entrada.caminho,
    nome_arquivo: entrada.nome.slice(0, 200),
    capa: tipo === "imovel" && doTipo.length === 0,
    ordem: ctx.arquivos.length + 1,
    mime_type: entrada.mime,
    tamanho_bytes: Math.max(1, Math.round(entrada.tamanho)),
    criado_por: ctx.sessao.userId,
  });
  if (error) return { ok: false, erro: error.message };
  await aposEdicao(ctx, { tipo: "arquivo_adicionado", descricao: `Arquivo "${entrada.nome}" adicionado (${tipo}).` });
  return { ok: true };
}

export async function atualizarArquivo(formData: FormData) {
  const ctx = await contexto(texto(formData, "avaliacao_id", 40));
  if (!ctx || !(await editavel(ctx))) return;
  const arquivo = ctx.arquivos.find((a) => a.id === texto(formData, "arquivo_id", 40));
  if (!arquivo) return;
  const acao = String(formData.get("acao"));
  if (acao === "remover") {
    if (!(await checar(ctx.supabase.from("avaliacao_arquivos").delete().eq("id", arquivo.id), "remover o arquivo"))) return;
    await ctx.supabase.storage.from(BUCKET_AVALIACOES).remove([arquivo.caminho_storage]);
    await aposEdicao(ctx, { tipo: "arquivo_removido", descricao: `Arquivo "${arquivo.nome_arquivo}" removido.` });
  } else if (acao === "capa") {
    await ctx.supabase.from("avaliacao_arquivos").update({ capa: false }).eq("avaliacao_id", ctx.id).eq("tipo", "imovel");
    await ctx.supabase.from("avaliacao_arquivos").update({ capa: true }).eq("id", arquivo.id);
    await aposEdicao(ctx, { tipo: "capa", descricao: `Foto de capa definida: "${arquivo.nome_arquivo}".` });
  } else {
    const legenda = textoOuNull(formData, "legenda", 120);
    await ctx.supabase.from("avaliacao_arquivos").update({ legenda }).eq("id", arquivo.id);
    await aposEdicao(ctx, { tipo: "legenda", descricao: `Legenda de "${arquivo.nome_arquivo}" alterada.` });
  }
  await avisar("sucesso", "Salvo.");
}

// ---------------------------------------------------------------
// revisão, aprovação, emissão e histórico
// ---------------------------------------------------------------

export async function enviarParaRevisao(formData: FormData) {
  const ctx = await contexto(texto(formData, "avaliacao_id", 40));
  if (!ctx) return;
  if (ctx.avaliacao.status !== "rascunho") {
    await avisar("erro", "Só um rascunho pode ser enviado para revisão.");
    return;
  }
  const validacao = validarParaEmissao(ctx.conteudo);
  if (validacao.bloqueios.length > 0) {
    await avisar("erro", `Ainda há ${validacao.bloqueios.length} pendência(s) que impedem a emissão. Veja a lista na etapa Revisão.`);
    return;
  }
  const ok = await checar(
    ctx.supabase
      .from("avaliacoes")
      .update({ status: "em_revisao", enviado_revisao_por: ctx.sessao.userId, enviado_revisao_em: new Date().toISOString(), comentario_revisao: null })
      .eq("id", ctx.id),
    "enviar para revisão"
  );
  if (!ok) return;
  await registrar(ctx, "enviado_revisao", "Enviado para revisão.", { revisao: ctx.linha.revisao });
  revalidatePath(`/avaliacoes/${ctx.id}`);
  revalidatePath("/avaliacoes");
  await avisar(
    "sucesso",
    ctx.avaliacao.modalidade === "ptam"
      ? `Enviado para a revisão de ${ctx.config.responsavel.nome || "a avaliadora responsável"}.`
      : "Enviado para revisão."
  );
}

export async function devolverParaAjustes(formData: FormData) {
  const ctx = await contexto(texto(formData, "avaliacao_id", 40));
  if (!ctx) return;
  if (!podeAprovar(ctx.papel, ctx.avaliacao.modalidade)) {
    await avisar("erro", "Você não tem atribuição para revisar esta avaliação.");
    return;
  }
  if (ctx.avaliacao.status !== "em_revisao" && ctx.avaliacao.status !== "aprovado") {
    await avisar("erro", "Só é possível devolver uma avaliação em revisão ou aprovada.");
    return;
  }
  const comentario = texto(formData, "comentario", 2000);
  if (!comentario) {
    await avisar("erro", "Escreva o que precisa ser ajustado.");
    return;
  }
  const ok = await checar(
    ctx.supabase
      .from("avaliacoes")
      .update({ status: "rascunho", comentario_revisao: comentario, aprovado_por: null, aprovado_em: null, aprovado_hash: null })
      .eq("id", ctx.id),
    "devolver"
  );
  if (!ok) return;
  await registrar(ctx, "devolvido", "Devolvido para ajustes.", { comentario });
  revalidatePath(`/avaliacoes/${ctx.id}`);
  revalidatePath("/avaliacoes");
  await avisar("sucesso", "Devolvido para ajustes.");
}

export async function aprovarAvaliacao(formData: FormData) {
  const ctx = await contexto(texto(formData, "avaliacao_id", 40));
  if (!ctx) return;
  const ptam = ctx.avaliacao.modalidade === "ptam";
  if (!podeAprovar(ctx.papel, ctx.avaliacao.modalidade)) {
    await avisar("erro", ptam ? "Só a avaliadora responsável aprova um PTAM." : "Só diretor, gerente ou a avaliadora responsável aprovam o estudo.");
    return;
  }
  if (ctx.avaliacao.status !== "em_revisao" && ctx.avaliacao.status !== "rascunho") {
    await avisar("erro", "Esta avaliação não está aguardando aprovação.");
    return;
  }
  const validacao = validarParaEmissao(ctx.conteudo);
  if (validacao.bloqueios.length > 0) {
    await avisar("erro", `Há ${validacao.bloqueios.length} pendência(s) que impedem a aprovação. Veja a lista na etapa Revisão.`);
    return;
  }
  if (ptam) {
    const { data: assinatura } = await ctx.supabase.from("avaliacao_assinaturas").select("usuario_id").eq("usuario_id", ctx.sessao.userId).maybeSingle();
    if (!assinatura) {
      await avisar("erro", "Cadastre a sua assinatura em Configuração da avaliação antes de aprovar um PTAM.");
      return;
    }
  }
  const hash = hashConteudo(ctx.conteudo);
  const ok = await checar(
    ctx.supabase.from("avaliacoes").update({ status: "aprovado", aprovado_hash: hash, comentario_revisao: null }).eq("id", ctx.id),
    "aprovar"
  );
  if (!ok) return;
  await registrar(ctx, "aprovado", `Aprovado por ${ctx.sessao.usuario.nome}.`, { hash, revisao: ctx.linha.revisao, comentario: texto(formData, "comentario", 2000) || null });
  revalidatePath(`/avaliacoes/${ctx.id}`);
  revalidatePath("/avaliacoes");
  await avisar("sucesso", "Aprovado. A aprovação vale para este conteúdo exato: qualquer edição exige nova revisão.");
}

export async function emitirVersao(formData: FormData) {
  const ctx = await contexto(texto(formData, "avaliacao_id", 40));
  if (!ctx) return;
  const a = ctx.avaliacao;
  const ptam = a.modalidade === "ptam";
  if (a.status !== "aprovado") {
    await avisar("erro", "Só é possível emitir uma avaliação aprovada.");
    return;
  }
  if (!podeAprovar(ctx.papel, a.modalidade)) {
    await avisar("erro", "Você não tem atribuição para emitir esta avaliação.");
    return;
  }
  const hash = hashConteudo(ctx.conteudo);
  if (hash !== ctx.linha.aprovado_hash) {
    await ctx.supabase.from("avaliacoes").update({ status: "rascunho", aprovado_por: null, aprovado_em: null, aprovado_hash: null }).eq("id", ctx.id);
    await registrar(ctx, "aprovacao_invalidada", "O conteúdo mudou depois da aprovação: emissão recusada e avaliação devolvida a rascunho.");
    revalidatePath(`/avaliacoes/${ctx.id}`);
    await avisar("erro", "O conteúdo mudou depois da aprovação. A avaliação voltou a rascunho e precisa de nova revisão.");
    return;
  }
  const validacao = validarParaEmissao(ctx.conteudo);
  if (validacao.bloqueios.length > 0) {
    await avisar("erro", "Há pendências que impedem a emissão. Veja a lista na etapa Revisão.");
    return;
  }

  const aprovadoPorResponsavel = !!ctx.config.responsavel.usuario_id && ctx.linha.aprovado_por === ctx.config.responsavel.usuario_id;
  // A assinatura só entra quando a própria avaliadora aprovou E é ela quem emite.
  let assinatura: Imagem | null = null;
  if (aprovadoPorResponsavel && ctx.papel.ehResponsavelTecnica) {
    const { data } = await ctx.supabase.from("avaliacao_assinaturas").select("imagem").eq("usuario_id", ctx.sessao.userId).maybeSingle();
    const base64 = data?.imagem?.split(",")[1];
    if (base64) assinatura = { bytes: Uint8Array.from(Buffer.from(base64, "base64")), mime: "image/png" };
  }
  if (ptam && (!ctx.papel.ehResponsavelTecnica || !aprovadoPorResponsavel)) {
    await avisar("erro", "O PTAM é aprovado e emitido pessoalmente pela avaliadora responsável.");
    return;
  }
  if (ptam && !assinatura) {
    await avisar("erro", "Cadastre a sua assinatura em Configuração da avaliação antes de emitir o PTAM.");
    return;
  }

  const idsPessoas = [ctx.linha.aprovado_por, ctx.linha.criado_por].filter(Boolean) as string[];
  const { data: pessoas } = await ctx.supabase.from("usuarios").select("id, nome, cargo").in("id", idsPessoas);
  const aprovador = pessoas?.find((p) => p.id === ctx.linha.aprovado_por);
  const criador = pessoas?.find((p) => p.id === ctx.linha.criado_por);

  const numero = a.versao_atual + 1;
  const emitidoEm = new Date().toISOString();
  const origem = await obterSiteUrl();
  const [imagens, fontes] = await Promise.all([carregarImagensPdf(ctx.supabase, ctx.conteudo, origem), carregarFontesPdf(origem)]);
  const aprovacao = {
    nome: aprovador?.nome ?? "—",
    cargo: aprovador?.cargo ?? null,
    em: ctx.linha.aprovado_em ?? emitidoEm,
    ehResponsavelTecnica: aprovadoPorResponsavel,
  };
  let pdf: Uint8Array;
  try {
    pdf = await gerarPdfAvaliacao(ctx.conteudo, {
      rascunho: false,
      versao: numero,
      emitidoEm,
      elaboradoPor: criador?.nome ?? null,
      aprovacao,
      assinatura,
      imagens,
      fontes,
    });
  } catch (erro) {
    console.error("emitirVersao: falha ao gerar PDF", erro);
    await avisar("erro", "Não foi possível gerar o PDF. Nada foi emitido.");
    return;
  }

  const caminho = `${ctx.sessao.tenantId}/${ctx.id}/versoes/v${numero}-${hash.slice(0, 12)}.pdf`;
  const { error: erroUpload } = await ctx.supabase.storage.from(BUCKET_AVALIACOES).upload(caminho, pdf, { contentType: "application/pdf", upsert: false });
  if (erroUpload) {
    await avisar("erro", `Não foi possível guardar o PDF: ${erroUpload.message}`);
    return;
  }
  const versao: TablesInsert<"avaliacao_versoes"> = {
    avaliacao_id: ctx.id,
    tenant_id: ctx.sessao.tenantId,
    numero,
    modalidade: a.modalidade,
    finalidade: a.finalidade,
    snapshot: { conteudo: ctx.conteudo, aprovacao, elaborado_por: criador?.nome ?? null, emitido_em: emitidoEm } as unknown as Json,
    hash_conteudo: hash,
    pdf_caminho: caminho,
    valor_calculado: ctx.conteudo.precificacao.valor_calculado,
    valor_sugerido: ctx.conteudo.precificacao.valor_sugerido,
    faixa_min: ctx.conteudo.precificacao.faixa_min,
    faixa_max: ctx.conteudo.precificacao.faixa_max,
    tipo_assinatura: assinatura ? "visual" : "sem_assinatura",
    aprovado_por: ctx.linha.aprovado_por,
    aprovado_por_nome: aprovador?.nome ?? null,
    aprovado_em: ctx.linha.aprovado_em,
    emitido_por: ctx.sessao.userId,
    emitido_por_nome: ctx.sessao.usuario.nome,
    emitido_em: emitidoEm,
  };
  if (!(await checar(ctx.supabase.from("avaliacao_versoes").insert(versao), "registrar a versão"))) return;
  const ok = await checar(ctx.supabase.from("avaliacoes").update({ status: "emitido", versao_atual: numero }).eq("id", ctx.id), "concluir a emissão");
  if (!ok) return;
  await registrar(ctx, "emitido", `Versão ${numero} emitida por ${ctx.sessao.usuario.nome}.`, {
    versao: numero,
    hash,
    valor_sugerido: ctx.conteudo.precificacao.valor_sugerido,
    assinatura: assinatura ? "visual" : "sem_assinatura",
  });
  revalidatePath(`/avaliacoes/${ctx.id}`);
  revalidatePath("/avaliacoes");
  await avisar("sucesso", `Versão ${numero} emitida. O PDF está no histórico.`);
  redirect(`/avaliacoes/${ctx.id}?etapa=historico`);
}

export async function arquivarAvaliacao(formData: FormData) {
  const ctx = await contexto(texto(formData, "avaliacao_id", 40));
  if (!ctx) return;
  const reabrir = formData.get("acao") === "reabrir";
  if (reabrir !== (ctx.avaliacao.status === "arquivado")) return;
  const ok = await checar(
    ctx.supabase
      .from("avaliacoes")
      .update(reabrir ? { status: "rascunho" } : { status: "arquivado", aprovado_por: null, aprovado_em: null, aprovado_hash: null })
      .eq("id", ctx.id),
    reabrir ? "reabrir" : "arquivar"
  );
  if (!ok) return;
  await registrar(ctx, reabrir ? "reaberto" : "arquivado", reabrir ? "Avaliação reaberta como rascunho." : "Avaliação arquivada.");
  revalidatePath(`/avaliacoes/${ctx.id}`);
  revalidatePath("/avaliacoes");
  await avisar("sucesso", reabrir ? "Reaberta como rascunho." : "Arquivada. As versões emitidas continuam disponíveis.");
}

/** Reavaliação: copia dados e comparáveis, marcando as fontes para reconferência. */
export async function duplicarAvaliacao(formData: FormData) {
  const ctx = await contexto(texto(formData, "avaliacao_id", 40));
  if (!ctx) return;
  const modalidade = valorDaListaLocal(MODALIDADES, formData.get("modalidade"), ctx.avaliacao.modalidade);
  const { data: codigo } = await ctx.supabase.rpc("avaliacao_proximo_codigo");
  const dados: DadosAvaliacao = { ...ctx.avaliacao.dados };
  delete dados.justificativa_valor;
  delete dados.justificativa_faixa;
  delete dados.selo_numero;
  delete dados.dam_numero;
  const { data: nova, error } = await ctx.supabase
    .from("avaliacoes")
    .insert({
      tenant_id: ctx.sessao.tenantId,
      codigo: codigo ?? `AV-${hojeISO().slice(0, 4)}-${Date.now().toString().slice(-6)}`,
      modalidade,
      finalidade: ctx.avaliacao.finalidade,
      tipologia: ctx.avaliacao.tipologia,
      imovel_id: ctx.linha.imovel_id,
      origem_id: ctx.id,
      titulo: ctx.avaliacao.titulo,
      proprietario_nome: ctx.avaliacao.proprietario_nome,
      bairro: ctx.avaliacao.bairro,
      cidade: ctx.avaliacao.cidade,
      data_base: hojeISO(),
      area_m2: ctx.avaliacao.area_m2,
      dados: { ...dados, vistoria_status: "nao_realizada", vistoria_data: undefined, vistoria_checklist: undefined } as Json,
      margem_negociacao_pct: ctx.avaliacao.margem_negociacao_pct,
      criado_por: ctx.sessao.userId,
    })
    .select("id")
    .single();
  if (error || !nova) {
    await avisar("erro", `Não foi possível duplicar: ${error?.message ?? "erro desconhecido"}`);
    return;
  }
  if (ctx.comparaveis.length > 0) {
    const { data: originais } = await ctx.supabase.from("avaliacao_comparaveis").select("*").eq("avaliacao_id", ctx.id);
    await ctx.supabase.from("avaliacao_comparaveis").insert(
      (originais ?? []).map((c) => ({
        ...c,
        id: undefined,
        criado_em: undefined,
        avaliacao_id: nova.id,
        foto_caminho: null,
        reconferir: true,
        inserido_por: ctx.sessao.userId,
      }))
    );
  }
  await ctx.supabase.from("avaliacao_eventos").insert({
    avaliacao_id: nova.id,
    tenant_id: ctx.sessao.tenantId,
    tipo: "criacao",
    descricao: `Criada a partir de ${ctx.avaliacao.codigo} para reavaliação. Comparáveis marcados para reconferência; vistoria e fotos precisam ser refeitas.`,
    dados: { origem: ctx.id },
    autor_id: ctx.sessao.userId,
    autor_nome: ctx.sessao.usuario.nome,
  });
  await registrar(ctx, "duplicado", "Avaliação duplicada para reavaliação.", { nova: nova.id });
  revalidatePath("/avaliacoes");
  redirect(`/avaliacoes/${nova.id}?etapa=dados`);
}

// ---------------------------------------------------------------
// configuração e assinatura
// ---------------------------------------------------------------

export async function salvarConfigAvaliacao(formData: FormData) {
  const sessao = await exigirUsuario();
  if (!sessao) return;
  const supabase = await createClient();
  const config = await carregarConfig(supabase, sessao.tenantId);
  if (!podeConfigurar(papelDe(sessao, config))) {
    await avisar("erro", "Só diretor, gerente ou a avaliadora responsável alteram esta configuração.");
    return;
  }
  const limiares: Record<string, number> = {};
  for (const chave of Object.keys(LIMIARES_PADRAO)) {
    const valor = numeroOuNull(formData, `limiar_${chave}`);
    if (valor !== null) limiares[chave] = valor;
  }
  const fontes = texto(formData, "fontes_externas", 3000)
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((linha) => {
      const [nome, ...resto] = linha.split("|");
      return { nome: nome.trim(), observacao: resto.join("|").trim() || undefined };
    });
  const responsavelId = texto(formData, "responsavel_usuario_id", 40) || null;
  const ok = await checar(
    supabase.from("avaliacao_config").upsert({
      tenant_id: sessao.tenantId,
      responsavel_usuario_id: responsavelId,
      responsavel_nome: textoOuNull(formData, "responsavel_nome", 160),
      responsavel_creci: textoOuNull(formData, "responsavel_creci", 40),
      responsavel_cnai: textoOuNull(formData, "responsavel_cnai", 40),
      responsavel_curriculo: textoOuNull(formData, "responsavel_curriculo", 1500),
      contato_telefone: textoOuNull(formData, "contato_telefone", 40),
      contato_email: textoOuNull(formData, "contato_email", 160),
      limiares: limiares as Json,
      fontes_externas: fontes as unknown as Json,
      atualizado_por: sessao.userId,
      atualizado_em: new Date().toISOString(),
    }),
    "salvar a configuração"
  );
  if (!ok) return;
  revalidatePath("/avaliacoes", "layout");
  await avisar("sucesso", "Configuração salva.");
}

export async function salvarAssinaturaAvaliadora(formData: FormData) {
  const sessao = await exigirUsuario();
  if (!sessao) return;
  const supabase = await createClient();
  const config = await carregarConfig(supabase, sessao.tenantId);
  if (!papelDe(sessao, config).ehResponsavelTecnica) {
    await avisar("erro", "Só a própria avaliadora responsável cadastra a assinatura dela.");
    return;
  }
  if (formData.get("acao") === "remover") {
    await checar(supabase.from("avaliacao_assinaturas").delete().eq("usuario_id", sessao.userId), "remover a assinatura");
    revalidatePath("/avaliacoes/configuracao");
    await avisar("sucesso", "Assinatura removida.");
    return;
  }
  const imagem = String(formData.get("assinatura") ?? "");
  if (!imagem.startsWith("data:image/png;base64,") || imagem.length > 600_000) {
    await avisar("erro", "Desenhe ou envie a assinatura (imagem PNG de até 400 KB).");
    return;
  }
  if (formData.get("consentimento") !== "on") {
    await avisar("erro", "Marque a autorização de uso da assinatura.");
    return;
  }
  const ok = await checar(
    supabase.from("avaliacao_assinaturas").upsert({
      usuario_id: sessao.userId,
      tenant_id: sessao.tenantId,
      imagem,
      consentimento:
        "Autorizo o Vitral a aplicar esta imagem da minha assinatura somente nos documentos de avaliação que eu mesma aprovar e emitir.",
      autorizada_em: new Date().toISOString(),
    }),
    "salvar a assinatura"
  );
  if (!ok) return;
  revalidatePath("/avaliacoes/configuracao");
  await avisar("sucesso", "Assinatura salva. Ela só aparece em documentos que você aprovar e emitir.");
}

/** Laudo comercial: valor definido pela equipe e textos livres, sem fatores ou faixa obrigatória. */
export async function salvarLaudoComercial(formData: FormData) {
  const ctx = await contexto(texto(formData, "avaliacao_id", 40));
  if (!ctx || !(await editavel(ctx)) || ctx.avaliacao.modalidade !== "estudo_comercial") return;
  const dados = { ...ctx.avaliacao.dados };
  for (const chave of ["carta_texto", "parecer_avaliadora", "conclusao_texto", "limitacoes_texto"] as const) {
    dados[chave] = texto(formData, chave, 6000) || undefined;
  }
  const valor = numeroOuNull(formData, "valor_sugerido");
  const mudou = valor !== ctx.avaliacao.valor_sugerido ||
    ["carta_texto", "parecer_avaliadora", "conclusao_texto", "limitacoes_texto"].some(chave =>
      (dados[chave as keyof DadosAvaliacao] ?? "") !== (ctx.avaliacao.dados[chave as keyof DadosAvaliacao] ?? ""));
  if (mudou) {
    const ok = await aposEdicao(ctx, {
      tipo: "laudo_editado", descricao: "Valor sugerido e textos do laudo comercial atualizados.",
      dados: { anterior: ctx.avaliacao.valor_sugerido, novo: valor },
    }, { valor_sugerido: valor, dados: dados as Json });
    if (!ok) return;
  }
  if (formData.get("acao") === "emitir") await emitirLaudoComercial(formData);
  else if (formData.get("acao") === "revisao") await enviarParaRevisao(formData);
  else await avisar("sucesso", mudou ? "Laudo salvo. Você já pode conferir o PDF." : "Nada mudou no laudo.");
}

/** Um botão para a gestão, preservando aprovação, hash e versão imutável. */
export async function emitirLaudoComercial(formData: FormData) {
  const ctx = await contexto(texto(formData, "avaliacao_id", 40));
  if (!ctx || ctx.avaliacao.modalidade !== "estudo_comercial" || !(await editavel(ctx))) return;
  if (!podeAprovar(ctx.papel, ctx.avaliacao.modalidade)) {
    await avisar("erro", "Envie o laudo para um diretor, gerente ou responsável configurado emitir.");
    return;
  }
  if (ctx.avaliacao.status === "emitido") {
    redirect(`/avaliacoes/${ctx.id}?etapa=historico`);
  }
  const validacao = validarParaEmissao(ctx.conteudo);
  if (validacao.bloqueios.length) {
    await avisar("erro", "Complete as pendências e salve o laudo antes de emitir.");
    return;
  }
  if (ctx.avaliacao.status !== "aprovado") {
    const ok = await checar(ctx.supabase.from("avaliacoes").update({
      status: "aprovado", aprovado_hash: hashConteudo(ctx.conteudo), comentario_revisao: null,
    }).eq("id", ctx.id).select("id").single(), "aprovar o laudo");
    if (!ok) return;
    await registrar(ctx, "aprovado", `Laudo conferido para emissão por ${ctx.sessao.usuario.nome}.`, { hash: hashConteudo(ctx.conteudo) });
    revalidatePath(`/avaliacoes/${ctx.id}`);
    revalidatePath("/avaliacoes");
  }
  // Recarrega e confere o hash: uma edição concorrente impede a emissão.
  await emitirVersao(formData);
}
