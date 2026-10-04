import { montarConteudo, type ConteudoAvaliacao } from "@/lib/avaliacao/conteudo";
import type { FontesPdf, Imagem } from "@/lib/avaliacao/pdf-base";
import { CHAVE_LOGO_BORDO, CHAVE_LOGO_DOURADO } from "@/lib/avaliacao/pdf";
import type { PapelAvaliacao } from "@/lib/avaliacao/permissoes";
import {
  LIMIARES_PADRAO,
  type AjusteComparavel,
  type ArquivoAvaliacao,
  type AvaliacaoBase,
  type Comparavel,
  type DadosAvaliacao,
  type Limiares,
  type Responsavel,
} from "@/lib/avaliacao/tipos";
import type { Tables } from "@/lib/database.types";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const BUCKET_AVALIACOES = "avaliacoes";

export type ConfigAvaliacao = {
  existe: boolean;
  responsavel: Responsavel;
  limiares: Limiares;
  fontesExternas: { nome: string; observacao?: string }[];
};

export function paraAvaliacaoBase(linha: Tables<"avaliacoes">): AvaliacaoBase {
  return {
    id: linha.id,
    codigo: linha.codigo,
    modalidade: linha.modalidade as AvaliacaoBase["modalidade"],
    finalidade: linha.finalidade as AvaliacaoBase["finalidade"],
    tipologia: linha.tipologia as AvaliacaoBase["tipologia"],
    status: linha.status as AvaliacaoBase["status"],
    titulo: linha.titulo,
    proprietario_nome: linha.proprietario_nome,
    bairro: linha.bairro,
    cidade: linha.cidade,
    data_base: linha.data_base,
    area_m2: linha.area_m2 === null ? null : Number(linha.area_m2),
    dados: (linha.dados ?? {}) as DadosAvaliacao,
    valor_calculado: linha.valor_calculado === null ? null : Number(linha.valor_calculado),
    faixa_min: linha.faixa_min === null ? null : Number(linha.faixa_min),
    faixa_max: linha.faixa_max === null ? null : Number(linha.faixa_max),
    faixa_manual: linha.faixa_manual,
    valor_sugerido: linha.valor_sugerido === null ? null : Number(linha.valor_sugerido),
    margem_negociacao_pct: linha.margem_negociacao_pct === null ? null : Number(linha.margem_negociacao_pct),
    valor_proprietario: linha.valor_proprietario === null ? null : Number(linha.valor_proprietario),
    revisao: linha.revisao,
    versao_atual: linha.versao_atual,
  };
}

export function paraComparavel(linha: Tables<"avaliacao_comparaveis">): Comparavel {
  return {
    id: linha.id,
    ordem: linha.ordem,
    identificacao: linha.identificacao,
    regiao: linha.regiao,
    finalidade: linha.finalidade as Comparavel["finalidade"],
    tipologia: linha.tipologia as Comparavel["tipologia"],
    area_m2: linha.area_m2 === null ? null : Number(linha.area_m2),
    quartos: linha.quartos,
    suites: linha.suites,
    vagas: linha.vagas,
    preco: linha.preco === null ? null : Number(linha.preco),
    tipo_preco: linha.tipo_preco as Comparavel["tipo_preco"],
    fonte_tipo: linha.fonte_tipo as Comparavel["fonte_tipo"],
    fonte_nome: linha.fonte_nome,
    fonte_url: linha.fonte_url,
    referencia_interna: linha.referencia_interna,
    data_coleta: linha.data_coleta,
    data_atualizacao: linha.data_atualizacao,
    status_anuncio: linha.status_anuncio,
    diferencas: linha.diferencas,
    observacoes: linha.observacoes,
    ajustes: (Array.isArray(linha.ajustes) ? linha.ajustes : []) as unknown as AjusteComparavel[],
    incluido: linha.incluido,
    duplicata: linha.duplicata,
    reconferir: linha.reconferir,
    motivo_exclusao: linha.motivo_exclusao,
    foto_caminho: linha.foto_caminho,
  };
}

export function paraArquivo(linha: Tables<"avaliacao_arquivos">): ArquivoAvaliacao {
  return {
    id: linha.id,
    tipo: linha.tipo as ArquivoAvaliacao["tipo"],
    caminho_storage: linha.caminho_storage,
    nome_arquivo: linha.nome_arquivo,
    legenda: linha.legenda,
    capa: linha.capa,
    ordem: linha.ordem,
    mime_type: linha.mime_type,
  };
}

export async function carregarConfig(supabase: Supabase, tenantId: string): Promise<ConfigAvaliacao> {
  const { data } = await supabase.from("avaliacao_config").select("*").eq("tenant_id", tenantId).maybeSingle();
  const limiaresSalvos = (data?.limiares ?? {}) as Partial<Limiares>;
  const limiares: Limiares = { ...LIMIARES_PADRAO };
  for (const chave of Object.keys(LIMIARES_PADRAO) as (keyof Limiares)[]) {
    const valor = Number(limiaresSalvos[chave]);
    if (Number.isFinite(valor) && valor > 0) limiares[chave] = valor;
  }
  return {
    existe: !!data,
    responsavel: {
      usuario_id: data?.responsavel_usuario_id ?? null,
      nome: data?.responsavel_nome ?? "",
      creci: data?.responsavel_creci ?? "",
      cnai: data?.responsavel_cnai ?? "",
      curriculo: data?.responsavel_curriculo ?? "",
      telefone: data?.contato_telefone ?? "",
      email: data?.contato_email ?? "",
    },
    limiares,
    fontesExternas: (Array.isArray(data?.fontes_externas) ? data?.fontes_externas : []) as { nome: string; observacao?: string }[],
  };
}

