import type { Tables } from "@/lib/database.types";
import { liberadoParaNivel } from "@/lib/em-finalizacao";
import { JORNADA_PADRAO, localDe, normalizarJornada, permissoesDP, type ContextoPonto, type Jornada, type PermissoesDP, type RegistrosDia, type TipoRegistro } from "@/lib/dp/ponto";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const BUCKET_DP = "departamento-pessoal";
export type Colaborador = Tables<"dp_colaboradores">;
export type Registro = Tables<"dp_ponto_registros">;
export type Ausencia = Tables<"dp_ausencias">;

export type Vinculo = { nome: string; regime: "clt" | "estagio" | "pj" | "outro" };
export type TipoAusencia = { nome: string; abona: boolean };
export type ConfigDP = {
  jornada: Jornada;
  toleranciaMin: number;
  bancoHorasAtivo: boolean;
  horaExtraLimiteDiarioMin: number;
  feriasAlertaVencimentoDias: number;
  feriasAntecedenciaDias: number;
  feriasAvisoProximasDias: number;
  documentosAlertaDias: number;
  empresas: string[];
  departamentos: string[];
  cargos: string[];
  vinculos: Vinculo[];
  tiposAusencia: TipoAusencia[];
  tiposDocumento: string[];
};

const textos = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x ?? "").trim()).filter(Boolean) : []);

export function paraConfig(linha: Tables<"dp_config"> | null): ConfigDP {
  const vinculos = (Array.isArray(linha?.vinculos) ? (linha!.vinculos as unknown[]) : [])
    .map((v) => v as { nome?: string; regime?: string })
    .filter((v) => v?.nome)
    .map((v) => ({ nome: String(v.nome), regime: (["clt", "estagio", "pj", "outro"].includes(String(v.regime)) ? v.regime : "outro") as Vinculo["regime"] }));
  const tiposAusencia = (Array.isArray(linha?.tipos_ausencia) ? (linha!.tipos_ausencia as unknown[]) : [])
    .map((v) => v as { nome?: string; abona?: boolean })
    .filter((v) => v?.nome)
    .map((v) => ({ nome: String(v.nome), abona: v.abona !== false }));
  return {
    jornada: normalizarJornada(linha?.jornada ?? null, JORNADA_PADRAO),
    toleranciaMin: linha?.tolerancia_min ?? 10,
    bancoHorasAtivo: linha?.banco_horas_ativo ?? true,
    horaExtraLimiteDiarioMin: linha?.hora_extra_limite_diario_min ?? 120,
    feriasAlertaVencimentoDias: linha?.ferias_alerta_vencimento_dias ?? 60,
    feriasAntecedenciaDias: linha?.ferias_antecedencia_dias ?? 30,
    feriasAvisoProximasDias: linha?.ferias_aviso_proximas_dias ?? 7,
    documentosAlertaDias: linha?.documentos_alerta_dias ?? 30,
    empresas: textos(linha?.empresas).length ? textos(linha?.empresas) : ["Sacra Netimóveis", "Sacra Cred"],
    departamentos: textos(linha?.departamentos),
    cargos: textos(linha?.cargos),
    vinculos: vinculos.length ? vinculos : [{ nome: "CLT", regime: "clt" }],
    tiposAusencia: tiposAusencia.length ? tiposAusencia : [{ nome: "Falta", abona: false }, { nome: "Atestado", abona: true }],
    tiposDocumento: textos(linha?.tipos_documento).length ? textos(linha?.tipos_documento) : ["Outros"],
  };
}

export type AcessoDP = {
  liberado: boolean;
  perms: PermissoesDP;
  /** ficha de colaborador ligada ao usuário logado */
  eu: Colaborador | null;
  config: ConfigDP;
};

export async function acessoDP(supabase: Supabase, userId: string, nivel: string): Promise<AcessoDP> {
  const vazio = permissoesDP("", false, 0);
  if (!liberadoParaNivel("departamentoPessoal", nivel)) return { liberado: false, perms: vazio, eu: null, config: paraConfig(null) };
  const [{ data: eu }, { data: config }] = await Promise.all([
    supabase.from("dp_colaboradores").select("*").eq("usuario_id", userId).maybeSingle(),
    supabase.from("dp_config").select("*").maybeSingle(),
  ]);
  const { count } = eu ? await supabase.from("dp_colaboradores").select("id", { count: "exact", head: true }).eq("gestor_id", eu.id) : { count: 0 };
  return { liberado: true, perms: permissoesDP(nivel, !!eu, count ?? 0), eu, config: paraConfig(config) };
}

