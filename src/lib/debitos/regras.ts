/**
 * Regras do Controle de Débitos da Locação (condomínio e IPTU/TLP).
 * Funções puras, sem banco: competência, geração mensal sem
 * duplicidade, agrupamento das unidades por administradora, texto do
 * e-mail e indicadores do painel.
 */

export const TIPOS_VERIFICACAO = ["condominio", "iptu_tlp"] as const;
export type TipoVerificacao = (typeof TIPOS_VERIFICACAO)[number];

export const STATUS_VERIFICACAO = ["pendente", "aguardando_administradora", "sem_debitos", "com_debitos", "nao_se_aplica"] as const;
export type StatusVerificacao = (typeof STATUS_VERIFICACAO)[number];

export const ROTULO_STATUS: Record<StatusVerificacao, string> = {
  pendente: "Pendente de verificação",
  aguardando_administradora: "Aguardando administradora",
  sem_debitos: "Sem débitos",
  com_debitos: "Com débitos",
  nao_se_aplica: "Não se aplica",
};
export const ROTULO_STATUS_CURTO: Record<StatusVerificacao, string> = {
  pendente: "Pendente",
  aguardando_administradora: "Aguardando",
  sem_debitos: "Sem débito",
  com_debitos: "Com débito",
  nao_se_aplica: "Não se aplica",
};
export const ROTULO_TIPO: Record<TipoVerificacao, string> = { condominio: "Condomínio", iptu_tlp: "IPTU/TLP" };

export const METODOS_CONSULTA = ["portal", "email", "outro"] as const;
export type MetodoConsulta = (typeof METODOS_CONSULTA)[number];
export const ROTULO_METODO: Record<MetodoConsulta, string> = {
  portal: "Consulta pelo portal",
  email: "Consulta por e-mail",
  outro: "Outro",
};
export const ROTULO_METODO_CURTO: Record<MetodoConsulta, string> = { portal: "Portal", email: "E-mail", outro: "Outro" };

export const PERIODICIDADES = [1, 2, 3, 6, 12] as const;
export const ROTULO_PERIODICIDADE: Record<number, string> = {
  1: "Todo mês",
  2: "A cada 2 meses",
  3: "A cada 3 meses",
  6: "A cada 6 meses",
  12: "Uma vez por ano (janeiro)",
};

/** Verificado = alguém conferiu e concluiu (com ou sem débito). */
export function estaVerificado(status: StatusVerificacao): boolean {
  return status === "sem_debitos" || status === "com_debitos";
}
export function estaPendente(status: StatusVerificacao): boolean {
  return status === "pendente" || status === "aguardando_administradora";
}

/** Ações rápidas nunca sobrescrevem débito identificado ou item não aplicável. */
export function podeMarcarSemDebitoEmLote(status: StatusVerificacao): boolean {
  return status !== "com_debitos" && status !== "nao_se_aplica";
}

// ---------------------------------------------------------------
// competência (sempre o dia 1º do mês, "AAAA-MM-01")
// ---------------------------------------------------------------

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function competenciaDe(dataIso: string): string {
  return `${dataIso.slice(0, 7)}-01`;
}

/** Aceita "AAAA-MM" ou "AAAA-MM-DD"; devolve "AAAA-MM-01" ou null. */
export function normalizarCompetencia(valor: unknown): string | null {
  const texto = typeof valor === "string" ? valor.trim() : "";
  const m = texto.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (!m) return null;
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12 || Number(m[1]) < 2000 || Number(m[1]) > 2100) return null;
  return `${m[1]}-${m[2]}-01`;
}

export function somarMeses(competencia: string, meses: number): string {
  const [ano, mes] = competencia.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1 + meses, 1));
  return d.toISOString().slice(0, 10);
}

/** "Outubro/2026" */
export function rotuloCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number);
  return `${MESES[mes - 1]}/${ano}`;
}
/** "OUT/2026" */
export function rotuloCompetenciaCurto(competencia: string): string {
  const [ano, mes] = competencia.split("-").map(Number);
  return `${MESES[mes - 1].slice(0, 3).toUpperCase()}/${ano}`;
}

/**
 * Com periodicidade de N meses, as conferências caem nos meses
 * 1, 1+N, 1+2N… do ano (mensal: todos; trimestral: jan, abr, jul, out).
 */
