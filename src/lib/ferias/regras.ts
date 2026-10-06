/**
 * Regras do módulo de Férias. Funções puras, sem banco: períodos
 * aquisitivos, saldo, datas, validação do pedido, etapas da negociação
 * (quem pode fazer o quê e para onde a solicitação vai), impacto na
 * equipe e textos das notificações.
 */

// ---------------------------------------------------------------
// datas ("AAAA-MM-DD", períodos inclusivos)
// ---------------------------------------------------------------

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
export function dataValida(iso: string | null | undefined): iso is string {
  const m = ISO.exec(iso ?? "");
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}
const dia = (iso: string) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000);
export const somarDias = (iso: string, n: number) => new Date((dia(iso) + n) * 86_400_000).toISOString().slice(0, 10);
export const diasEntre = (inicio: string, fim: string) => dia(fim) - dia(inicio) + 1;
const diaDaSemana = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 = domingo

/** Soma anos mantendo o dia (29/02 vira 28/02 em ano comum). */
export function somarAnos(iso: string, anos: number): string {
  const [a, m, d] = iso.split("-").map(Number);
  const alvo = new Date(Date.UTC(a + anos, m - 1, d));
  if (alvo.getUTCMonth() !== m - 1) alvo.setUTCDate(0);
  return alvo.toISOString().slice(0, 10);
}

export function dataBR(iso: string | null | undefined): string {
  if (!dataValida(iso)) return "—";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}
/** "05/01 a 19/01/2027" */
export function periodoBR(inicio: string, fim: string): string {
  return inicio.slice(0, 4) === fim.slice(0, 4) ? `${dataBR(inicio).slice(0, 5)} a ${dataBR(fim)}` : `${dataBR(inicio)} a ${dataBR(fim)}`;
}

/** Fim = início + dias − 1 (dias corridos); retorno = primeiro dia útil seguinte (pula sábado e domingo). */
export function calcularDatas(inicio: string, dias: number): { fim: string; retorno: string } {
  const fim = somarDias(inicio, Math.max(1, dias) - 1);
  let retorno = somarDias(fim, 1);
  while ([0, 6].includes(diaDaSemana(retorno))) retorno = somarDias(retorno, 1);
  return { fim, retorno };
}

// ---------------------------------------------------------------
// períodos aquisitivos e saldo
// ---------------------------------------------------------------

export const REGIMES = ["clt", "estagio", "pj", "outro"] as const;
export type Regime = (typeof REGIMES)[number];
export const ROTULO_REGIME: Record<Regime, string> = { clt: "CLT", estagio: "Estágio", pj: "PJ / prestador", outro: "Outro" };

export type PeriodoAquisitivo = {
  /** identifica o período (data de início) */
  inicio: string;
  fim: string;
  /** já completou os 12 meses */
  adquirido: boolean;
  /** último dia para tirar as férias deste período (12 meses depois de adquirido) */
  limite: string;
  rotulo: string;
};

export function periodosAquisitivos(admissao: string | null, hoje: string): PeriodoAquisitivo[] {
  if (!dataValida(admissao) || admissao > hoje) return [];
  const lista: PeriodoAquisitivo[] = [];
  for (let n = 0; n < 60; n++) {
    const inicio = somarAnos(admissao, n);
    if (inicio > hoje) break;
    const fim = somarDias(somarAnos(admissao, n + 1), -1);
    lista.push({ inicio, fim, adquirido: fim < hoje, limite: somarDias(somarAnos(admissao, n + 2), -1), rotulo: `${dataBR(inicio)} a ${dataBR(fim)}` });
  }
  return lista;
}

export const STATUS = ["rascunho", "aguardando_analise", "aguardando_colaborador", "aguardando_gestor", "aprovado", "recusado", "cancelado"] as const;
export type Status = (typeof STATUS)[number];
export const TIPOS = ["ferias", "alteracao", "cancelamento"] as const;
export type Tipo = (typeof TIPOS)[number];

export type SolicitacaoSaldo = { id: string; tipo: string; status: string; periodo_aquisitivo_inicio: string; dias: number; abono_dias: number };
export type Ajuste = { periodo_inicio: string; dias: number };

