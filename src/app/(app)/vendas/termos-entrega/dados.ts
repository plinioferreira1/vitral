import type { FontesPdf, Imagem } from "@/lib/avaliacao/pdf-base";
import type { Tables } from "@/lib/database.types";
import { liberadoParaNivel } from "@/lib/em-finalizacao";
import { getPermissoesUsuario } from "@/lib/permissoes";
import type { createClient } from "@/lib/supabase/server";
import type { Categoria, EncargoEntrada, Marco, Pagador, Responsavel, TipoCalculo } from "@/lib/termo-entrega/calculo";
import {
  MODELO_PADRAO,
  normalizarDocumento,
  permissoesTermo,
  type Assinatura,
  type DocumentoTermo,
  type ModeloTermo,
  type PapelParte,
  type PermissoesTermo,
  type RetratoTermo,
  type StatusTermo,
} from "@/lib/termo-entrega/conteudo";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const BUCKET_TERMOS = "termos-entrega";
export const TIMBRADO_PADRAO = "/brand/papel-timbrado-sacra.jpg";

export async function carregarPermissoes(supabase: Supabase, userId: string, nivel: string): Promise<PermissoesTermo> {
  // tela em finalização: por enquanto só a gestão entra
  if (!liberadoParaNivel("termosEntrega", nivel)) return { ver: false, operar: false, configurar: false };
  const { temVenda } = await getPermissoesUsuario(supabase, userId, nivel);
  return permissoesTermo(nivel, temVenda);
}

export function paraModelo(linha: Tables<"termo_entrega_config"> | null): ModeloTermo {
  if (!linha) return MODELO_PADRAO;
  return {
    clausulaPadrao: linha.clausula_padrao?.trim() || MODELO_PADRAO.clausulaPadrao,
    prazoTransferenciaDias: linha.prazo_transferencia_dias,
    multaDiariaCentavos: Number(linha.multa_diaria_centavos),
    observacoesPadrao: linha.observacoes_padrao ?? "",
    textoComplementar: linha.texto_complementar ?? "",
    cidade: linha.cidade || MODELO_PADRAO.cidade,
    timbradoCaminho: linha.timbrado_caminho ?? "",
    margemSuperior: linha.margem_superior,
    margemInferior: linha.margem_inferior,
  };
}

export async function carregarModelo(supabase: Supabase, tenantId: string): Promise<ModeloTermo> {
  const { data } = await supabase.from("termo_entrega_config").select("*").eq("tenant_id", tenantId).maybeSingle();
  return paraModelo(data);
}

/** Linhas do banco -> documento de trabalho (o mesmo formato que a tela edita). */
export function montarDocumento(
  termo: Tables<"termos_entrega">,
  partes: Tables<"termo_entrega_partes">[],
  encargos: Tables<"termo_entrega_encargos">[],
  modelo: ModeloTermo
): DocumentoTermo {
  return normalizarDocumento(
    {
      processoId: termo.processo_id,
      partes: [...partes]
        .sort((a, b) => a.ordem - b.ordem)
        .map((p) => ({ id: p.id, papel: p.papel as PapelParte, nome: p.nome, cpfCnpj: p.cpf_cnpj ?? "", rg: p.rg ?? "", email: p.email ?? "", clienteId: p.cliente_id })),
      imovel: {
        endereco: termo.imovel_endereco ?? "",
        areaPrivativa: termo.imovel_area_privativa ?? "",
        matricula: termo.imovel_matricula ?? "",
        cartorio: termo.imovel_cartorio ?? "",
        inscricaoIptu: termo.imovel_inscricao_iptu ?? "",
        outros: termo.imovel_outros ?? "",
      },
      dataEntrega: termo.data_entrega,
      horaEntrega: termo.hora_entrega ?? "",
      marco: termo.marco as Marco,
      marcoData: termo.marco_data,
      encargos: [...encargos]
        .sort((a, b) => a.ordem - b.ordem)
        .map(
          (e): EncargoEntrada => ({
            id: e.id,
            categoria: e.categoria as Categoria,
            descricao: e.descricao,
            competencia: e.competencia ?? "",
            periodoInicio: e.periodo_inicio,
            periodoFim: e.periodo_fim,
            vencimento: e.vencimento,
            valorTotalCentavos: Number(e.valor_total_centavos),
            pagoPor: e.pago_por as Pagador,
            responsavel: e.responsavel as Responsavel,
            tipoCalculo: e.tipo_calculo as TipoCalculo,
            manualVendedorCentavos: Number(e.manual_vendedor_centavos),
            manualCompradorCentavos: Number(e.manual_comprador_centavos),
            observacao: e.observacao ?? "",
          })
        ),
      demais: termo.demais_encargos,
      ressarcimento: termo.ressarcimento,
      clausula: termo.clausula,
      local: termo.local_assinatura ?? "",
      dataDocumento: termo.data_documento,
    },
    modelo
  );
}