export function papelDe(sessao: { userId: string; nivel: string }, config: ConfigAvaliacao): PapelAvaliacao {
  return {
    usuarioId: sessao.userId,
    nivel: sessao.nivel,
    ehResponsavelTecnica: !!config.responsavel.usuario_id && config.responsavel.usuario_id === sessao.userId,
  };
}

export type AvaliacaoCompleta = {
  linha: Tables<"avaliacoes">;
  avaliacao: AvaliacaoBase;
  comparaveis: Comparavel[];
  arquivos: ArquivoAvaliacao[];
  config: ConfigAvaliacao;
  conteudo: ConteudoAvaliacao;
};

/** Avaliação com tudo o que compõe o conteúdo (a RLS decide se a pessoa enxerga). */
export async function carregarAvaliacao(supabase: Supabase, id: string, tenantId: string): Promise<AvaliacaoCompleta | null> {
  const [{ data: linha }, { data: comps }, { data: arqs }, config] = await Promise.all([
    supabase.from("avaliacoes").select("*").eq("id", id).maybeSingle(),
    supabase.from("avaliacao_comparaveis").select("*").eq("avaliacao_id", id).order("ordem").order("criado_em"),
    supabase.from("avaliacao_arquivos").select("*").eq("avaliacao_id", id).order("ordem").order("criado_em"),
    carregarConfig(supabase, tenantId),
  ]);
  if (!linha) return null;
  const avaliacao = paraAvaliacaoBase(linha);
  const comparaveis = (comps ?? []).map(paraComparavel);
  const arquivos = (arqs ?? []).map(paraArquivo);
  const conteudo = montarConteudo({ avaliacao, comparaveis, arquivos, responsavel: config.responsavel, limiares: config.limiares });
  return { linha, avaliacao, comparaveis, arquivos, config, conteudo };
}

/** Baixa do bucket privado as imagens que o PDF usa + os logotipos. */
export async function carregarImagensPdf(
  supabase: Supabase,
  conteudo: ConteudoAvaliacao,
  origemSite: string
): Promise<Record<string, Imagem>> {
  const imagens: Record<string, Imagem> = {};
  const caminhos = new Map<string, string>();
  for (const a of conteudo.arquivos) {
    if (a.mime_type.startsWith("image/") && a.tipo !== "anexo") caminhos.set(a.caminho_storage, a.mime_type);
  }
  for (const c of conteudo.comparaveis) {
    if (c.incluido && c.foto_caminho) caminhos.set(c.foto_caminho, c.foto_caminho.endsWith(".png") ? "image/png" : "image/jpeg");
  }

  const baixarFoto = async ([caminho, mime]: [string, string]) => {
    const { data } = await supabase.storage.from(BUCKET_AVALIACOES).download(caminho);
    if (data) imagens[caminho] = { bytes: new Uint8Array(await data.arrayBuffer()), mime };
  };
  const baixarLogo = async (chave: string, arquivo: string) => {
    try {
      const resposta = await fetch(new URL(arquivo, origemSite), { signal: AbortSignal.timeout(8000) });
      if (resposta.ok) imagens[chave] = { bytes: new Uint8Array(await resposta.arrayBuffer()), mime: "image/png" };
    } catch {
      // sem logo o PDF sai só com o nome escrito
    }
  };
  await Promise.all([
    ...[...caminhos.entries()].map(baixarFoto),
    baixarLogo(CHAVE_LOGO_BORDO, "/brand/sacra-logo-bordo.png"),
    baixarLogo(CHAVE_LOGO_DOURADO, "/brand/sacra-logo-dourado.png"),
  ]);
  return imagens;
}

let fontesEmCache: FontesPdf | null = null;

/** Fontes Liberation servidas pelo próprio site (public/fonts/avaliacao), guardadas em memória. */
export async function carregarFontesPdf(origemSite: string): Promise<FontesPdf | null> {
  if (fontesEmCache) return fontesEmCache;
  try {
    const baixar = async (arquivo: string) => {
      const resposta = await fetch(new URL(`/fonts/avaliacao/${arquivo}`, origemSite), { signal: AbortSignal.timeout(8000) });
      if (!resposta.ok) throw new Error(`fonte ${arquivo}: ${resposta.status}`);
      return new Uint8Array(await resposta.arrayBuffer());
    };
    const [serif, serifItalico, sans, sansNegrito] = await Promise.all([
      baixar("LiberationSerif-Regular.ttf"),
      baixar("LiberationSerif-Italic.ttf"),
      baixar("LiberationSans-Regular.ttf"),
      baixar("LiberationSans-Bold.ttf"),
    ]);
    fontesEmCache = { serif, serifItalico, sans, sansNegrito };
    return fontesEmCache;
  } catch (erro) {
    console.error("avaliacao: fontes do PDF indisponíveis; usando as fontes padrão", erro);
    return null;
  }
}
