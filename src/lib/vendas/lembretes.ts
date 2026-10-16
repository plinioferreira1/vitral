/**
 * Lembretes de Vendas (funções puras, sem banco).
 *
 * - Intermediária: avisa quando faltam 2 dias e quando falta 1 dia (ou é hoje)
 *   para a data prevista de uma etapa de intermediária ainda não concluída.
 * - Fim do contrato: avisa quando o prazo final do contrato chega a 30, 15 e
 *   7 dias. Se a rotina não rodou num dia, o marco vigente é gerado no dia
 *   seguinte (nunca se perde um aviso), e cada marco sai uma única vez por
 *   pessoa (chave única no banco).
 *
 * Recebem: a gestão (diretor/gerente ativos) e o responsável pelo processo.
 */

export const MARCOS_INTERMEDIARIA = [2, 1] as const;
export const MARCOS_CONTRATO = [30, 15, 7] as const;

const STATUS_ENCERRADOS = new Set(["concluido", "cancelado", "arquivado"]);
const ETAPA_ABERTA = new Set(["pendente", "em_andamento", "bloqueada"]);

/** Etapas da sequência que só entram quando a venda tem (não vão na linha do tempo padrão). */
export const ETAPAS_OPCIONAIS: readonly string[] = ["Pagamento de Intermediária"];

/** Nomes antigos de etapa que equivalem aos atuais do catálogo. */
export const NOMES_EQUIVALENTES: Record<string, string[]> = {
  Escritura: ["Escritura + Intermediária"],
  "Pagamento de Intermediária": ["Pagamento Intermediária"],
};

/** A etapa do processo corresponde à etapa do catálogo (considerando nomes antigos)? */
export function mesmaEtapa(nomeCatalogo: string, nomeEtapa: string): boolean {
  return nomeEtapa === nomeCatalogo || (NOMES_EQUIVALENTES[nomeCatalogo] ?? []).includes(nomeEtapa);
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Etapas que envolvem pagamento de intermediária ("Pagamento de Intermediária", e a antiga "Escritura + Intermediária"). */
export function ehEtapaIntermediaria(nome: string): boolean {
  return semAcento(nome).includes("intermediaria");
}

export function diasAte(hoje: string, data: string): number {
  return Math.round((Date.parse(`${data}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86_400_000);
}

/** Marco vigente: o menor marco que já foi alcançado (dias ≤ marco). Null se ainda não chegou ou já passou. */
export function marcoVigente(dias: number, marcos: readonly number[], incluirHoje: boolean): number | null {
  if (dias < 0 || (dias === 0 && !incluirHoje)) return null;
  const alcancados = marcos.filter((m) => dias <= m);
  return alcancados.length ? Math.min(...alcancados) : null;
}

export type ProcessoLembrete = {
  id: string;
  tenant_id: string;
  categoria: string;
  status: string;
  responsavel_id: string | null;
  numero_processo: string | null;
  endereco: string | null;
  data_final_contrato: string | null;
};

export type EtapaLembrete = { id: string; nome: string; status: string; data_prevista: string | null; processo: ProcessoLembrete };

export type LembreteNovo = {
  tenant_id: string;
  usuario_id: string;
  processo_id: string;
  etapa_id: string | null;
  tipo: "intermediaria" | "fim_contrato";
  data_referencia: string;
  marco: number;
  titulo: string;
  mensagem: string;
};

export function dataBR(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

const quando = (dias: number) => (dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias} dias`);
const identificacao = (p: ProcessoLembrete) => p.endereco?.trim() || p.numero_processo || "venda sem endereço";

function destinatarios(p: ProcessoLembrete, gestores: Map<string, string[]>): string[] {
  const ids = new Set(gestores.get(p.tenant_id) ?? []);
  if (p.responsavel_id) ids.add(p.responsavel_id);
  return [...ids];
}

const vendaAtiva = (p: ProcessoLembrete) => p.categoria === "venda" && !STATUS_ENCERRADOS.has(p.status);

export function gerarLembretes(
  hoje: string,
  etapas: EtapaLembrete[],
  processos: ProcessoLembrete[],
  gestoresPorEmpresa: Map<string, string[]>,
): LembreteNovo[] {
  const novos: LembreteNovo[] = [];

  for (const e of etapas) {
    if (!e.data_prevista || !ehEtapaIntermediaria(e.nome) || !ETAPA_ABERTA.has(e.status) || !vendaAtiva(e.processo)) continue;
    const dias = diasAte(hoje, e.data_prevista);
    const marco = marcoVigente(dias, MARCOS_INTERMEDIARIA, true);
    if (marco === null) continue;
    const titulo = `Intermediária ${quando(dias)} · ${dataBR(e.data_prevista)}`;
    const mensagem = `${identificacao(e.processo)} — "${e.nome}" prevista para ${dataBR(e.data_prevista)}. Avise o cliente sobre o pagamento.`;
    for (const usuario_id of destinatarios(e.processo, gestoresPorEmpresa)) {
      novos.push({ tenant_id: e.processo.tenant_id, usuario_id, processo_id: e.processo.id, etapa_id: e.id, tipo: "intermediaria", data_referencia: e.data_prevista, marco, titulo, mensagem });
    }
  }

  for (const p of processos) {
    if (!p.data_final_contrato || !vendaAtiva(p)) continue;
    const dias = diasAte(hoje, p.data_final_contrato);
    const marco = marcoVigente(dias, MARCOS_CONTRATO, false);
    if (marco === null) continue;
    const titulo = `Contrato termina ${quando(dias)} · ${dataBR(p.data_final_contrato)}`;
    const mensagem = `${identificacao(p)} — prazo final do contrato em ${dataBR(p.data_final_contrato)} (faltam ${dias} dias).`;
    for (const usuario_id of destinatarios(p, gestoresPorEmpresa)) {
      novos.push({ tenant_id: p.tenant_id, usuario_id, processo_id: p.id, etapa_id: null, tipo: "fim_contrato", data_referencia: p.data_final_contrato, marco, titulo, mensagem });
    }
  }

  return novos;
}

const escapar = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** E-mail diário com os lembretes de uma pessoa (intermediárias primeiro). */
export function montarEmailLembretes(nome: string, lembretes: { titulo: string; mensagem: string; tipo: string; processo_id: string }[], siteUrl: string) {
  const ordenados = [...lembretes].sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === "intermediaria" ? -1 : 1));
  const n = ordenados.length;
  const assunto = n === 1 ? `Vitral · ${ordenados[0].titulo}` : `Vitral · ${n} lembretes de vendas`;
  const itens = ordenados
    .map((l) => `<li style="margin:0 0 12px"><a href="${escapar(`${siteUrl}/processos/${l.processo_id}`)}" style="color:#7b1e24;font-weight:600">${escapar(l.titulo)}</a><br><span style="color:#44403c">${escapar(l.mensagem)}</span></li>`)
    .join("");
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1c1917"><p>Olá, ${escapar(nome.split(" ")[0] || nome)}.</p><p>Lembretes de vendas para hoje:</p><ul style="padding-left:18px">${itens}</ul><p style="color:#78716c;font-size:12px">Você recebe este aviso por ser da gestão ou responsável pelo processo.</p></div>`;
  const texto = `Olá, ${nome}.\n\nLembretes de vendas para hoje:\n\n${ordenados.map((l) => `- ${l.titulo}\n  ${l.mensagem}\n  ${siteUrl}/processos/${l.processo_id}`).join("\n\n")}`;
  return { assunto, html, texto };
}