export const emAndamento = (s: string) => s === "aguardando_analise" || s === "aguardando_colaborador" || s === "aguardando_gestor";
const consomeSaldo = (s: SolicitacaoSaldo) => s.tipo !== "cancelamento";

export type SaldoPeriodo = PeriodoAquisitivo & {
  direito: number;
  /** aprovados (férias + abono) + ajustes */
  utilizados: number;
  /** pedidos ainda em análise/negociação */
  emAnalise: number;
  disponivel: number;
};

export function calcularSaldos(periodos: PeriodoAquisitivo[], diasPorPeriodo: number, solicitacoes: SolicitacaoSaldo[], ajustes: Ajuste[], ignorarId?: string | null): SaldoPeriodo[] {
  return periodos.map((p) => {
    const doPeriodo = solicitacoes.filter((s) => s.periodo_aquisitivo_inicio === p.inicio && s.id !== ignorarId && consomeSaldo(s));
    const aprovados = doPeriodo.filter((s) => s.status === "aprovado").reduce((t, s) => t + s.dias + s.abono_dias, 0);
    const emAnalise = doPeriodo.filter((s) => emAndamento(s.status)).reduce((t, s) => t + s.dias + s.abono_dias, 0);
    const ajustados = ajustes.filter((a) => a.periodo_inicio === p.inicio).reduce((t, a) => t + a.dias, 0);
    const utilizados = aprovados + ajustados;
    return { ...p, direito: diasPorPeriodo, utilizados, emAnalise, disponivel: Math.max(0, diasPorPeriodo - utilizados - emAnalise) };
  });
}

// ---------------------------------------------------------------
// validação do pedido
// ---------------------------------------------------------------

export type Pedido = { periodoInicio: string; dataInicio: string; dias: number; abonoDias: number; adiantamento13: boolean };

export const abonoPermitido = (regime: Regime) => regime === "clt";
export const abonoMaximo = (diasPorPeriodo: number) => Math.floor(diasPorPeriodo / 3);
/** 13º adiantado nas férias: CLT, com férias começando entre fevereiro e novembro. */
export function adiantamento13Aplicavel(regime: Regime, dataInicio: string | null): boolean {
  if (regime !== "clt" || !dataValida(dataInicio)) return false;
  const mes = +dataInicio.slice(5, 7);
  return mes >= 2 && mes <= 11;
}

export function validarPedido(p: Pedido, ctx: { hoje: string; regime: Regime; saldos: SaldoPeriodo[]; diasPorPeriodo: number; antecedenciaDias?: number }): { erros: string[]; avisos: string[]; saldoApos: number | null } {
  const erros: string[] = [];
  const avisos: string[] = [];
  const saldo = ctx.saldos.find((s) => s.inicio === p.periodoInicio);
  if (!saldo) erros.push("Escolha o período aquisitivo.");
  if (!dataValida(p.dataInicio)) erros.push("Informe a data de início.");
  else if (p.dataInicio <= ctx.hoje) erros.push("A data de início precisa ser futura.");
  if (!Number.isInteger(p.dias) || p.dias < 1) erros.push("Informe a quantidade de dias.");
  if (p.abonoDias < 0 || !Number.isInteger(p.abonoDias)) erros.push("Quantidade de dias vendidos inválida.");
  if (p.abonoDias > 0 && !abonoPermitido(ctx.regime)) erros.push("A venda de dias (abono) só está disponível para contrato CLT.");
  if (p.abonoDias > abonoMaximo(ctx.diasPorPeriodo)) erros.push(`É possível vender no máximo ${abonoMaximo(ctx.diasPorPeriodo)} dias.`);
  if (p.adiantamento13 && !adiantamento13Aplicavel(ctx.regime, p.dataInicio)) erros.push("O adiantamento do 13º só se aplica a férias iniciadas entre fevereiro e novembro (CLT).");

  let saldoApos: number | null = null;
  if (saldo) {
    if (!saldo.adquirido) erros.push("Este período aquisitivo ainda não foi completado.");
    const total = (Number.isInteger(p.dias) ? p.dias : 0) + Math.max(0, p.abonoDias);
    saldoApos = saldo.disponivel - total;
    if (saldoApos < 0) erros.push(`Saldo insuficiente: ${saldo.disponivel} dia(s) disponíveis e ${total} solicitados.`);
    if (dataValida(p.dataInicio) && p.dataInicio > saldo.limite) avisos.push(`O prazo para tirar as férias deste período terminou em ${dataBR(saldo.limite)}.`);
    else if (dataValida(p.dataInicio) && Number.isInteger(p.dias) && p.dias > 0 && calcularDatas(p.dataInicio, p.dias).fim > saldo.limite) avisos.push(`Parte das férias passa do prazo deste período (${dataBR(saldo.limite)}).`);
  }
  if (ctx.regime === "clt" && erros.length === 0) {
    if (p.dias < 5) avisos.push("Pela CLT, nenhum período de férias pode ter menos de 5 dias corridos.");
    if (saldo && p.dias < 14 && saldo.disponivel === ctx.diasPorPeriodo) avisos.push("Pela CLT, um dos períodos de férias precisa ter pelo menos 14 dias corridos.");
    if ([5, 6, 0].includes(diaDaSemana(p.dataInicio))) avisos.push("Pela CLT, as férias não devem começar nos dois dias antes do descanso semanal (sexta, sábado ou domingo).");
  }
  const antecedencia = ctx.antecedenciaDias ?? 30;
  if (erros.length === 0 && antecedencia > 0 && diasEntre(ctx.hoje, p.dataInicio) <= antecedencia) avisos.push(`Faltam menos de ${antecedencia} dias para o início — o combinado é pedir com ${antecedencia} dias de antecedência.`);
  return { erros, avisos, saldoApos };
}

