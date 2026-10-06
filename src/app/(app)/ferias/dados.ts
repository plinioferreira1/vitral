import type { Tables } from "@/lib/database.types";
import { liberadoParaNivel } from "@/lib/em-finalizacao";
import { calcularSaldos, periodosAquisitivos, type Ausencia, type Regime, type SaldoPeriodo } from "@/lib/ferias/regras";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type Solicitacao = Tables<"ferias_solicitacoes">;
export type Cadastro = Tables<"ferias_colaboradores">;

export type AcessoFerias = {
  /** o módulo está liberado para este nível (telas em finalização) */
  liberado: boolean;
  /** diretor/gerente: acesso completo e intervenção */
  administrador: boolean;
  cadastro: Cadastro | null;
  /** tem cadastro ativo de férias (pode solicitar) */
  participa: boolean;
  /** analisa férias de alguém (gestor de equipe ou administrador) */
  analisa: boolean;
};

export async function acessoFerias(supabase: Supabase, userId: string, nivel: string): Promise<AcessoFerias> {
  const administrador = nivel === "diretor" || nivel === "gerente";
  if (!liberadoParaNivel("ferias", nivel) || !liberadoParaNivel("departamentoPessoal", nivel)) return { liberado: false, administrador, cadastro: null, participa: false, analisa: false };
  const [{ data: cadastro }, { count }] = await Promise.all([
    supabase.from("ferias_colaboradores").select("*").eq("usuario_id", userId).maybeSingle(),
    supabase.from("ferias_colaboradores").select("usuario_id", { count: "exact", head: true }).eq("gestor_id", userId),
  ]);
  return { liberado: true, administrador, cadastro, participa: !!cadastro?.participa, analisa: administrador || (count ?? 0) > 0 };
}

/** Saldo por período aquisitivo de uma pessoa. */
export function saldosDe(cadastro: Cadastro | null, solicitacoes: Solicitacao[], ajustes: Tables<"ferias_ajustes">[], hoje: string, ignorarId?: string | null): SaldoPeriodo[] {
  if (!cadastro?.participa) return [];
  const periodos = periodosAquisitivos(cadastro.data_admissao, hoje);
  return calcularSaldos(
    periodos,
    cadastro.dias_por_periodo,
    solicitacoes.filter((s) => s.usuario_id === cadastro.usuario_id),
    ajustes.filter((a) => a.usuario_id === cadastro.usuario_id),
    ignorarId
  );
}

export const saldoTotal = (saldos: SaldoPeriodo[]) => saldos.filter((s) => s.adquirido).reduce((t, s) => t + s.disponivel, 0);
export const regimeDe = (c: Cadastro | null) => (c?.regime ?? "clt") as Regime;

export type PainelEquipe = {
  pessoas: { id: string; nome: string }[];
  cadastros: Cadastro[];
  solicitacoes: Solicitacao[];
  ajustes: Tables<"ferias_ajustes">[];
  /** ausências abonadas aprovadas no Departamento Pessoal (de quem tem usuário no Vitral) */
  afastamentos: { usuario_id: string; data_inicio: string; data_fim: string; descricao: string }[];
  nomes: Map<string, string>;
};

/** Tudo o que quem analisa enxerga (a RLS limita ao próprio time; administrador vê todos). */
export async function carregarEquipe(supabase: Supabase): Promise<PainelEquipe> {
  const [{ data: usuarios }, { data: cadastros }, { data: solicitacoes }, { data: ajustes }, { data: afastamentos }] = await Promise.all([
    supabase.from("usuarios").select("id, nome, ativo").order("nome"),
    supabase.from("ferias_colaboradores").select("*"),
    supabase.from("ferias_solicitacoes").select("*").order("criado_em", { ascending: false }).limit(1000),
    supabase.from("ferias_ajustes").select("*").order("criado_em", { ascending: false }),
    supabase.from("dp_ausencias").select("tipo, data_inicio, data_fim, dp_colaboradores!inner ( usuario_id )").eq("status", "aprovada").eq("abona", true).order("data_inicio", { ascending: false }).limit(500),
  ]);
  const nomes = new Map((usuarios ?? []).map((u) => [u.id, u.nome]));
  return {
    pessoas: (usuarios ?? []).filter((u) => u.ativo).map((u) => ({ id: u.id, nome: u.nome })),
    cadastros: cadastros ?? [],
    solicitacoes: solicitacoes ?? [],
    ajustes: ajustes ?? [],
    afastamentos: ((afastamentos ?? []) as unknown as { tipo: string; data_inicio: string; data_fim: string; dp_colaboradores: { usuario_id: string | null } | null }[])
      .filter((a) => a.dp_colaboradores?.usuario_id)
      .map((a) => ({ usuario_id: a.dp_colaboradores!.usuario_id!, data_inicio: a.data_inicio, data_fim: a.data_fim, descricao: a.tipo })),
    nomes,
  };
}

/** Férias aprovadas e afastamentos, no formato usado no impacto e no calendário da equipe. */
export function ausenciasDe(e: PainelEquipe): Ausencia[] {
  return [
    ...e.solicitacoes
      .filter((s) => s.status === "aprovado" && s.tipo !== "cancelamento")
      .map((s): Ausencia => ({ usuarioId: s.usuario_id, nome: e.nomes.get(s.usuario_id) ?? "—", inicio: s.data_inicio, fim: s.data_fim, tipo: "ferias" })),
    ...e.afastamentos.map((a): Ausencia => ({ usuarioId: a.usuario_id, nome: e.nomes.get(a.usuario_id) ?? "—", inicio: a.data_inicio, fim: a.data_fim, tipo: "afastamento" })),
  ];
}

/** Colegas considerados no impacto: mesmo departamento quando informado; senão, todos os participantes visíveis. */
export function equipeDe(e: PainelEquipe, usuarioId: string): { id: string; nome: string }[] {
  const eu = e.cadastros.find((c) => c.usuario_id === usuarioId);
  const participantes = e.cadastros.filter((c) => c.participa);
  const mesmoDepartamento = eu?.departamento ? participantes.filter((c) => c.departamento === eu.departamento) : participantes;
  return mesmoDepartamento.map((c) => ({ id: c.usuario_id, nome: e.nomes.get(c.usuario_id) ?? "—" }));
}
