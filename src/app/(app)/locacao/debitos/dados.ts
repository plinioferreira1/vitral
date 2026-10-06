import { liberadoParaNivel } from "@/lib/em-finalizacao";
import { permissoesDebitos, type PermissoesDebitos } from "@/lib/debitos/permissoes";
import type { LinhaPainel, MetodoConsulta, StatusVerificacao, TipoVerificacao } from "@/lib/debitos/regras";
import { obterConfigDebitos, type ConfigDebitos } from "@/lib/debitos/rotina";
import type { Tables } from "@/lib/database.types";
import { getPermissoesUsuario } from "@/lib/permissoes";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const BUCKET_DEBITOS = "debitos-locacao";

export async function carregarPermissoes(supabase: Supabase, userId: string, nivel: string): Promise<PermissoesDebitos> {
  // tela em finalização: por enquanto só a gestão entra
  if (!liberadoParaNivel("debitos", nivel)) return { ver: false, operar: false, configurar: false };
  const { temLocacao } = await getPermissoesUsuario(supabase, userId, nivel);
  return permissoesDebitos(nivel, temLocacao);
}

export type Administradora = Tables<"condominio_administradoras">;
export type Verificacao = Tables<"debitos_verificacoes">;
export type Solicitacao = Tables<"debitos_solicitacoes"> & { itens: Tables<"debitos_solicitacao_itens">[] };

export type ContratoPainel = {
  id: string;
  numero: string;
  ativo: boolean;
  imovel_id: string | null;
  possui_condominio: boolean | null;
  administradora_id: string | null;
  condominio_nome: string | null;
  condominio_unidade: string | null;
  condominio_bloco: string | null;
  condominio_email: string | null;
  condominio_codigo_unidade: string | null;
  condominio_observacoes: string | null;
  iptu_inscricao: string | null;
  imoveis: { endereco: string; inscricao_iptu: string | null } | null;
  locatario: { nome: string } | null;
  locador: { nome: string } | null;
};

export type DadosPainel = {
  config: ConfigDebitos;
  administradoras: Administradora[];
  contratos: ContratoPainel[];
  verificacoes: Verificacao[];
  solicitacoes: Solicitacao[];
  linhas: (LinhaPainel & { contrato: ContratoPainel; inscricao: string | null; verificacaoCondominio: Verificacao | null; verificacaoIptu: Verificacao | null })[];
};

const SELECT_CONTRATO = `id, numero, ativo, imovel_id, possui_condominio, administradora_id, condominio_nome, condominio_unidade, condominio_bloco,
  condominio_email, condominio_codigo_unidade, condominio_observacoes, iptu_inscricao,
  imoveis ( endereco, inscricao_iptu ),
  locatario:clientes!contratos_locacao_locatario_id_fkey ( nome ),
  locador:clientes!contratos_locacao_locador_id_fkey ( nome )`;

/** Tudo o que o painel de uma competência mostra. */
export async function carregarPainel(supabase: Supabase, tenantId: string, competencia: string): Promise<DadosPainel> {
  const [config, { data: administradoras }, { data: contratosRaw }, { data: verificacoes }, { data: solicitacoesRaw }] = await Promise.all([
    obterConfigDebitos(supabase, tenantId),
    supabase.from("condominio_administradoras").select("*").order("nome"),
    supabase.from("contratos_locacao").select(SELECT_CONTRATO).order("numero"),
    supabase.from("debitos_verificacoes").select("*").eq("competencia", competencia),
    supabase.from("debitos_solicitacoes").select("*, itens:debitos_solicitacao_itens ( * )").eq("competencia", competencia).order("enviado_em", { ascending: false }),
  ]);
  const todosContratos = (contratosRaw ?? []) as unknown as ContratoPainel[];
  const lista = verificacoes ?? [];
  const porContrato = new Map<string, { condominio?: Verificacao; iptu_tlp?: Verificacao }>();
  for (const v of lista) {
    const atual = porContrato.get(v.contrato_id) ?? {};
    atual[v.tipo as TipoVerificacao] = v;
    porContrato.set(v.contrato_id, atual);
  }
  const mapaAdm = new Map((administradoras ?? []).map((a) => [a.id, a]));

  // carteira da competência: contratos ativos + encerrados que tiveram conferência nela
  const contratos = todosContratos.filter((c) => c.ativo || porContrato.has(c.id));
  const linhas = contratos.map((c) => {
    const v = porContrato.get(c.id);
    // a administradora registrada na verificação preserva o histórico se o vínculo mudar depois
    const admId = v?.condominio?.administradora_id ?? c.administradora_id;
    const adm = admId ? mapaAdm.get(admId) : undefined;
    return {
      contratoId: c.id,
      imovel: c.imoveis?.endereco ?? c.numero,
      inquilino: c.locatario?.nome ?? null,
      condominioNome: c.condominio_nome,
      administradoraId: adm?.id ?? null,
      administradoraNome: adm?.nome ?? null,
      metodo: (adm?.metodo_consulta ?? null) as MetodoConsulta | null,
      condominio: v?.condominio ? { id: v.condominio.id, status: v.condominio.status as StatusVerificacao } : null,
      iptu: v?.iptu_tlp ? { id: v.iptu_tlp.id, status: v.iptu_tlp.status as StatusVerificacao } : null,
      contrato: c,
      inscricao: c.imoveis?.inscricao_iptu?.trim() || c.iptu_inscricao?.trim() || null,
      verificacaoCondominio: v?.condominio ?? null,
      verificacaoIptu: v?.iptu_tlp ?? null,
    };
  });
  linhas.sort((a, b) => a.imovel.localeCompare(b.imovel, "pt-BR", { numeric: true }));

  return {
    config,
    administradoras: administradoras ?? [],
    contratos,
    verificacoes: lista,
    solicitacoes: (solicitacoesRaw ?? []) as unknown as Solicitacao[],
    linhas,
  };
}

export type DetalheContrato = {
  itens: Tables<"debitos_itens">[];
  historico: (Verificacao & { itens: { valor: number | null }[] })[];
  eventos: Tables<"debitos_eventos">[];
};

/** Débitos lançados, histórico de competências e auditoria de um imóvel. */
export async function carregarDetalhe(supabase: Supabase, contratoId: string, verificacaoIds: string[]): Promise<DetalheContrato> {
  const [{ data: itens }, { data: historico }, { data: eventos }] = await Promise.all([
    verificacaoIds.length
      ? supabase.from("debitos_itens").select("*").in("verificacao_id", verificacaoIds).order("criado_em")
      : Promise.resolve({ data: [] as Tables<"debitos_itens">[] }),
    supabase
      .from("debitos_verificacoes")
      .select("*, itens:debitos_itens ( valor )")
      .eq("contrato_id", contratoId)
      .order("competencia", { ascending: false })
      .limit(48),
    supabase.from("debitos_eventos").select("*").eq("contrato_id", contratoId).order("criado_em", { ascending: false }).limit(30),
  ]);
  return {
    itens: itens ?? [],
    historico: (historico ?? []) as unknown as DetalheContrato["historico"],
    eventos: eventos ?? [],
  };
}