// ---------------------------------------------------------------
// etapas da negociação
// ---------------------------------------------------------------

export type Papel = "colaborador" | "gestor" | "administrador";
export const ACOES = ["aprovar", "recusar", "propor", "aceitar_proposta", "recusar_proposta", "contrapropor", "cancelar"] as const;
export type Acao = (typeof ACOES)[number];

/** Papel de quem está agindo nesta solicitação (o dono nunca decide o próprio pedido). */
export function papelNaSolicitacao(s: { usuario_id: string; gestor_id: string | null }, usuarioId: string, ehAdministrador: boolean): Papel | null {
  if (s.usuario_id === usuarioId) return "colaborador";
  if (s.gestor_id === usuarioId) return "gestor";
  // sem gestor definido, quem analisa é a diretoria/gerência
  if (ehAdministrador) return s.gestor_id ? "administrador" : "gestor";
  return null;
}

const TRANSICOES: Record<Acao, { papeis: Papel[]; de: Status[]; para: Status }> = {
  aprovar: { papeis: ["gestor", "administrador"], de: ["aguardando_analise", "aguardando_gestor"], para: "aprovado" },
  recusar: { papeis: ["gestor", "administrador"], de: ["aguardando_analise", "aguardando_gestor"], para: "recusado" },
  propor: { papeis: ["gestor", "administrador"], de: ["aguardando_analise", "aguardando_gestor"], para: "aguardando_colaborador" },
  aceitar_proposta: { papeis: ["colaborador"], de: ["aguardando_colaborador"], para: "aprovado" },
  recusar_proposta: { papeis: ["colaborador"], de: ["aguardando_colaborador"], para: "aguardando_gestor" },
  contrapropor: { papeis: ["colaborador"], de: ["aguardando_colaborador"], para: "aguardando_gestor" },
  cancelar: { papeis: ["colaborador", "administrador"], de: ["rascunho", "aguardando_analise", "aguardando_colaborador", "aguardando_gestor"], para: "cancelado" },
};

/** Para onde a solicitação vai, ou por que a ação não é permitida. */
export function transicao(status: Status, acao: Acao, papel: Papel | null): { ok: true; para: Status } | { ok: false; erro: string } {
  const t = TRANSICOES[acao];
  if (!papel) return { ok: false, erro: "Você não participa desta solicitação." };
  // o administrador pode intervir também enquanto a resposta é do colaborador
  const de = papel === "administrador" && (acao === "aprovar" || acao === "recusar") ? [...t.de, "aguardando_colaborador" as Status] : t.de;
  if (!t.papeis.includes(papel)) return { ok: false, erro: papel === "colaborador" ? "Esta decisão cabe ao gestor." : "Esta resposta cabe ao colaborador." };
  if (!de.includes(status)) return { ok: false, erro: "A solicitação já mudou de etapa. Atualize a página." };
  return { ok: true, para: t.para };
}