export type TermoCompleto = {
  termo: Tables<"termos_entrega"> & { status: StatusTermo };
  documento: DocumentoTermo;
  modelo: ModeloTermo;
  anexos: Tables<"termo_entrega_anexos">[];
  signatarios: Tables<"termo_entrega_signatarios">[];
  versoes: (Omit<Tables<"termo_entrega_versoes">, "retrato"> & { retrato: RetratoTermo })[];
  eventos: Tables<"termo_entrega_eventos">[];
};

export async function carregarTermo(supabase: Supabase, id: string, tenantId: string): Promise<TermoCompleto | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [{ data: termo }, { data: partes }, { data: encargos }, { data: anexos }, { data: signatarios }, { data: versoes }, { data: eventos }, modelo] = await Promise.all([
    supabase.from("termos_entrega").select("*").eq("id", id).maybeSingle(),
    supabase.from("termo_entrega_partes").select("*").eq("termo_id", id),
    supabase.from("termo_entrega_encargos").select("*").eq("termo_id", id),
    supabase.from("termo_entrega_anexos").select("*").eq("termo_id", id).order("criado_em"),
    supabase.from("termo_entrega_signatarios").select("*").eq("termo_id", id).order("ordem"),
    supabase.from("termo_entrega_versoes").select("*").eq("termo_id", id).order("versao", { ascending: false }),
    supabase.from("termo_entrega_eventos").select("*").eq("termo_id", id).order("criado_em", { ascending: false }).limit(200),
    carregarModelo(supabase, tenantId),
  ]);
  if (!termo) return null;
  return {
    termo: termo as TermoCompleto["termo"],
    documento: montarDocumento(termo, partes ?? [], encargos ?? [], modelo),
    modelo,
    anexos: anexos ?? [],
    signatarios: signatarios ?? [],
    versoes: (versoes ?? []) as unknown as TermoCompleto["versoes"],
    eventos: eventos ?? [],
  };
}

export function paraAssinaturas(signatarios: Tables<"termo_entrega_signatarios">[], versao: number): Assinatura[] {
  return signatarios
    .filter((s) => s.versao === versao)
    .map((s) => ({ papel: s.papel as PapelParte, nomeEsperado: s.nome_esperado, nomeDigitado: s.nome_digitado, imagem: s.assinatura_imagem, assinadoEm: s.assinado_em, ip: s.ip_assinatura }));
}

// ---------------------------------------------------------------
// arquivos do PDF: fontes e papel timbrado
// ---------------------------------------------------------------

let fontesEmCache: FontesPdf | null = null;
let timbradoPadraoEmCache: Imagem | null = null;

export async function carregarFontesTermo(origemSite: string): Promise<FontesPdf | null> {
  if (fontesEmCache) return fontesEmCache;
  try {
    const baixar = async (arquivo: string) => {
      const resposta = await fetch(new URL(`/fonts/avaliacao/${arquivo}`, origemSite), { signal: AbortSignal.timeout(8000) });
      if (!resposta.ok) throw new Error(`fonte ${arquivo}: ${resposta.status}`);
      return new Uint8Array(await resposta.arrayBuffer());
    };
    const [sans, sansNegrito] = await Promise.all([baixar("LiberationSans-Regular.ttf"), baixar("LiberationSans-Bold.ttf")]);
    fontesEmCache = { serif: sans, serifItalico: sans, sans, sansNegrito };
    return fontesEmCache;
  } catch (erro) {
    console.error("termo-entrega: fontes do PDF indisponíveis; usando as fontes padrão", erro);
    return null;
  }
}

/**
 * Papel timbrado da versão: o arquivo enviado nas configurações (pasta
 * privada) ou, se não houver, o timbrado padrão da Sacra. `storage`
 * precisa conseguir ler a pasta (cliente do usuário ou de administrador).
 */
export async function carregarTimbrado(storage: Pick<Supabase, "storage">, caminho: string, origemSite: string): Promise<Imagem | null> {
  if (caminho) {
    const { data } = await storage.storage.from(BUCKET_TERMOS).download(caminho);
    if (data) return { bytes: new Uint8Array(await data.arrayBuffer()), mime: caminho.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg" };
  }
  if (timbradoPadraoEmCache) return timbradoPadraoEmCache;
  try {
    const resposta = await fetch(new URL(TIMBRADO_PADRAO, origemSite), { signal: AbortSignal.timeout(8000) });
    if (!resposta.ok) throw new Error(String(resposta.status));
    timbradoPadraoEmCache = { bytes: new Uint8Array(await resposta.arrayBuffer()), mime: "image/jpeg" };
    return timbradoPadraoEmCache;
  } catch (erro) {
    console.error("termo-entrega: papel timbrado indisponível", erro);
    return null;
  }
}