export const jornadaDe = (c: Pick<Colaborador, "jornada">, config: ConfigDP): Jornada => (c.jornada ? normalizarJornada(c.jornada, config.jornada) : config.jornada);
export const regrasDe = (config: ConfigDP) => ({ toleranciaMin: config.toleranciaMin, horaExtraLimiteDiarioMin: config.horaExtraLimiteDiarioMin });

/** Agrupa as batidas ativas por dia (minutos de Brasília). */
export function registrosPorDia(registros: Pick<Registro, "data" | "tipo" | "horario" | "ativo">[]): Map<string, RegistrosDia> {
  const mapa = new Map<string, RegistrosDia>();
  for (const r of registros) {
    if (!r.ativo) continue;
    const dia = mapa.get(r.data) ?? {};
    dia[r.tipo as TipoRegistro] = localDe(r.horario).minutos;
    mapa.set(r.data, dia);
  }
  return mapa;
}

export type FeriasAprovada = { usuario_id: string; data_inicio: string; data_fim: string; data_retorno: string };

/** Tudo o que o cálculo de ponto de um colaborador precisa. */
export function contextoPonto(
  c: Colaborador,
  config: ConfigDP,
  dados: { registros: Pick<Registro, "colaborador_id" | "data" | "tipo" | "horario" | "ativo">[]; ausencias: Pick<Ausencia, "colaborador_id" | "tipo" | "abona" | "data_inicio" | "data_fim" | "status">[]; ferias: FeriasAprovada[] },
  agoraIso: string
): ContextoPonto {
  const agora = localDe(agoraIso);
  return {
    hoje: agora.data,
    agoraMin: agora.minutos,
    jornada: jornadaDe(c, config),
    regras: regrasDe(config),
    inicio: c.registra_ponto ? c.ponto_inicio : null,
    fim: c.status === "desligado" ? c.data_desligamento : null,
    registros: registrosPorDia(dados.registros.filter((r) => r.colaborador_id === c.id)),
    ferias: c.usuario_id ? dados.ferias.filter((f) => f.usuario_id === c.usuario_id).map((f) => ({ inicio: f.data_inicio, fim: f.data_fim })) : [],
    ausencias: dados.ausencias.filter((a) => a.colaborador_id === c.id && a.status === "aprovada").map((a) => ({ inicio: a.data_inicio, fim: a.data_fim, tipo: a.tipo, abona: a.abona })),
  };
}

export async function feriasAprovadas(supabase: Supabase): Promise<FeriasAprovada[]> {
  const { data } = await supabase.from("ferias_solicitacoes").select("usuario_id, data_inicio, data_fim, data_retorno").eq("status", "aprovado").neq("tipo", "cancelamento");
  return data ?? [];
}

export const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export type DadosPonto = { registros: Registro[]; ausencias: Ausencia[]; ferias: FeriasAprovada[]; ajustes: Tables<"dp_banco_ajustes">[]; correcoes: Tables<"dp_ponto_correcoes">[] };

/** Batidas, ausências, férias, ajustes e correções a partir de uma data (a RLS limita ao que a pessoa pode ver). */
export async function carregarPonto(supabase: Supabase, desde: string, colaboradorId?: string): Promise<DadosPonto> {
  let registros = supabase.from("dp_ponto_registros").select("*").gte("data", desde).order("horario").limit(20000);
  let ausencias = supabase.from("dp_ausencias").select("*").gte("data_fim", desde).order("data_inicio", { ascending: false }).limit(2000);
  let ajustes = supabase.from("dp_banco_ajustes").select("*").order("criado_em", { ascending: false }).limit(2000);
  let correcoes = supabase.from("dp_ponto_correcoes").select("*").order("criado_em", { ascending: false }).limit(500);
  if (colaboradorId) {
    registros = registros.eq("colaborador_id", colaboradorId);
    ausencias = ausencias.eq("colaborador_id", colaboradorId);
    ajustes = ajustes.eq("colaborador_id", colaboradorId);
    correcoes = correcoes.eq("colaborador_id", colaboradorId);
  }
  const [r, a, j, c, ferias] = await Promise.all([registros, ausencias, ajustes, correcoes, feriasAprovadas(supabase)]);
  return { registros: r.data ?? [], ausencias: a.data ?? [], ajustes: j.data ?? [], correcoes: c.data ?? [], ferias };
}