export function acoesPossiveis(status: Status, papel: Papel | null): Acao[] {
  return ACOES.filter((a) => transicao(status, a, papel).ok);
}

/** Quem precisa responder agora. */
export function aguardandoQuem(status: Status): "gestor" | "colaborador" | null {
  if (status === "aguardando_analise" || status === "aguardando_gestor") return "gestor";
  if (status === "aguardando_colaborador" || status === "rascunho") return "colaborador";
  return null;
}

export const SITUACOES = ["rascunho", "aguardando_analise", "aguardando_colaborador", "aguardando_gestor", "programado", "em_ferias", "concluido", "aprovado", "recusado", "cancelado"] as const;
export type Situacao = (typeof SITUACOES)[number];
export const ROTULO_SITUACAO: Record<Situacao, string> = {
  rascunho: "Rascunho",
  aguardando_analise: "Aguardando análise",
  aguardando_colaborador: "Aguardando resposta do colaborador",
  aguardando_gestor: "Aguardando resposta do gestor",
  programado: "Programado",
  em_ferias: "Em férias",
  concluido: "Concluído",
  aprovado: "Aprovado",
  recusado: "Recusado",
  cancelado: "Cancelado",
};

/** Situação mostrada na tela: aprovado vira Programado / Em férias / Concluído conforme a data. */
export function situacao(s: { status: string; tipo: string; data_inicio: string; data_fim: string }, hoje: string): Situacao {
  if (s.status !== "aprovado") return s.status as Situacao;
  if (s.tipo === "cancelamento") return "aprovado";
  if (hoje < s.data_inicio) return "programado";
  if (hoje <= s.data_fim) return "em_ferias";
  return "concluido";
}

/** Frase simples para quem está olhando ("Aguardando você", "Aguardando o gestor"…). */
export function fraseSituacao(sit: Situacao, souDono: boolean): string {
  if (sit === "aguardando_analise" || sit === "aguardando_gestor") return souDono ? "Aguardando o gestor" : "Aguardando sua análise";
  if (sit === "aguardando_colaborador") return souDono ? "Aguardando sua resposta" : "Aguardando o colaborador";
  return ROTULO_SITUACAO[sit];
}

export const GRUPOS_GESTOR = ["pendentes", "negociacao", "aprovadas", "recusadas"] as const;
export type GrupoGestor = (typeof GRUPOS_GESTOR)[number];
export const ROTULO_GRUPO: Record<GrupoGestor, string> = { pendentes: "Pendentes", negociacao: "Em negociação", aprovadas: "Aprovadas", recusadas: "Recusadas" };
export function grupoDoGestor(status: string): GrupoGestor | null {
  if (status === "aguardando_analise" || status === "aguardando_gestor") return "pendentes";
  if (status === "aguardando_colaborador") return "negociacao";
  if (status === "aprovado") return "aprovadas";
  if (status === "recusado" || status === "cancelado") return "recusadas";
  return null;
}

/** Férias aprovadas podem ser alteradas/canceladas só antes de começar, e por nova solicitação. */
export function podePedirAlteracao(s: { status: string; tipo: string; data_inicio: string }, hoje: string): boolean {
  return s.status === "aprovado" && s.tipo !== "cancelamento" && hoje < s.data_inicio;
}

export const ROTULO_ACAO_EVENTO: Record<string, string> = {
  solicitou: "solicitou",
  solicitou_alteracao: "pediu alteração das férias",
  solicitou_cancelamento: "pediu o cancelamento das férias",
  propor: "propôs alteração",
  contrapropor: "fez contraproposta",
  aceitar_proposta: "aceitou a nova data",
  recusar_proposta: "não aceitou a proposta",
  aprovar: "aprovou",
  recusar: "recusou",
  cancelar: "cancelou a solicitação",
  substituida: "programação substituída",
  cancelada_por_pedido: "férias canceladas",
};

// ---------------------------------------------------------------
// impacto na equipe
// ---------------------------------------------------------------