export function competenciaNaPeriodicidade(competencia: string, periodicidadeMeses: number): boolean {
  const mes = Number(competencia.split("-")[1]);
  const n = PERIODICIDADES.includes(periodicidadeMeses as (typeof PERIODICIDADES)[number]) ? periodicidadeMeses : 1;
  return (mes - 1) % n === 0;
}

// ---------------------------------------------------------------
// geração mensal sem duplicidade
// ---------------------------------------------------------------

export type ContratoParaGeracao = {
  id: string;
  imovel_id: string | null;
  possui_condominio: boolean | null;
  administradora_id: string | null;
};

export type VerificacaoNova = {
  contrato_id: string;
  imovel_id: string | null;
  tipo: TipoVerificacao;
  competencia: string;
  status: StatusVerificacao;
  administradora_id: string | null;
};

export const chaveVerificacao = (contratoId: string, tipo: string, competencia: string) => `${contratoId}|${tipo}|${competencia}`;

/**
 * O que falta criar na competência. Rodar de novo com as mesmas
 * verificações já existentes devolve lista vazia (o banco ainda tem a
 * restrição única contrato + tipo + competência como segunda trava).
 */
export function planejarGeracao(
  contratosAtivos: ContratoParaGeracao[],
  competencia: string,
  existentes: Set<string>,
  opcoes: { periodicidadeCondominio: number; periodicidadeIptu: number; ignorarPeriodicidade?: boolean }
): VerificacaoNova[] {
  const novas: VerificacaoNova[] = [];
  const gerar: Record<TipoVerificacao, boolean> = {
    condominio: opcoes.ignorarPeriodicidade || competenciaNaPeriodicidade(competencia, opcoes.periodicidadeCondominio),
    iptu_tlp: opcoes.ignorarPeriodicidade || competenciaNaPeriodicidade(competencia, opcoes.periodicidadeIptu),
  };
  const vistos = new Set<string>();
  for (const c of contratosAtivos) {
    for (const tipo of TIPOS_VERIFICACAO) {
      if (!gerar[tipo]) continue;
      const chave = chaveVerificacao(c.id, tipo, competencia);
      if (existentes.has(chave) || vistos.has(chave)) continue;
      vistos.add(chave);
      novas.push({
        contrato_id: c.id,
        imovel_id: c.imovel_id,
        tipo,
        competencia,
        // imóvel marcado como "não possui condomínio" já nasce resolvido
        status: tipo === "condominio" && c.possui_condominio === false ? "nao_se_aplica" : "pendente",
        administradora_id: tipo === "condominio" ? c.administradora_id : null,
      });
    }
  }
  return novas;
}

// ---------------------------------------------------------------
// e-mail de solicitação, agrupado por administradora
// ---------------------------------------------------------------

export type UnidadeSolicitacao = {
  verificacaoId: string;
  contratoId: string;
  imovel: string;
  condominioNome: string | null;
  bloco: string | null;
  unidade: string | null;
  codigoUnidade: string | null;
  administradoraId: string | null;
  administradoraNome: string | null;
  metodo: MetodoConsulta | null;
  emailAdministradora: string | null;
  /** e-mail específico daquela unidade, se houver */
  emailUnidade: string | null;
};

/** "Condomínio X\nBloco B, unidade 304 (código 987654)" — cai no endereço do imóvel se faltar cadastro. */
export function descreverUnidade(u: Pick<UnidadeSolicitacao, "imovel" | "condominioNome" | "bloco" | "unidade" | "codigoUnidade">): string {
  const partes: string[] = [];
  if (u.bloco?.trim()) partes.push(`Bloco ${u.bloco.trim()}`);
  if (u.unidade?.trim()) partes.push(`unidade ${u.unidade.trim()}`);
  let linha = partes.join(", ");
  if (linha) linha = linha.charAt(0).toUpperCase() + linha.slice(1);
  if (u.codigoUnidade?.trim()) linha = `${linha || "Unidade"} (código ${u.codigoUnidade.trim()})`;
  const nome = u.condominioNome?.trim();
  if (nome && linha) return `${nome}\n${linha}`;
  if (nome) return `${nome}\n${u.imovel}`;
  if (linha) return `${u.imovel}\n${linha}`;
  return u.imovel;
}

const EMAIL_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export function emailValido(valor: string | null | undefined): boolean {
  return !!valor && EMAIL_VALIDO.test(valor.trim());
}

export type GrupoSolicitacao = {
  chave: string;
  administradoraId: string;
  administradoraNome: string;
  destinatario: string;
  unidades: UnidadeSolicitacao[];
};

/**
 * Um e-mail por administradora, com todas as unidades. Unidade com
 * e-mail específico vai em mensagem própria para aquele endereço.
 * Devolve também o que ficou de fora e por quê.
 */
export function agruparPorAdministradora(
  unidades: UnidadeSolicitacao[],
  opcoes: { somenteMetodoEmail: boolean }
): { grupos: GrupoSolicitacao[]; semEnvio: { unidade: UnidadeSolicitacao; motivo: string }[] } {
  const mapa = new Map<string, GrupoSolicitacao>();
  const semEnvio: { unidade: UnidadeSolicitacao; motivo: string }[] = [];
  for (const u of unidades) {
    if (!u.administradoraId) {
      semEnvio.push({ unidade: u, motivo: "sem administradora vinculada" });
      continue;
    }
    if (opcoes.somenteMetodoEmail && u.metodo !== "email") {
      semEnvio.push({ unidade: u, motivo: "administradora não é consultada por e-mail" });
      continue;
    }
    const destinatario = emailValido(u.emailUnidade) ? u.emailUnidade!.trim().toLowerCase() : emailValido(u.emailAdministradora) ? u.emailAdministradora!.trim().toLowerCase() : null;
    if (!destinatario) {
      semEnvio.push({ unidade: u, motivo: "administradora sem e-mail cadastrado" });
      continue;
    }
    const chave = `${u.administradoraId}|${destinatario}`;
    const grupo = mapa.get(chave) ?? {
      chave,
      administradoraId: u.administradoraId,
      administradoraNome: u.administradoraNome ?? "Administradora",
      destinatario,
      unidades: [],
    };
    grupo.unidades.push(u);
    mapa.set(chave, grupo);
  }
  const grupos = [...mapa.values()].sort((a, b) => a.administradoraNome.localeCompare(b.administradoraNome, "pt-BR"));
  for (const g of grupos) g.unidades.sort((a, b) => descreverUnidade(a).localeCompare(descreverUnidade(b), "pt-BR"));
  return { grupos, semEnvio };
}

export const ASSUNTO_PADRAO = "Solicitação de posição de débitos condominiais";
export const MODELO_PADRAO = `Prezados,

Solicitamos, por gentileza, a posição atualizada de débitos condominiais das unidades abaixo administradas pela Sacra Imóveis:

{{unidades}}

Pedimos a gentileza de informar eventual existência de cotas vencidas, encargos ou demais débitos vinculados às unidades.

Agradecemos desde já.

Sacra Imóveis`;

export const VARIAVEIS_MODELO = ["{{unidades}}", "{{competencia}}", "{{administradora}}"] as const;

/** Lista das unidades, uma por bloco, separadas por linha em branco. */
export function listarUnidades(unidades: UnidadeSolicitacao[]): string {
  return unidades.map(descreverUnidade).join("\n\n");
}

export function montarMensagem(
  modelo: string | null | undefined,
  assunto: string | null | undefined,
  dados: { unidades: UnidadeSolicitacao[]; competencia: string; administradora: string }
): { assunto: string; texto: string } {
  const base = modelo?.trim() ? modelo : MODELO_PADRAO;
  const lista = listarUnidades(dados.unidades);
  const trocar = (texto: string) =>
    texto
      .replace(/\{\{\s*unidades\s*\}\}/gi, lista)
      .replace(/\{\{\s*competencia\s*\}\}/gi, rotuloCompetencia(dados.competencia))
      .replace(/\{\{\s*administradora\s*\}\}/gi, dados.administradora);
  // modelo sem a variável das unidades: a relação vai no fim, para nunca sair um pedido vazio
  const corpo = /\{\{\s*unidades\s*\}\}/i.test(base) ? trocar(base) : `${trocar(base).trimEnd()}\n\n${lista}`;
  return { assunto: trocar(assunto?.trim() ? assunto : ASSUNTO_PADRAO).replace(/\s+/g, " ").trim(), texto: corpo.trim() };
}