export type Ausencia = { usuarioId: string; nome: string; inicio: string; fim: string; tipo: "ferias" | "afastamento" };

const sobrepoe = (a1: string, a2: string, b1: string, b2: string) => a1 <= b2 && b1 <= a2;

export function impactoEquipe(
  periodo: { inicio: string; fim: string },
  solicitanteId: string,
  equipe: { id: string; nome: string }[],
  ausencias: Ausencia[]
): { emFerias: Ausencia[]; afastados: Ausencia[]; disponiveis: number; totalEquipe: number } {
  const outros = equipe.filter((p) => p.id !== solicitanteId);
  const ids = new Set(outros.map((p) => p.id));
  const noPeriodo = ausencias.filter((a) => ids.has(a.usuarioId) && sobrepoe(a.inicio, a.fim, periodo.inicio, periodo.fim));
  const ausentes = new Set(noPeriodo.map((a) => a.usuarioId));
  return {
    emFerias: noPeriodo.filter((a) => a.tipo === "ferias"),
    afastados: noPeriodo.filter((a) => a.tipo === "afastamento"),
    disponiveis: outros.length - ausentes.size,
    totalEquipe: outros.length,
  };
}

// ---------------------------------------------------------------
// notificações internas (o mesmo texto servirá ao e-mail no futuro)
// ---------------------------------------------------------------

export type NotificacaoFerias = { para: "colaborador" | "gestor"; tipo: string; titulo: string; mensagem: string };

export function notificacoesDaAcao(acao: string, d: { colaborador: string; periodo: string; dias: number; motivo?: string | null }): NotificacaoFerias[] {
  const quando = `${d.periodo} (${d.dias} dia${d.dias === 1 ? "" : "s"})`;
  switch (acao) {
    case "solicitou":
      return [
        { para: "colaborador", tipo: "solicitacao_enviada", titulo: "Solicitação de férias enviada", mensagem: `Seu pedido para ${quando} foi enviado e aguarda análise.` },
        { para: "gestor", tipo: "nova_solicitacao", titulo: "Nova solicitação de férias", mensagem: `${d.colaborador} pediu férias de ${quando}.` },
      ];
    case "solicitou_alteracao":
      return [{ para: "gestor", tipo: "nova_solicitacao", titulo: "Pedido de alteração de férias", mensagem: `${d.colaborador} pediu para alterar as férias para ${quando}.` }];
    case "solicitou_cancelamento":
      return [{ para: "gestor", tipo: "nova_solicitacao", titulo: "Pedido de cancelamento de férias", mensagem: `${d.colaborador} pediu para cancelar as férias de ${quando}.` }];
    case "aprovar":
      return [{ para: "colaborador", tipo: "aprovada", titulo: "Férias aprovadas", mensagem: `Aprovado: ${quando}.` }];
    case "recusar":
      return [{ para: "colaborador", tipo: "recusada", titulo: "Solicitação de férias recusada", mensagem: d.motivo ? `Motivo: ${d.motivo}` : `O pedido para ${quando} foi recusado.` }];
    case "propor":
      return [{ para: "colaborador", tipo: "proposta", titulo: "O gestor propôs uma nova data", mensagem: `Nova proposta: ${quando}. Responda para concluir.` }];
    case "aceitar_proposta":
      return [{ para: "gestor", tipo: "resposta_proposta", titulo: "Proposta de férias aceita", mensagem: `${d.colaborador} aceitou ${quando}. Férias programadas.` }];
    case "recusar_proposta":
      return [{ para: "gestor", tipo: "resposta_proposta", titulo: "Proposta de férias não aceita", mensagem: `${d.colaborador} não aceitou a nova data e mantém o pedido de ${quando}.` }];
    case "contrapropor":
      return [{ para: "gestor", tipo: "contraproposta", titulo: "Contraproposta de férias", mensagem: `${d.colaborador} sugeriu ${quando}.` }];
    case "proximas":
      return [{ para: "colaborador", tipo: "ferias_proximas", titulo: "Suas férias estão chegando", mensagem: `Início em ${d.periodo.slice(0, 5)} — ${quando}.` }];
    default:
      return [];
  }
}