export function textoParaHtml(texto: string): string {
  const seguro = texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1c1917;white-space:pre-wrap;">${seguro}</div>`;
}

// ---------------------------------------------------------------
// acompanhamento das solicitações
// ---------------------------------------------------------------

export type SituacaoSolicitacao = "falha" | "aguardando" | "sem_resposta" | "respondido" | "conferido";
export const ROTULO_SITUACAO_SOLICITACAO: Record<SituacaoSolicitacao, string> = {
  falha: "Falha no envio",
  aguardando: "Aguardando resposta",
  sem_resposta: "Sem resposta",
  respondido: "Respondido",
  conferido: "Conferido",
};

export function situacaoSolicitacao(
  s: { status: string; enviado_em: string },
  agoraIso: string,
  diasAlerta: number
): SituacaoSolicitacao {
  if (s.status === "falha") return "falha";
  if (s.status === "respondido") return "respondido";
  if (s.status === "conferido") return "conferido";
  const dias = (new Date(agoraIso).getTime() - new Date(s.enviado_em).getTime()) / 86_400_000;
  return dias >= diasAlerta ? "sem_resposta" : "aguardando";
}

// ---------------------------------------------------------------
// painel
// ---------------------------------------------------------------

export type LinhaPainel = {
  contratoId: string;
  imovel: string;
  inquilino: string | null;
  condominioNome: string | null;
  administradoraId: string | null;
  administradoraNome: string | null;
  metodo: MetodoConsulta | null;
  condominio: { id: string; status: StatusVerificacao } | null;
  iptu: { id: string; status: StatusVerificacao } | null;
};

export type ResumoPainel = {
  imoveis: number;
  condominio: { total: number; verificados: number; pendentes: number; comDebito: number };
  iptu: { total: number; verificados: number; pendentes: number; comDebito: number };
};

export function resumirPainel(linhas: LinhaPainel[]): ResumoPainel {
  const contar = (campo: "condominio" | "iptu") => {
    const comVerificacao = linhas.map((l) => l[campo]).filter(Boolean) as { status: StatusVerificacao }[];
    const aplicaveis = comVerificacao.filter((v) => v.status !== "nao_se_aplica");
    return {
      total: aplicaveis.length,
      verificados: aplicaveis.filter((v) => estaVerificado(v.status)).length,
      pendentes: aplicaveis.filter((v) => estaPendente(v.status)).length,
      comDebito: aplicaveis.filter((v) => v.status === "com_debitos").length,
    };
  };
  return { imoveis: linhas.length, condominio: contar("condominio"), iptu: contar("iptu") };
}

export const SITUACOES_FILTRO = ["pendente", "aguardando", "verificado", "com_debito"] as const;
export type SituacaoFiltro = (typeof SITUACOES_FILTRO)[number];

export type FiltrosPainel = {
  q?: string;
  situacao?: SituacaoFiltro | null;
  tipo?: TipoVerificacao | null;
  administradoraId?: string | null;
  metodo?: MetodoConsulta | null;
};

function semAcento(texto: string | null | undefined): string {
  return (texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function bate(status: StatusVerificacao | undefined, situacao: SituacaoFiltro): boolean {
  if (!status) return false;
  if (situacao === "pendente") return status === "pendente";
  if (situacao === "aguardando") return status === "aguardando_administradora";
  if (situacao === "verificado") return estaVerificado(status);
  return status === "com_debitos";
}

export function filtrarLinhas(linhas: LinhaPainel[], f: FiltrosPainel): LinhaPainel[] {
  const q = semAcento(f.q).trim();
  return linhas.filter((l) => {
    if (q && ![l.imovel, l.inquilino, l.condominioNome, l.administradoraNome].some((campo) => semAcento(campo).includes(q))) return false;
    if (f.administradoraId === "sem" ? l.administradoraId !== null : f.administradoraId && l.administradoraId !== f.administradoraId) return false;
    if (f.metodo && l.metodo !== f.metodo) return false;
    if (f.situacao) {
      const noCondominio = bate(l.condominio?.status, f.situacao);
      const noIptu = bate(l.iptu?.status, f.situacao);
      if (f.tipo === "condominio" ? !noCondominio : f.tipo === "iptu_tlp" ? !noIptu : !noCondominio && !noIptu) return false;
    }
    return true;
  });
}

/** O que falta fazer naquele imóvel, em uma frase (coluna "Situação"). */
export function acaoNecessaria(l: LinhaPainel): { texto: string; tom: "ok" | "pendente" | "debito" } {
  const estados = [l.condominio?.status, l.iptu?.status].filter(Boolean) as StatusVerificacao[];
  if (estados.length === 0) return { texto: "Sem conferência nesta competência", tom: "pendente" };
  if (estados.includes("com_debitos")) return { texto: "Débito identificado", tom: "debito" };
  const faltas: string[] = [];
  if (l.condominio?.status === "pendente") faltas.push(l.administradoraId ? "conferir condomínio" : "vincular administradora");
  if (l.condominio?.status === "aguardando_administradora") faltas.push("aguardando administradora");
  if (l.iptu?.status === "pendente") faltas.push("conferir IPTU/TLP");
  if (faltas.length === 0) return { texto: "Tudo conferido", tom: "ok" };
  const frase = faltas.join(" · ");
  return { texto: frase.charAt(0).toUpperCase() + frase.slice(1), tom: "pendente" };
}

// ---------------------------------------------------------------
// avisos da página inicial (poucos e agrupados, para não virar ruído)
// ---------------------------------------------------------------

export type AvisoDebitos = { chave: string; texto: string; href: string; tom: "pendente" | "debito" };

export function montarAvisosDebitos(
  verificacoes: { tipo: string; status: string; competencia: string }[],
  solicitacoes: { status: string; enviado_em: string; competencia: string; administradora_id: string | null }[],
  competenciaAtual: string,
  agoraIso: string,
  diasAlerta: number
): AvisoDebitos[] {
  const avisos: AvisoDebitos[] = [];
  const doMes = verificacoes.filter((v) => v.competencia === competenciaAtual);
  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

  const condPendentes = doMes.filter((v) => v.tipo === "condominio" && v.status === "pendente").length;
  if (condPendentes) avisos.push({ chave: "cond", texto: plural(condPendentes, "condomínio aguardando conferência", "condomínios aguardando conferência"), href: "/locacao/debitos?situacao=pendente&tipo=condominio", tom: "pendente" });

  const iptuPendentes = doMes.filter((v) => v.tipo === "iptu_tlp" && v.status === "pendente").length;
  if (iptuPendentes) avisos.push({ chave: "iptu", texto: plural(iptuPendentes, "IPTU/TLP aguardando conferência", "IPTU/TLP aguardando conferência"), href: "/locacao/debitos?situacao=pendente&tipo=iptu_tlp", tom: "pendente" });

  // vale o envio mais recente de cada administradora (um reenvio zera a contagem)
  const ultimoEnvio = new Map<string, { status: string; enviado_em: string }>();
  for (const s of solicitacoes) {
    if (s.competencia !== competenciaAtual || s.status === "falha") continue;
    const chave = s.administradora_id ?? "-";
    const atual = ultimoEnvio.get(chave);
    if (!atual || s.enviado_em > atual.enviado_em) ultimoEnvio.set(chave, s);
  }
  const semResposta = [...ultimoEnvio.values()].filter((s) => situacaoSolicitacao(s, agoraIso, diasAlerta) === "sem_resposta").length;
  if (semResposta) avisos.push({ chave: "resposta", texto: plural(semResposta, "administradora sem responder", "administradoras sem responder") + ` há mais de ${diasAlerta} dias`, href: "/locacao/debitos?aba=solicitacoes", tom: "pendente" });

  const comDebito = doMes.filter((v) => v.status === "com_debitos").length;
  if (comDebito) avisos.push({ chave: "debito", texto: plural(comDebito, "unidade com débito identificado", "unidades com débito identificado"), href: "/locacao/debitos?situacao=com_debito", tom: "debito" });

  const anteriores = verificacoes.filter((v) => v.competencia < competenciaAtual && estaPendente(v.status as StatusVerificacao));
  if (anteriores.length) {
    const maisAntiga = anteriores.map((v) => v.competencia).sort()[0];
    avisos.push({ chave: "anteriores", texto: plural(anteriores.length, "conferência em aberto de mês anterior", "conferências em aberto de meses anteriores"), href: `/locacao/debitos?mes=${maisAntiga.slice(0, 7)}`, tom: "pendente" });
  }
  return avisos;
}
